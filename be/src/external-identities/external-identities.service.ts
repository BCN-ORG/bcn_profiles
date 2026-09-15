import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'crypto';
import type { ExternalProvider } from 'prisma/client/enums';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { encryptSecret, decryptSecret } from '../auth/utils/secret-crypto';
import { AuthorizationService } from '../authorization/authorization.service';
import { ExternalProviderService } from './provider.service';
import { MembershipService } from '../membership/membership.service';

type OAuthState = {
  flow: 'link' | 'login';
  provider: ExternalProvider;
  userId?: string;
  codeVerifier?: string;
};

@Injectable()
export class ExternalIdentitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly providers: ExternalProviderService,
    private readonly authorization: AuthorizationService,
    private readonly membership: MembershipService,
  ) {}

  list(userId: string) {
    return this.prisma.externalIdentity.findMany({
      where: { userId },
      select: {
        provider: true,
        providerEmail: true,
        providerUsername: true,
        providerDisplayName: true,
        providerAvatarUrl: true,
        linkedAt: true,
        lastLoginAt: true,
        lastSyncedAt: true,
      },
    });
  }

  async begin(providerName: string, flow: 'link' | 'login', userId?: string) {
    const provider = this.parseProvider(providerName);
    if (flow === 'link' && !userId) throw new UnauthorizedException();
    if (flow === 'link') {
      const existing = await this.prisma.externalIdentity.findUnique({
        where: { userId_provider: { userId: userId!, provider } },
      });
      if (existing)
        throw new ConflictException({
          code: 'IDENTITY_ALREADY_LINKED',
          message: `${provider} is already connected`,
        });
    }
    const state = randomBytes(32).toString('base64url');
    const codeVerifier =
      provider === 'ZALO' ? this.zaloCodeVerifier() : undefined;
    await this.redis.setJson(
      `oauth_state:${this.hash(state)}`,
      { flow, provider, userId, codeVerifier } satisfies OAuthState,
      10 * 60 * 1000,
    );
    return {
      authorizationUrl: this.providers.authorizationUrl(
        provider,
        state,
        codeVerifier,
      ),
    };
  }

  async callback(providerName: string, state: string, code: string) {
    const provider = this.parseProvider(providerName);
    const key = this.redis.key(`oauth_state:${this.hash(state)}`);
    const raw = await this.redis.raw.call('GETDEL', key);
    if (!raw)
      throw new UnauthorizedException({
        code: 'OAUTH_STATE_INVALID',
        message: 'OAuth state is invalid or expired',
      });
    const serialized =
      typeof raw === 'string'
        ? raw
        : Buffer.isBuffer(raw)
          ? raw.toString()
          : '';
    if (!serialized)
      throw new UnauthorizedException({
        code: 'OAUTH_STATE_INVALID',
        message: 'OAuth state is invalid or expired',
      });
    const saved = JSON.parse(serialized) as OAuthState;
    if (saved.provider !== provider)
      throw new UnauthorizedException({
        code: 'OAUTH_STATE_INVALID',
        message: 'OAuth provider mismatch',
      });
    const token = await this.providers.exchange(
      provider,
      code,
      saved.codeVerifier,
    );
    const identity = await this.providers.identity(
      provider,
      token.access_token,
    );

    if (saved.flow === 'login') {
      const linked = await this.prisma.externalIdentity.findUnique({
        where: {
          provider_providerSubject: {
            provider,
            providerSubject: identity.subject,
          },
        },
        include: { user: true },
      });
      if (!linked)
        throw new UnauthorizedException({
          code: 'IDENTITY_NOT_LINKED',
          message: 'External account is not linked to a BCN account',
        });
      if (linked.user.status !== 'ACTIVE')
        throw new ForbiddenException({
          code: 'ACCOUNT_BLOCKED',
          message: 'BCN account is not active',
        });
      await this.prisma.externalIdentity.update({
        where: { id: linked.id },
        data: {
          lastLoginAt: new Date(),
          accessTokenEncrypted: encryptSecret(token.access_token),
          refreshTokenEncrypted: token.refresh_token
            ? encryptSecret(token.refresh_token)
            : linked.refreshTokenEncrypted,
          tokenExpiresAt: token.expires_in
            ? new Date(Date.now() + token.expires_in * 1000)
            : linked.tokenExpiresAt,
        },
      });
      await this.authorization.audit(
        linked.userId,
        'LOGIN_SUCCESS',
        undefined,
        { provider },
      );
      return { flow: 'login' as const, user: linked.user };
    }

    const userId = saved.userId!;
    const owned = await this.prisma.externalIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider,
          providerSubject: identity.subject,
        },
      },
    });
    if (owned && owned.userId !== userId) {
      throw new ConflictException({
        code: 'IDENTITY_ALREADY_LINKED',
        message: 'External account belongs to another BCN account',
      });
    }
    if (owned)
      throw new ConflictException({
        code: 'IDENTITY_ALREADY_LINKED',
        message: `${provider} is already connected`,
      });
    const linked = await this.prisma.externalIdentity.create({
      data: {
        id: randomUUID(),
        userId,
        provider,
        providerSubject: identity.subject,
        providerEmail: identity.email,
        providerUsername: identity.username,
        providerDisplayName: identity.displayName,
        providerAvatarUrl: identity.avatarUrl,
        profileData: identity.profileData,
        accessTokenEncrypted: encryptSecret(token.access_token),
        refreshTokenEncrypted: token.refresh_token
          ? encryptSecret(token.refresh_token)
          : null,
        tokenExpiresAt: token.expires_in
          ? new Date(Date.now() + token.expires_in * 1000)
          : null,
        lastSyncedAt: new Date(),
      },
    });
    await this.authorization.audit(
      userId,
      `${provider}_LINKED`,
      undefined,
      undefined,
    );
    const membership =
      provider === 'DISCORD'
        ? await this.membership.verifyDiscord(
            userId,
            identity.subject,
            token.access_token,
          )
        : undefined;
    return { flow: 'link' as const, identity: linked, membership };
  }

  async unlink(userId: string, providerName: string) {
    const provider = this.parseProvider(providerName);
    const identity = await this.prisma.externalIdentity.findUnique({
      where: { userId_provider: { userId, provider } },
    });
    if (!identity) throw new NotFoundException('Connected identity not found');
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        password: true,
        _count: { select: { externalIdentities: true } },
      },
    });
    if (!user?.password && user?._count.externalIdentities === 1) {
      throw new ForbiddenException('Cannot remove the last login method');
    }
    await this.prisma.externalIdentity.delete({ where: { id: identity.id } });
    if (provider === 'DISCORD') {
      await this.membership.disconnectDiscord(userId, identity.providerSubject);
    }
    await this.authorization.audit(userId, `${provider}_UNLINKED`);
  }

  async sync(userId: string, providerName: string) {
    const provider = this.parseProvider(providerName);
    const current = await this.prisma.externalIdentity.findUnique({
      where: { userId_provider: { userId, provider } },
    });
    if (!current?.accessTokenEncrypted)
      throw new NotFoundException('Connected identity not found');
    const identity = await this.providers.identity(
      provider,
      decryptSecret(current.accessTokenEncrypted),
    );
    return this.prisma.externalIdentity.update({
      where: { id: current.id },
      data: {
        providerEmail: identity.email,
        providerUsername: identity.username,
        providerDisplayName: identity.displayName,
        providerAvatarUrl: identity.avatarUrl,
        profileData: identity.profileData,
        lastSyncedAt: new Date(),
      },
    });
  }

  parseProvider(value: string): ExternalProvider {
    const provider = value.toUpperCase();
    if (!['GOOGLE', 'GITHUB', 'DISCORD', 'ZALO'].includes(provider)) {
      throw new NotFoundException('OAuth provider is not supported');
    }
    return provider as ExternalProvider;
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('base64url');
  }

  private zaloCodeVerifier(): string {
    const alphabet =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from(randomBytes(43), (byte) => alphabet[byte % 62]).join('');
  }
}
