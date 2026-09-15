import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { IdentitySessionService } from '../identity/session.service';
import { AuthorizeQueryDto, RevokeDto, TokenDto } from './oauth.dto';
import { OauthService } from './oauth.service';
import { OauthTokenService } from './oauth-token.service';

@Controller()
export class OauthController {
  constructor(
    private readonly oauth: OauthService,
    private readonly sessions: IdentitySessionService,
    private readonly tokens: OauthTokenService,
  ) {}

  private issuer(): string {
    return (
      process.env.OAUTH_ISSUER?.trim() ||
      process.env.APP_URL?.trim() ||
      'http://localhost:3000/api'
    ).replace(/\/$/, '');
  }

  @Public()
  @Get('.well-known/openid-configuration')
  openIdConfiguration(@Res() response: Response) {
    const issuer = this.issuer();
    return response.json({
      issuer,
      authorization_endpoint: `${issuer}/oauth/authorize`,
      token_endpoint: `${issuer}/oauth/token`,
      revocation_endpoint: `${issuer}/oauth/revoke`,
      jwks_uri: `${issuer}/.well-known/jwks.json`,
      userinfo_endpoint: `${issuer}/me`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
    });
  }

  @Public()
  @Get('.well-known/jwks.json')
  jwks(@Res() response: Response) {
    return response.json(this.tokens.jwks());
  }

  @Public()
  @Get('oauth/authorize')
  async authorize(
    @Query() query: AuthorizeQueryDto,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const session = await this.sessions.getSso(
      request.cookies?.bcn_sso as string | undefined,
    );
    if (!session) {
      const fe = (
        process.env.FRONTEND_URL?.trim() || 'http://localhost:5173'
      ).replace(/\/$/, '');
      const returnUrl = `${request.protocol}://${request.get('host')}${request.originalUrl}`;
      const loginUrl = new URL(`${fe}/login`);
      loginUrl.searchParams.set('oauth_return', returnUrl);
      return response.redirect(302, loginUrl.toString());
    }
    const result = await this.oauth.authorize(query, session);
    const url = new URL(result.redirectUri);
    url.searchParams.set('code', result.code);
    url.searchParams.set('state', result.state);
    return response.redirect(302, url.toString());
  }

  @Public()
  @Post('oauth/token')
  @HttpCode(200)
  async exchange(@Body() dto: TokenDto, @Res() response: Response) {
    return response.json(await this.oauth.exchange(dto));
  }

  @Public()
  @Post('oauth/revoke')
  @HttpCode(200)
  async revoke(@Body() dto: RevokeDto, @Res() response: Response) {
    await this.oauth.revoke(dto.token);
    return response.status(200).send();
  }
}
