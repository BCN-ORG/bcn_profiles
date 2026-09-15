import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from '../auth/auth.service';
import { Public } from '../auth/decorators/public.decorator';
import { User } from '../auth/decorators/user.decorator';
import { IdentitySessionService } from '../identity/session.service';
import { PrismaService } from '../prisma/prisma.service';
import { ExternalIdentitiesService } from './external-identities.service';
import { LoginDto } from '../auth/dto/login.dto';
import { setSsoCookie } from '../common/cookies/sso-cookie';

type CurrentUser = { id: string };

@Controller()
export class ExternalIdentitiesController {
  constructor(
    private readonly identities: ExternalIdentitiesService,
    private readonly sessions: IdentitySessionService,
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  @Get('me/identities')
  list(@User() user: CurrentUser) {
    return this.identities.list(user.id);
  }

  @Post('me/identities/:provider/link')
  async link(
    @User() user: CurrentUser,
    @Param('provider') provider: string,
    @Req() request: Request,
  ) {
    await this.assertRecentAuthentication(user.id, request);
    return this.identities.begin(provider, 'link', user.id);
  }

  @Delete('me/identities/:provider')
  async unlink(
    @User() user: CurrentUser,
    @Param('provider') provider: string,
    @Req() request: Request,
  ) {
    await this.assertRecentAuthentication(user.id, request);
    await this.identities.unlink(user.id, provider);
    return { unlinked: true };
  }

  @Post('me/identities/:provider/sync')
  sync(@User() user: CurrentUser, @Param('provider') provider: string) {
    return this.identities.sync(user.id, provider);
  }

  @Public()
  @Get('auth/social/:provider')
  login(@Param('provider') provider: string) {
    return this.identities.begin(provider, 'login');
  }

  @Public()
  @Post('auth/membership/discord')
  @UseGuards(AuthGuard('local'))
  beginDiscordMembership(
    @Body() _credentials: LoginDto,
    @User() user: CurrentUser,
  ) {
    return this.identities.begin('discord', 'link', user.id);
  }

  @Public()
  @Get('auth/social/:provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Query('state') state: string,
    @Query('code') code: string,
    @Query('error') oauthError: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const frontend = this.frontendUrl(request);
    const redirectBrowser = (location: string) => {
      response.redirect(location);
    };

    if (oauthError || !state || !code) {
      const reason =
        oauthError === 'access_denied' ? 'cancelled' : 'incomplete';
      if (frontend) {
        redirectBrowser(this.oauthFrontendPath(provider, reason, 'login'));
        return;
      }
      throw new UnauthorizedException({
        code: 'OAUTH_STATE_INVALID',
        message: 'OAuth callback is incomplete',
      });
    }

    try {
      const result = await this.identities.callback(provider, state, code);
      if (result.flow === 'link') {
        if (frontend) {
          redirectBrowser(this.oauthFrontendPath(provider, 'linked', 'link'));
          return;
        }
        return { identity: result.identity, membership: result.membership };
      }

      const login = await this.auth.login(result.user);
      if (!login.skipTwoFactor) {
        if (frontend) {
          const params = new URLSearchParams({
            provider: provider.toLowerCase(),
            oauth: login.requiresTwoFactorSetup ? '2fa_setup' : '2fa_verify',
          });
          const token = login.setupToken || login.verificationToken;
          if (token) params.set('token', token);
          redirectBrowser(`${frontend}/login?${params.toString()}`);
          return;
        }
        return login;
      }
      const tokens = await this.auth.generateTokensAfterTwoFactorVerification(
        result.user.id,
      );
      const production = process.env.NODE_ENV === 'production';
      response.cookie('access_token', tokens.access_token, {
        httpOnly: true,
        secure: production,
        sameSite: production ? 'none' : 'lax',
        path: '/',
        maxAge: 60 * 60 * 1000,
      });
      response.cookie('refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: production,
        sameSite: production ? 'none' : 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      if (tokens.sso_session_id) {
        setSsoCookie(response, request, tokens.sso_session_id);
      }
      if (frontend) {
        redirectBrowser(frontend);
        return;
      }
      return { user: tokens.user };
    } catch (error) {
      if (frontend) {
        const errorCode = this.oauthErrorCode(error);
        const status =
          errorCode === 'IDENTITY_NOT_LINKED'
            ? 'not_linked'
            : errorCode === 'ACCOUNT_BLOCKED'
              ? 'blocked'
              : 'failed';
        const flow: 'login' | 'link' =
          errorCode === 'IDENTITY_ALREADY_LINKED' ? 'link' : 'login';
        redirectBrowser(this.oauthFrontendPath(provider, status, flow));
        return;
      }
      throw error;
    }
  }

  private oauthErrorCode(error: unknown): string | undefined {
    if (
      !error ||
      typeof error !== 'object' ||
      !('getResponse' in error) ||
      typeof (error as { getResponse: () => unknown }).getResponse !==
        'function'
    ) {
      return undefined;
    }
    const body = (error as { getResponse: () => unknown }).getResponse() as {
      code?: string;
    };
    return body?.code;
  }

  private oauthFrontendPath(
    provider: string,
    status: string,
    flow: 'login' | 'link',
  ): string {
    const frontend = this.frontendUrl()!;
    const welcomeStep =
      provider.toLowerCase() === 'discord' ? 'discord' : 'optional';
    const useWelcome =
      flow === 'link' &&
      (status === 'linked' ||
        status === 'cancelled' ||
        status === 'incomplete' ||
        status === 'failed');
    const path = useWelcome ? `/welcome/${welcomeStep}` : '/login';
    const params = new URLSearchParams({
      provider: provider.toLowerCase(),
      oauth: status,
    });
    return `${frontend}${path}?${params.toString()}`;
  }

  private frontendUrl(request?: Request): string | undefined {
    for (const raw of [
      process.env.FRONTEND_URL?.trim(),
      process.env.APP_URL?.trim(),
    ]) {
      if (!raw) continue;
      try {
        const url = new URL(raw);
        if (['http:', 'https:'].includes(url.protocol)) return url.origin;
      } catch {
        /* ignore invalid */
      }
    }
    if (!request) return undefined;
    const host = request.get('x-forwarded-host') || request.get('host');
    if (!host) return undefined;
    const proto =
      request.get('x-forwarded-proto') || request.protocol || 'https';
    return `${proto}://${host}`;
  }

  private async assertRecentAuthentication(userId: string, request: Request) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });
    if (!user) throw new UnauthorizedException();
    if (!user.twoFactorEnabled) return;
    const session = await this.sessions.getSso(
      request.cookies?.bcn_sso as string | undefined,
    );
    const verifiedAt = session?.twoFactorVerifiedAt
      ? new Date(session.twoFactorVerifiedAt).getTime()
      : 0;
    if (
      !session ||
      session.userId !== userId ||
      session.authLevel !== 'AAL2' ||
      Date.now() - verifiedAt > 10 * 60 * 1000
    ) {
      throw new UnauthorizedException({
        code: 'STEP_UP_AUTH_REQUIRED',
        message: 'Recent two-factor authentication is required',
      });
    }
  }
}
