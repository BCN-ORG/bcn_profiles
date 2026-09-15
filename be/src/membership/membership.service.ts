import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { IdentitySessionService } from '../identity/session.service';
import { decryptSecret, encryptSecret } from '../auth/utils/secret-crypto';
import type { Prisma } from 'prisma/client/client';

export type SourceStatus = 'VERIFIED' | 'NOT_MEMBER' | 'PENDING' | 'UNKNOWN';

export type MembershipSourceState = {
  status: SourceStatus;
  checkedAt?: string;
};

export type MembershipOverrideView = {
  status: 'ALLOW' | 'DENY';
  expiresAt: string;
  reason?: string;
};

export type MembershipResult = {
  eligible: boolean;
  policy: 'ANY_TRUSTED_GROUP';
  sources: {
    discord?: MembershipSourceState;
    zalo?: MembershipSourceState;
  };
  override?: MembershipOverrideView | null;
  expiresAt: string;
};

type DiscordToken = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

@Injectable()
export class MembershipService {
  private readonly ttlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly sessions: IdentitySessionService,
    private readonly config: ConfigService,
  ) {
    this.ttlMs = Number(
      this.config.get<string>('MEMBERSHIP_TTL_MS') ?? 15 * 60 * 1000,
    );
  }

  async assertEligible(
    userId: string,
    force = false,
  ): Promise<MembershipResult> {
    const result = await this.check(userId, force);
    if (!result.eligible) {
      throw new ForbiddenException({
        code: 'MEMBERSHIP_REQUIRED',
        message:
          'You must be a verified member of a trusted BCN group (Discord or Zalo)',
      });
    }
    return result;
  }

  async check(userId: string, force = false): Promise<MembershipResult> {
    const key = `membership:user:${userId}`;
    let discord: MembershipSourceState | undefined;
    let zalo: MembershipSourceState | undefined;
    let expiresAt = new Date(Date.now() + this.ttlMs).toISOString();

    if (!force) {
      const cached = await this.redis.getJson<MembershipResult>(key);
      if (cached && new Date(cached.expiresAt).getTime() > Date.now()) {
        discord = cached.sources.discord;
        zalo = cached.sources.zalo;
        expiresAt = cached.expiresAt;
      }
    }

    if (!discord || force) {
      const checked = await this.checkDiscord(userId, force);
      discord = checked.discord;
      expiresAt = checked.expiresAt;
    }
    if (!zalo || force) {
      zalo = await this.checkZaloStub(userId);
    }

    return this.composeResult(userId, { discord, zalo }, expiresAt);
  }

  async recheck(userId: string): Promise<MembershipResult> {
    return this.check(userId, true);
  }

  async verifyDiscord(
    userId: string,
    discordUserId: string,
    accessToken: string,
  ): Promise<MembershipResult> {
    const source = await this.getDiscordSource();
    let response: Response;
    try {
      response = await fetch(
        `https://discord.com/api/v10/users/@me/guilds/${encodeURIComponent(source.externalGroupId)}/member`,
        { headers: { authorization: `Bearer ${accessToken}` } },
      );
    } catch {
      return this.failCheck(userId, discordUserId, source.id);
    }

    if (response.status === 404) {
      return this.persistDiscordAndCompose(
        userId,
        discordUserId,
        'NOT_MEMBER',
        source.id,
      );
    }
    if (!response.ok) return this.failCheck(userId, discordUserId, source.id);

    const member = (await response.json()) as Prisma.InputJsonObject;
    return this.persistDiscordAndCompose(
      userId,
      discordUserId,
      'VERIFIED',
      source.id,
      member,
    );
  }

  async status(userId: string) {
    try {
      return await this.check(userId);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        const zalo = await this.checkZaloStub(userId);
        return this.composeResult(
          userId,
          {
            discord: {
              status: 'UNKNOWN',
              checkedAt: new Date().toISOString(),
            },
            zalo,
          },
          new Date(Date.now() + this.ttlMs).toISOString(),
        );
      }
      throw error;
    }
  }

  async disconnectDiscord(userId: string, discordUserId?: string) {
    return this.persistDiscordAndCompose(
      userId,
      discordUserId,
      'NOT_MEMBER',
    );
  }

  async setOverride(
    actorId: string,
    userId: string,
    input: {
      status: 'ALLOW' | 'DENY';
      reason: string;
      expiresAt: string;
    },
  ): Promise<MembershipResult> {
    const reason = input.reason?.trim();
    if (!reason) {
      throw new BadRequestException({
        code: 'OVERRIDE_REASON_REQUIRED',
        message: 'Override reason is required',
      });
    }
    const expiresAt = new Date(input.expiresAt);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException({
        code: 'OVERRIDE_EXPIRY_INVALID',
        message: 'Override expiresAt must be a future timestamp',
      });
    }

    await this.prisma.membershipOverride.create({
      data: {
        id: randomUUID(),
        userId,
        status: input.status,
        reason,
        expiresAt,
        grantedBy: actorId,
      },
    });
    await this.audit(userId, 'MEMBERSHIP_OVERRIDE_GRANTED', {
      status: input.status,
      reason,
      expiresAt: expiresAt.toISOString(),
      grantedBy: actorId,
    });
    await this.redis.del(`membership:user:${userId}`);
    return this.check(userId, true);
  }

  private async checkDiscord(
    userId: string,
    force: boolean,
  ): Promise<{ discord: MembershipSourceState; expiresAt: string }> {
    const identity = await this.prisma.externalIdentity.findUnique({
      where: { userId_provider: { userId, provider: 'DISCORD' } },
    });
    if (!identity?.accessTokenEncrypted) {
      const result = await this.persistDiscordMembership(
        userId,
        identity?.providerSubject,
        'NOT_MEMBER',
      );
      return {
        discord: result.sources.discord!,
        expiresAt: result.expiresAt,
      };
    }

    if (!force) {
      const existing = await this.getStoredDiscord(userId);
      if (
        existing &&
        existing.expiresAt &&
        existing.expiresAt.getTime() > Date.now() &&
        (existing.status === 'VERIFIED' || existing.status === 'NOT_MEMBER')
      ) {
        return {
          discord: {
            status: existing.status,
            checkedAt: (existing.lastCheckedAt ?? existing.expiresAt).toISOString(),
          },
          expiresAt: existing.expiresAt.toISOString(),
        };
      }
    }

    const accessToken = await this.getDiscordAccessToken(identity);
    const verified = await this.verifyDiscord(
      userId,
      identity.providerSubject,
      accessToken,
    );
    return {
      discord: verified.sources.discord!,
      expiresAt: verified.expiresAt,
    };
  }

  private async checkZaloStub(userId: string): Promise<MembershipSourceState> {
    const identity = await this.prisma.externalIdentity.findUnique({
      where: { userId_provider: { userId, provider: 'ZALO' } },
      select: { id: true },
    });
    const stored = await this.prisma.userMembership.findFirst({
      where: {
        userId,
        membershipSource: { code: 'BCN_ZALO' },
      },
    });
    if (stored?.status === 'VERIFIED') {
      return {
        status: 'VERIFIED',
        checkedAt: (stored.lastCheckedAt ?? stored.verifiedAt)?.toISOString(),
      };
    }
    if (!identity) {
      return {
        status: 'UNKNOWN',
        checkedAt: new Date().toISOString(),
      };
    }
    return {
      status: stored?.status === 'UNKNOWN' ? 'UNKNOWN' : 'NOT_MEMBER',
      checkedAt: (stored?.lastCheckedAt ?? new Date()).toISOString(),
    };
  }

  private async getStoredDiscord(userId: string) {
    const source = await this.prisma.membershipSource.findUnique({
      where: { code: 'BCN_DISCORD' },
    });
    if (!source) return null;
    return this.prisma.userMembership.findUnique({
      where: {
        userId_membershipSourceId: {
          userId,
          membershipSourceId: source.id,
        },
      },
    });
  }

  private async getActiveOverride(
    userId: string,
  ): Promise<MembershipOverrideView | null> {
    const row = await this.prisma.membershipOverride.findFirst({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!row) return null;
    return {
      status: row.status,
      expiresAt: row.expiresAt.toISOString(),
      reason: row.reason,
    };
  }

  private async composeResult(
    userId: string,
    sources: MembershipResult['sources'],
    expiresAt: string,
  ): Promise<MembershipResult> {
    const override = await this.getActiveOverride(userId);
    const providerEligible =
      sources.discord?.status === 'VERIFIED' ||
      sources.zalo?.status === 'VERIFIED';

    let eligible = providerEligible;
    if (override?.status === 'DENY') eligible = false;
    else if (override?.status === 'ALLOW') eligible = true;

    const previous = await this.redis.getJson<MembershipResult>(
      `membership:user:${userId}`,
    );
    const result: MembershipResult = {
      eligible,
      policy: 'ANY_TRUSTED_GROUP',
      sources,
      override,
      expiresAt,
    };
    await this.redis.setJson(`membership:user:${userId}`, result, this.ttlMs);

    if (previous?.eligible && !eligible) {
      await this.sessions.revokeAllUserSessions(userId);
      await this.audit(userId, 'ALL_SESSIONS_REVOKED_MEMBERSHIP', {
        previousEligible: true,
        sources,
        override,
      });
    }

    return result;
  }

  private async persistDiscordAndCompose(
    userId: string,
    discordUserId: string | undefined,
    status: 'VERIFIED' | 'NOT_MEMBER',
    sourceId?: string,
    metadata?: Prisma.InputJsonValue,
  ): Promise<MembershipResult> {
    const persisted = await this.persistDiscordMembership(
      userId,
      discordUserId,
      status,
      sourceId,
      metadata,
    );
    const zalo = await this.checkZaloStub(userId);
    return this.composeResult(
      userId,
      { discord: persisted.sources.discord, zalo },
      persisted.expiresAt,
    );
  }

  private async persistDiscordMembership(
    userId: string,
    discordUserId: string | undefined,
    status: 'VERIFIED' | 'NOT_MEMBER',
    sourceId?: string,
    metadata?: Prisma.InputJsonValue,
  ): Promise<MembershipResult> {
    const source = sourceId
      ? { id: sourceId }
      : await this.getDiscordSource();
    const previous = await this.prisma.userMembership.findUnique({
      where: {
        userId_membershipSourceId: {
          userId,
          membershipSourceId: source.id,
        },
      },
    });
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.ttlMs);
    await this.prisma.userMembership.upsert({
      where: {
        userId_membershipSourceId: {
          userId,
          membershipSourceId: source.id,
        },
      },
      create: {
        id: randomUUID(),
        userId,
        membershipSourceId: source.id,
        providerSubject: discordUserId,
        status,
        verificationMethod: 'PROVIDER_API',
        verifiedAt: status === 'VERIFIED' ? now : null,
        expiresAt,
        lastCheckedAt: now,
        metadata,
      },
      update: {
        providerSubject: discordUserId,
        status,
        verifiedAt: status === 'VERIFIED' ? now : null,
        expiresAt,
        lastCheckedAt: now,
        metadata,
      },
    });

    if (previous?.status === 'VERIFIED' && status !== 'VERIFIED') {
      await this.audit(userId, 'MEMBERSHIP_LOST', {
        provider: 'DISCORD',
        oldStatus: previous.status,
        newStatus: status,
      });
    }
    await this.audit(
      userId,
      status === 'VERIFIED' ? 'MEMBERSHIP_VERIFIED' : 'MEMBERSHIP_FAILED',
      { provider: 'DISCORD', status },
    );

    return {
      eligible: status === 'VERIFIED',
      policy: 'ANY_TRUSTED_GROUP',
      sources: {
        discord: { status, checkedAt: now.toISOString() },
      },
      expiresAt: expiresAt.toISOString(),
    };
  }

  private async getDiscordSource() {
    const guildId = this.config.get<string>('DISCORD_GUILD_ID')?.trim();
    if (!guildId) {
      throw new ServiceUnavailableException({
        code: 'MEMBERSHIP_CHECK_FAILED',
        message: 'DISCORD_GUILD_ID is not configured',
      });
    }
    return this.prisma.membershipSource.upsert({
      where: { code: 'BCN_DISCORD' },
      create: {
        id: 'membership-discord-bcn',
        provider: 'DISCORD',
        code: 'BCN_DISCORD',
        name: 'BCN Discord',
        externalGroupId: guildId,
      },
      update: { externalGroupId: guildId, enabled: true },
    });
  }

  private async getDiscordAccessToken(identity: {
    id: string;
    accessTokenEncrypted: string | null;
    refreshTokenEncrypted: string | null;
    tokenExpiresAt: Date | null;
  }): Promise<string> {
    if (
      identity.accessTokenEncrypted &&
      (!identity.tokenExpiresAt ||
        identity.tokenExpiresAt.getTime() > Date.now() + 30_000)
    ) {
      return decryptSecret(identity.accessTokenEncrypted);
    }
    if (!identity.refreshTokenEncrypted) return this.checkFailed();

    const clientId = this.config.get<string>('DISCORD_CLIENT_ID')?.trim();
    const clientSecret = this.config
      .get<string>('DISCORD_CLIENT_SECRET')
      ?.trim();
    if (!clientId || !clientSecret) return this.checkFailed();
    let response: Response;
    try {
      response = await fetch('https://discord.com/api/v10/oauth2/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          refresh_token: decryptSecret(identity.refreshTokenEncrypted),
        }),
      });
    } catch {
      return this.checkFailed();
    }
    const token = (await response.json()) as DiscordToken;
    if (!response.ok || !token.access_token) return this.checkFailed();
    await this.prisma.externalIdentity.update({
      where: { id: identity.id },
      data: {
        accessTokenEncrypted: encryptSecret(token.access_token),
        refreshTokenEncrypted: token.refresh_token
          ? encryptSecret(token.refresh_token)
          : identity.refreshTokenEncrypted,
        tokenExpiresAt: token.expires_in
          ? new Date(Date.now() + token.expires_in * 1000)
          : null,
      },
    });
    return token.access_token;
  }

  private async failCheck(
    userId: string,
    subject: string,
    sourceId: string,
  ): Promise<never> {
    const now = new Date();
    await this.prisma.userMembership.upsert({
      where: {
        userId_membershipSourceId: { userId, membershipSourceId: sourceId },
      },
      create: {
        id: randomUUID(),
        userId,
        membershipSourceId: sourceId,
        providerSubject: subject,
        status: 'UNKNOWN',
        verificationMethod: 'PROVIDER_API',
        lastCheckedAt: now,
      },
      update: { status: 'UNKNOWN', lastCheckedAt: now },
    });
    await this.redis.del(`membership:user:${userId}`);
    await this.audit(userId, 'MEMBERSHIP_FAILED', {
      provider: 'DISCORD',
      status: 'UNKNOWN',
      reason: 'PROVIDER_API_ERROR',
    });
    return this.checkFailed();
  }

  private checkFailed(): never {
    throw new ServiceUnavailableException({
      code: 'MEMBERSHIP_CHECK_FAILED',
      message: 'Discord membership could not be verified',
    });
  }

  private async audit(userId: string, eventType: string, metadata: object) {
    await this.prisma.authAuditLog.create({
      data: {
        id: randomUUID(),
        userId,
        eventType,
        provider: 'DISCORD',
        metadata,
      },
    });
  }
}
