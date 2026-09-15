import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
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
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        message: 'BCN SSO login is required',
      });
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
