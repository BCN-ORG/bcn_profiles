import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Put,
  Delete,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsInt,
  Min,
} from 'class-validator';
import { load } from 'js-yaml';
import { Type } from 'class-transformer';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { User } from '../auth/decorators/user.decorator';
import { IdentitySessionService } from '../identity/session.service';
import { OauthTokenService } from '../oauth/oauth-token.service';
import { AuthorizationService } from './authorization.service';
import { ApplicationsAdminService } from './applications-admin.service';
import type { ApplicationManifest } from './applications-admin.service';
import { ManageApplication } from './manage-application.decorator';

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

type CurrentUser = { id: string; role: string };

class CreateApplicationDto {
  @IsString() code!: string;
  @IsString() name!: string;
  @IsString() clientId!: string;
  @IsOptional() @IsBoolean() require2fa?: boolean;
  @IsOptional() @IsIn(['MANUAL', 'MEMBERS']) accessMode?: 'MANUAL' | 'MEMBERS';
  @IsOptional() @IsString() redirectUri?: string;
}

class UpdateApplicationDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() clientId?: string;
  @IsOptional() @IsIn(['ACTIVE', 'DISABLED']) status?: 'ACTIVE' | 'DISABLED';
  @IsOptional() @IsBoolean() require2fa?: boolean;
  @IsOptional() @IsIn(['MANUAL', 'MEMBERS']) accessMode?: 'MANUAL' | 'MEMBERS';
}

class RedirectUriDto {
  @IsString() redirectUri!: string;
}

class RoleDto {
  @IsString() code!: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
}

class UpdateRoleDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
}

class PermissionDtoBody {
  @IsString() code!: string;
  @IsOptional() @IsString() description?: string;
}

class UpdatePermissionDto {
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() deprecated?: boolean;
}

class CreateClientSecretDto {
  @IsOptional() @IsString() label?: string;
}

class UpdateClientSecretDto {
  @IsIn(['ACTIVE', 'DISABLED']) status!: 'ACTIVE' | 'DISABLED';
}

class ManifestDto {
  @IsString() content!: string;
}

@Controller()
export class AuthorizationController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly appsAdmin: ApplicationsAdminService,
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

  @Public()
  @Post('internal/session/check')
  async sessionCheck(
    @Headers('authorization') header: string | undefined,
    @Res() response: Response,
  ) {
    const token = header?.match(/^Bearer (\S+)$/i)?.[1];
    if (!token) {
      return response.json({ active: false, reason: 'TOKEN_INVALID' });
    }
    try {
      const payload = this.tokens.validate(token);
      const session = await this.sessions.getAppSession(payload.sid);
      const active =
        Boolean(session) &&
        session!.userId === payload.sub &&
        session!.application === payload.aud;
      return response.json(
        active
          ? {
              active: true,
              sub: payload.sub,
              aud: payload.aud,
              sid: payload.sid,
            }
          : { active: false, reason: 'SESSION_REVOKED' },
      );
    } catch {
      return response.json({ active: false, reason: 'TOKEN_INVALID' });
    }
  }

  @Get('admin/applications')
  @Roles(Role.ADMIN, Role.USER)
  listApplications(@User() actor: CurrentUser) {
    return this.appsAdmin.listApplications(actor);
  }

  @Get('admin/applications/:app')
  @Roles(Role.ADMIN, Role.USER)
  @ManageApplication()
  getApplication(@Param('app') app: string) {
    return this.appsAdmin.getApplication(app);
  }

  @Post('admin/applications')
  @Roles(Role.ADMIN)
  createApplication(@Body() dto: CreateApplicationDto) {
    return this.appsAdmin.createApplication(dto);
  }

  @Post('admin/applications/:app/client-secrets')
  @Roles(Role.ADMIN)
  createClientSecret(
    @Param('app') app: string,
    @Body() dto: CreateClientSecretDto,
  ) {
    return this.appsAdmin.createClientSecret(app, dto);
  }

  @Patch('admin/applications/:app/client-secrets/:secretId')
  @Roles(Role.ADMIN)
  setClientSecretStatus(
    @Param('app') app: string,
    @Param('secretId') secretId: string,
    @Body() dto: UpdateClientSecretDto,
  ) {
    return this.appsAdmin.setClientSecretStatus(app, secretId, dto.status);
  }

  @Patch('admin/applications/:app')
  @Roles(Role.ADMIN)
  updateApplication(
    @Param('app') app: string,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.appsAdmin.updateApplication(app, dto);
  }

  @Post('admin/applications/:app/redirect-uris')
  @Roles(Role.ADMIN)
  addRedirectUri(@Param('app') app: string, @Body() dto: RedirectUriDto) {
    return this.appsAdmin.addRedirectUri(app, dto.redirectUri);
  }

  @Delete('admin/applications/:app/redirect-uris')
  @Roles(Role.ADMIN)
  removeRedirectUri(@Param('app') app: string, @Body() dto: RedirectUriDto) {
    return this.appsAdmin.removeRedirectUri(app, dto.redirectUri);
  }

  @Post('admin/applications/:app/roles')
  @Roles(Role.ADMIN)
  createRole(@Param('app') app: string, @Body() dto: RoleDto) {
    return this.appsAdmin.createRole(app, dto);
  }

  @Get('admin/applications/:app/roles')
  @Roles(Role.ADMIN, Role.USER)
  @ManageApplication()
  listApplicationRoles(@Param('app') app: string) {
    return this.appsAdmin.listRoles(app);
  }

  @Patch('admin/applications/:app/roles/:role')
  @Roles(Role.ADMIN)
  updateRole(
    @Param('app') app: string,
    @Param('role') role: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.appsAdmin.updateRole(app, role, dto);
  }

  @Delete('admin/applications/:app/roles/:role')
  @Roles(Role.ADMIN)
  deleteRole(@Param('app') app: string, @Param('role') role: string) {
    return this.appsAdmin.deleteRole(app, role);
  }

  @Post('admin/applications/:app/permissions')
  @Roles(Role.ADMIN)
  createPermission(@Param('app') app: string, @Body() dto: PermissionDtoBody) {
    return this.appsAdmin.createPermission(app, dto);
  }

  @Get('admin/applications/:app/permissions')
  @Roles(Role.ADMIN, Role.USER)
  @ManageApplication()
  listApplicationPermissions(@Param('app') app: string) {
    return this.appsAdmin.listPermissions(app);
  }

  @Patch('admin/applications/:app/permissions/:permission')
  @Roles(Role.ADMIN)
  updatePermission(
    @Param('app') app: string,
    @Param('permission') permission: string,
    @Body() dto: UpdatePermissionDto,
  ) {
    return this.appsAdmin.updatePermission(app, permission, dto);
  }

  @Delete('admin/applications/:app/permissions/:permission')
  @Roles(Role.ADMIN)
  deletePermission(
    @Param('app') app: string,
    @Param('permission') permission: string,
  ) {
    return this.appsAdmin.deletePermission(app, permission);
  }

  @Post('admin/applications/:app/roles/:role/permissions/:permission')
  @Roles(Role.ADMIN)
  grantRolePermission(
    @Param('app') app: string,
    @Param('role') role: string,
    @Param('permission') permission: string,
  ) {
    return this.appsAdmin.grantPermissionToRole(app, role, permission);
  }

  @Put('admin/applications/:app/roles/:role/permissions')
  @Roles(Role.ADMIN)
  setRolePermissions(
    @Param('app') app: string,
    @Param('role') role: string,
    @Body() dto: PermissionsDto,
  ) {
    return this.appsAdmin.setRolePermissions(app, role, dto.permissions);
  }

  @Delete('admin/applications/:app/roles/:role/permissions/:permission')
  @Roles(Role.ADMIN)
  revokeRolePermission(
    @Param('app') app: string,
    @Param('role') role: string,
    @Param('permission') permission: string,
  ) {
    return this.appsAdmin.revokePermissionFromRole(app, role, permission);
  }

  @Get('admin/applications/:app/users')
  @Roles(Role.ADMIN, Role.USER)
  @ManageApplication()
  listAppUsers(@Param('app') app: string) {
    return this.appsAdmin.listAppUsers(app);
  }

  @Get('admin/applications/:app/managers')
  @Roles(Role.ADMIN, Role.USER)
  @ManageApplication()
  listManagers(@Param('app') app: string) {
    return this.appsAdmin.listManagers(app);
  }

  @Post('admin/applications/:app/managers/:userId')
  @Roles(Role.ADMIN)
  addManager(
    @User() actor: CurrentUser,
    @Param('app') app: string,
    @Param('userId') userId: string,
  ) {
    return this.appsAdmin.addManager(actor.id, app, userId);
  }

  @Delete('admin/applications/:app/managers/:userId')
  @Roles(Role.ADMIN)
  removeManager(
    @User() actor: CurrentUser,
    @Param('app') app: string,
    @Param('userId') userId: string,
  ) {
    return this.appsAdmin.removeManager(actor.id, app, userId);
  }

  @Post('admin/applications/import')
  @Roles(Role.ADMIN)
  importManifest(@Body() dto: ManifestDto) {
    let manifest: ApplicationManifest;
    try {
      manifest = load(dto.content) as ApplicationManifest;
    } catch {
      throw new BadRequestException('Manifest YAML is invalid');
    }
    return this.appsAdmin.importManifest(manifest);
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
  @Roles(Role.ADMIN, Role.USER)
  @ManageApplication()
  grant(
    @User() actor: CurrentUser,
    @Param('userId') userId: string,
    @Param('app') app: string,
  ) {
    return this.authorization.setAccess(actor.id, userId, app, 'ACTIVE');
  }

  @Post('admin/users/:userId/applications/:app/block')
  @Roles(Role.ADMIN, Role.USER)
  @ManageApplication()
  block(
    @User() actor: CurrentUser,
    @Param('userId') userId: string,
    @Param('app') app: string,
  ) {
    return this.authorization.setAccess(actor.id, userId, app, 'BLOCKED');
  }

  @Get('admin/users/:userId/applications/:app/roles')
  @Roles(Role.ADMIN, Role.USER)
  @ManageApplication()
  listRoles(@Param('userId') userId: string, @Param('app') app: string) {
    return this.authorization.listRoles(userId, app);
  }

  @Post('admin/users/:userId/applications/:app/roles/:role')
  @Roles(Role.ADMIN, Role.USER)
  @ManageApplication()
  assignRole(
    @User() actor: CurrentUser,
    @Param('userId') userId: string,
    @Param('app') app: string,
    @Param('role') role: string,
  ) {
    return this.authorization.assignRole(actor.id, userId, app, role);
  }

  @Delete('admin/users/:userId/applications/:app/roles/:role')
  @Roles(Role.ADMIN, Role.USER)
  @ManageApplication()
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
