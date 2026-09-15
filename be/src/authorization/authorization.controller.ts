import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Delete,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { IsArray, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { User } from '../auth/decorators/user.decorator';
import { IdentitySessionService } from '../identity/session.service';
import { OauthTokenService } from '../oauth/oauth-token.service';
import { AuthorizationService } from './authorization.service';

class PermissionDto {
  @IsString() permission!: string;
}

class PermissionsDto {
  @IsArray() @IsString({ each: true }) permissions!: string[];
}

class AuditQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

type CurrentUser = { id: string };

@Controller()
export class AuthorizationController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly tokens: OauthTokenService,
    private readonly sessions: IdentitySessionService,
  ) {}

  @Public()
  @Post('internal/authz/check')
  async check(
    @Headers('authorization') header: string | undefined,
    @Body() dto: PermissionDto,
    @Res() response: Response,
  ) {
    return response.json(
      await this.checkPermissions(header, [dto.permission], 'one'),
    );
  }

  @Public()
  @Post('internal/authz/check-any')
  async checkAny(
    @Headers('authorization') header: string | undefined,
    @Body() dto: PermissionsDto,
    @Res() response: Response,
  ) {
    return response.json(
      await this.checkPermissions(header, dto.permissions, 'any'),
    );
  }

  @Public()
  @Post('internal/authz/check-all')
  async checkAll(
    @Headers('authorization') header: string | undefined,
    @Body() dto: PermissionsDto,
    @Res() response: Response,
  ) {
    return response.json(
      await this.checkPermissions(header, dto.permissions, 'all'),
    );
  }

  @Get('me/applications')
  myApplications(@User() user: CurrentUser) {
    return this.authorization.listAccess(user.id);
  }

  @Get('me/sessions')
  mySessions(@User() user: CurrentUser, @Req() request: Request) {
    return this.sessions.listUserSessions(
      user.id,
      request.cookies?.bcn_sso as string | undefined,
    );
  }

  @Post('me/sessions/revoke-others')
  revokeOthers(@User() user: CurrentUser, @Req() request: Request) {
    return this.sessions.revokeOtherUserSessions(
      user.id,
      request.cookies?.bcn_sso as string | undefined,
    );
  }

  @Post('me/sessions/:sid/revoke')
  async revokeSession(
    @User() user: CurrentUser,
    @Param('sid') sid: string,
    @Req() request: Request,
  ) {
    await this.sessions.revokeUserSession(
      user.id,
      sid,
      request.cookies?.bcn_sso as string | undefined,
    );
    return { revoked: true };
  }

  @Get('admin/audit')
  @Roles(Role.ADMIN)
  audit(@Query() query: AuditQueryDto) {
    return this.authorization.listAudit(query);
  }

  @Get('admin/users/:userId/applications')
  @Roles(Role.ADMIN)
  listAccess(@Param('userId') userId: string) {
    return this.authorization.listAccess(userId);
  }

  @Post('admin/users/:userId/applications/:app/grant')
  @Roles(Role.ADMIN)
  grant(
    @User() actor: CurrentUser,
    @Param('userId') userId: string,
    @Param('app') app: string,
  ) {
    return this.authorization.setAccess(actor.id, userId, app, 'ACTIVE');
  }

  @Post('admin/users/:userId/applications/:app/block')
  @Roles(Role.ADMIN)
  block(
    @User() actor: CurrentUser,
    @Param('userId') userId: string,
    @Param('app') app: string,
  ) {
    return this.authorization.setAccess(actor.id, userId, app, 'BLOCKED');
  }

  @Get('admin/users/:userId/applications/:app/roles')
  @Roles(Role.ADMIN)
  listRoles(@Param('userId') userId: string, @Param('app') app: string) {
    return this.authorization.listRoles(userId, app);
  }

  @Post('admin/users/:userId/applications/:app/roles/:role')
  @Roles(Role.ADMIN)
  assignRole(
    @User() actor: CurrentUser,
    @Param('userId') userId: string,
    @Param('app') app: string,
    @Param('role') role: string,
  ) {
    return this.authorization.assignRole(actor.id, userId, app, role);
  }

  @Delete('admin/users/:userId/applications/:app/roles/:role')
  @Roles(Role.ADMIN)
  removeRole(
    @User() actor: CurrentUser,
    @Param('userId') userId: string,
    @Param('app') app: string,
    @Param('role') role: string,
  ) {
    return this.authorization.removeRole(actor.id, userId, app, role);
  }

  private async checkPermissions(
    header: string | undefined,
    permissions: string[],
    mode: 'one' | 'any' | 'all',
  ) {
    const token = header?.match(/^Bearer (\S+)$/i)?.[1];
    if (!token)
      throw new UnauthorizedException({
        code: 'TOKEN_INVALID',
        message: 'Bearer token is required',
      });
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
    const context = await this.authorization.resolve(payload.sub, payload.aud);
    const allowed =
      mode === 'all'
        ? permissions.every((item) => context.permissions.includes(item))
        : permissions.some((item) => context.permissions.includes(item));
    return allowed
      ? { allowed: true }
      : { allowed: false, reason: 'PERMISSION_DENIED' };
  }
}
