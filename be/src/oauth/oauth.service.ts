import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  IdentitySessionService,
  SsoSession,
} from '../identity/session.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { OauthTokenService } from './oauth-token.service';
import { AuthorizeQueryDto, TokenDto } from './oauth.dto';
import { MembershipService } from '../membership/membership.service';

type AuthorizationCode = {
  userId: string;
  applicationId: string;
  application: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
};

@Injectable()
export class OauthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly sessions: IdentitySessionService,
    private readonly authorization: AuthorizationService,
    private readonly tokens: OauthTokenService,
    private readonly membership: MembershipService,
  ) {}

  async authorize(query: AuthorizeQueryDto, session: SsoSession) {
    const app = await this.authorization.getApplication(query.client_id);
    const redirect = await this.prisma.applicationRedirectUri.findUnique({
      where: {
        applicationId_redirectUri: {
          applicationId: app.id,
          redirectUri: query.redirect_uri,
        },
      },
    });
    if (!redirect) {
      throw new BadRequestException({
        code: 'OAUTH_REDIRECT_URI_INVALID',
        message: 'redirect_uri is not registered for this application',
      });
    }
    if (app.require2fa && session.authLevel !== 'AAL2') {
      throw new ForbiddenException({
        code: 'STEP_UP_AUTH_REQUIRED',
        message: 'This application requires two-factor authentication',
      });
    }
    await this.assertUserAndAccess(session.userId, app.id);

    const code = randomBytes(32).toString('base64url');
    const value: AuthorizationCode = {
      userId: session.userId,
      applicationId: app.id,
      application: app.code.toLowerCase(),
      clientId: app.clientId,
      redirectUri: query.redirect_uri,
      codeChallenge: query.code_challenge,
    };
    await this.redis.setJson(
      `auth_code:${this.sessions.hash(code)}`,
      value,
      120_000,
    );
    return { code, redirectUri: query.redirect_uri, state: query.state };
  }

  async exchange(dto: TokenDto) {
    if (dto.grant_type === 'refresh_token') return this.refresh(dto);
    if (!dto.code || !dto.redirect_uri || !dto.code_verifier)
      this.invalidGrant();

    const key = this.redis.key(`auth_code:${this.sessions.hash(dto.code)}`);
    const raw = await this.redis.raw.call('GETDEL', key);
    if (!raw) this.invalidGrant();
    let grant: AuthorizationCode;
    try {
      const serialized =
        typeof raw === 'string'
          ? raw
          : Buffer.isBuffer(raw)
            ? raw.toString()
            : this.invalidGrant();
      grant = JSON.parse(serialized) as AuthorizationCode;
    } catch {
      return this.invalidGrant();
    }
    if (
      grant.clientId !== dto.client_id ||
      grant.redirectUri !== dto.redirect_uri ||
      this.sessions.hash(dto.code_verifier) !== grant.codeChallenge
    )
      this.invalidGrant();

    const membership = await this.assertUserAndAccess(
      grant.userId,
      grant.applicationId,
    );
    const appSession = await this.sessions.createAppSession(
      grant.userId,
      grant.application,
      membership.sources.discord?.checkedAt ?? new Date().toISOString(),
    );
    await this.authorization.audit(
      grant.userId,
      'SESSION_CREATED',
      grant.application.toUpperCase(),
      { sid: appSession.sid },
    );
    return this.tokenResult(
      grant.userId,
      grant.application,
      appSession.sid,
      appSession.refreshToken,
    );
  }

  async revoke(token: string): Promise<void> {
    try {
      const payload = this.tokens.validate(token);
      await this.sessions.revokeAppSession(payload.sid);
      return;
    } catch {
      const sid = await this.redis.get(`refresh:${this.sessions.hash(token)}`);
      if (sid) await this.sessions.revokeAppSession(sid);
    }
  }

  private async refresh(dto: TokenDto) {
    if (!dto.refresh_token) this.invalidGrant();
    const rotated = await this.sessions.rotateRefreshToken(dto.refresh_token);
    const app = await this.authorization.getApplication(
      rotated.session.application,
    );
    if (app.clientId !== dto.client_id) {
      await this.sessions.revokeAppSession(rotated.sid);
      this.invalidGrant();
    }
    try {
      await this.assertUserAndAccess(rotated.session.userId, app.id);
    } catch (error) {
      await this.sessions.revokeAppSession(rotated.sid);
      throw error;
    }
    return this.tokenResult(
      rotated.session.userId,
      rotated.session.application,
      rotated.sid,
      rotated.refreshToken,
    );
  }

  private async assertUserAndAccess(userId: string, appId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException({
        code: 'ACCOUNT_BLOCKED',
        message: 'Account is not active',
      });
    }
    const membership = await this.membership.assertEligible(userId);
    await this.authorization.assertAccess(userId, appId);
    return membership;
  }

  private tokenResult(
    userId: string,
    app: string,
    sid: string,
    refreshToken: string,
  ) {
    return {
      access_token: this.tokens.issue(userId, app, sid),
      token_type: 'Bearer',
      expires_in: this.tokens.lifetimeSeconds,
      refresh_token: refreshToken,
    };
  }

  private invalidGrant(): never {
    throw new BadRequestException({
      code: 'invalid_grant',
      message: 'OAuth grant is invalid or expired',
    });
  }
}
