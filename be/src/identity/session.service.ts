import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { RedisService } from '../redis/redis.service';

export type AuthLevel = 'AAL1' | 'AAL2';

export type SsoSession = {
  userId: string;
  status: 'ACTIVE' | 'REVOKED';
  authLevel: AuthLevel;
  createdAt: string;
  twoFactorVerifiedAt?: string;
  expiresAt: string;
};

export type AppSession = {
  userId: string;
  application: string;
  status: 'ACTIVE' | 'REVOKED';
  refreshTokenHash: string;
  createdAt: string;
  membershipVerifiedAt?: string;
  expiresAt: string;
};

@Injectable()
export class IdentitySessionService {
  private readonly ssoTtlMs = Number(
    process.env.SSO_SESSION_TTL_MS ?? 30 * 24 * 60 * 60 * 1000,
  );
  private readonly appTtlMs = Number(
    process.env.APP_SESSION_TTL_MS ?? 30 * 24 * 60 * 60 * 1000,
  );

  constructor(private readonly redis: RedisService) {}

  async createSso(userId: string, authLevel: AuthLevel): Promise<string> {
    const sid = randomUUID();
    const now = new Date();
    const session: SsoSession = {
      userId,
      status: 'ACTIVE',
      authLevel,
      createdAt: now.toISOString(),
      ...(authLevel === 'AAL2'
        ? { twoFactorVerifiedAt: now.toISOString() }
        : {}),
      expiresAt: new Date(now.getTime() + this.ssoTtlMs).toISOString(),
    };
    const indexKey = this.redis.key(`user_sessions:${userId}`);
    await Promise.all([
      this.redis.setJson(`sso:${sid}`, session, this.ssoTtlMs),
      this.redis.raw.sadd(indexKey, sid),
      this.redis.raw.pexpire(indexKey, this.ssoTtlMs),
    ]);
    return sid;
  }

  async getSso(sid?: string): Promise<SsoSession | undefined> {
    if (!sid) return undefined;
    const session = await this.redis.getJson<SsoSession>(`sso:${sid}`);
    return session?.status === 'ACTIVE' &&
      new Date(session.expiresAt).getTime() > Date.now()
      ? session
      : undefined;
  }

  async revokeSso(sid?: string): Promise<void> {
    if (!sid) return;
    const session = await this.redis.getJson<SsoSession>(`sso:${sid}`);
    await this.redis.del(`sso:${sid}`);
    if (session) {
      await this.redis.raw.srem(
        this.redis.key(`user_sessions:${session.userId}`),
        sid,
      );
    }
  }

  async createAppSession(
    userId: string,
    application: string,
    membershipVerifiedAt?: string,
  ) {
    const sid = randomUUID();
    const refreshToken = randomBytes(48).toString('base64url');
    const refreshTokenHash = this.hash(refreshToken);
    const now = new Date();
    const session: AppSession = {
      userId,
      application,
      status: 'ACTIVE',
      refreshTokenHash,
      createdAt: now.toISOString(),
      membershipVerifiedAt,
      expiresAt: new Date(now.getTime() + this.appTtlMs).toISOString(),
    };
    await this.saveAppSession(sid, session, refreshTokenHash);
    return { sid, refreshToken, session };
  }

  async rotateRefreshToken(refreshToken: string) {
    const oldHash = this.hash(refreshToken);
    const consumedKey = this.redis.key(`refresh_used:${oldHash}`);
    const refreshKey = this.redis.key(`refresh:${oldHash}`);
    const rawSid = await this.redis.raw.call('GETDEL', refreshKey);
    const sid =
      typeof rawSid === 'string'
        ? rawSid
        : Buffer.isBuffer(rawSid)
          ? rawSid.toString()
          : null;

    if (!sid) {
      const reusedSid = await this.redis.raw.get(consumedKey);
      if (reusedSid) await this.revokeAppSession(reusedSid);
      throw new UnauthorizedException({
        code: reusedSid ? 'SESSION_REVOKED' : 'TOKEN_INVALID',
        message: reusedSid
          ? 'Refresh token reuse detected; session revoked'
          : 'Refresh token is invalid or expired',
      });
    }

    const session = await this.getAppSession(sid);
    if (!session || session.refreshTokenHash !== oldHash) {
      throw new UnauthorizedException({
        code: 'SESSION_REVOKED',
        message: 'Application session is not active',
      });
    }

    const ttl = Math.max(1, new Date(session.expiresAt).getTime() - Date.now());
    await this.redis.raw.set(consumedKey, sid, 'PX', ttl);
    const next = randomBytes(48).toString('base64url');
    session.refreshTokenHash = this.hash(next);
    await this.saveAppSession(sid, session, session.refreshTokenHash);
    return { sid, refreshToken: next, session };
  }

  async getAppSession(sid: string): Promise<AppSession | undefined> {
    const session = await this.redis.getJson<AppSession>(`app_session:${sid}`);
    return session?.status === 'ACTIVE' &&
      new Date(session.expiresAt).getTime() > Date.now()
      ? session
      : undefined;
  }

  async revokeAppSession(sid: string): Promise<void> {
    const session = await this.redis.getJson<AppSession>(`app_session:${sid}`);
    if (!session) return;
    session.status = 'REVOKED';
    const ttl = Math.max(1, new Date(session.expiresAt).getTime() - Date.now());
    const indexKey = this.redis.key(
      `user_app_sessions:${session.userId}:${session.application}`,
    );
    await Promise.all([
      this.redis.setJson(`app_session:${sid}`, session, ttl),
      this.redis.del(`refresh:${session.refreshTokenHash}`),
      this.redis.raw.srem(indexKey, sid),
      this.redis.raw.srem(
        this.redis.key(`user_app_sessions_all:${session.userId}`),
        sid,
      ),
    ]);
  }

  async revokeUserAppSessions(userId: string, app: string): Promise<void> {
    const key = this.redis.key(`user_app_sessions:${userId}:${app}`);
    const ids = await this.redis.raw.smembers(key);
    await Promise.all(ids.map((sid) => this.revokeAppSession(sid)));
    await this.redis.raw.del(key);
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    const ssoKey = this.redis.key(`user_sessions:${userId}`);
    const appKey = this.redis.key(`user_app_sessions_all:${userId}`);
    const [ssoIds, appIds] = await Promise.all([
      this.redis.raw.smembers(ssoKey),
      this.redis.raw.smembers(appKey),
    ]);
    await Promise.all([
      ...ssoIds.map((sid) => this.revokeSso(sid)),
      ...appIds.map((sid) => this.revokeAppSession(sid)),
    ]);
    await Promise.all([this.redis.raw.del(ssoKey), this.redis.raw.del(appKey)]);
  }

  async listUserSessions(userId: string, currentSsoSid?: string) {
    const ssoKey = this.redis.key(`user_sessions:${userId}`);
    const appKey = this.redis.key(`user_app_sessions_all:${userId}`);
    const [ssoIds, appIds] = await Promise.all([
      this.redis.raw.smembers(ssoKey),
      this.redis.raw.smembers(appKey),
    ]);

    const ssoSessions = (
      await Promise.all(
        ssoIds.map(async (sid) => {
          const session = await this.getSso(sid);
          if (!session) return null;
          return {
            id: sid,
            type: 'SSO' as const,
            application: null,
            authLevel: session.authLevel,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
            current: sid === currentSsoSid,
          };
        }),
      )
    ).filter((item): item is NonNullable<typeof item> => !!item);

    const appSessions = (
      await Promise.all(
        appIds.map(async (sid) => {
          const session = await this.getAppSession(sid);
          if (!session) return null;
          return {
            id: sid,
            type: 'APP' as const,
            application: session.application,
            authLevel: null,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
            current: false,
          };
        }),
      )
    ).filter((item): item is NonNullable<typeof item> => !!item);

    return [...ssoSessions, ...appSessions].sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1,
    );
  }

  async revokeUserSession(
    userId: string,
    sid: string,
    currentSsoSid?: string,
  ): Promise<void> {
    if (sid === currentSsoSid) {
      throw new UnauthorizedException({
        code: 'CURRENT_SESSION',
        message: 'Use logout to end the current SSO session',
      });
    }
    const sso = await this.redis.getJson<SsoSession>(`sso:${sid}`);
    if (sso?.userId === userId) {
      await this.revokeSso(sid);
      return;
    }
    const app = await this.redis.getJson<AppSession>(`app_session:${sid}`);
    if (app?.userId === userId) {
      await this.revokeAppSession(sid);
      return;
    }
    throw new UnauthorizedException({
      code: 'SESSION_NOT_FOUND',
      message: 'Session was not found for this user',
    });
  }

  async revokeOtherUserSessions(
    userId: string,
    currentSsoSid?: string,
  ): Promise<{ revoked: number }> {
    const sessions = await this.listUserSessions(userId, currentSsoSid);
    const targets = sessions.filter((session) => session.id !== currentSsoSid);
    await Promise.all(
      targets.map((session) =>
        session.type === 'SSO'
          ? this.revokeSso(session.id)
          : this.revokeAppSession(session.id),
      ),
    );
    return { revoked: targets.length };
  }

  hash(value: string): string {
    return createHash('sha256').update(value).digest('base64url');
  }

  private async saveAppSession(
    sid: string,
    session: AppSession,
    refreshHash: string,
  ): Promise<void> {
    const ttl = Math.max(1, new Date(session.expiresAt).getTime() - Date.now());
    const indexKey = this.redis.key(
      `user_app_sessions:${session.userId}:${session.application}`,
    );
    const allIndexKey = this.redis.key(
      `user_app_sessions_all:${session.userId}`,
    );
    await Promise.all([
      this.redis.setJson(`app_session:${sid}`, session, ttl),
      this.redis.set(`refresh:${refreshHash}`, sid, ttl),
      this.redis.raw.sadd(indexKey, sid),
      this.redis.raw.pexpire(indexKey, ttl),
      this.redis.raw.sadd(allIndexKey, sid),
      this.redis.raw.pexpire(allIndexKey, ttl),
    ]);
  }
}
