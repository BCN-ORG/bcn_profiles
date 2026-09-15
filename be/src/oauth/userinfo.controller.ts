import {
  Controller,
  Get,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { IdentitySessionService } from '../identity/session.service';
import { OauthTokenService } from './oauth-token.service';

@Controller('api')
export class UserinfoController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: OauthTokenService,
    private readonly sessions: IdentitySessionService,
  ) {}

  @Public()
  @Get('me')
  async me(@Headers('authorization') header: string | undefined) {
    const token = header?.match(/^Bearer (\S+)$/i)?.[1];
    if (!token) {
      throw new UnauthorizedException({
        code: 'TOKEN_INVALID',
        message: 'Bearer token is required',
      });
    }
    const payload = this.tokens.validate(token);
    const session = await this.sessions.getAppSession(payload.sid);
    if (
      !session ||
      session.userId !== payload.sub ||
      session.application !== payload.aud
    ) {
      throw new UnauthorizedException({
        code: 'SESSION_REVOKED',
        message: 'Session is revoked',
      });
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatar: true,
        phone: true,
        role: true,
        status: true,
      },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException({
        code: 'ACCOUNT_BLOCKED',
        message: 'Account is not active',
      });
    }
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatar,
      phone: user.phone,
      role: user.role,
      aud: payload.aud,
      sid: payload.sid,
    };
  }
}
