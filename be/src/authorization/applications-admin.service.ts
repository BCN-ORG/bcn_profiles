import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { ApplicationStatus } from 'prisma/client/enums';
import { AuthorizationService } from './authorization.service';

export type ApplicationManifest = {
  app: { code: string; name: string; clientId: string };
  auth?: { redirectUri?: string; require2FA?: boolean };
  roles?: { code: string; name?: string; description?: string }[];
  permissions?: { code: string; description?: string }[];
  rolePermissions?: Record<string, string[]>;
};

@Injectable()
export class ApplicationsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
  ) {}

  listApplications(actor: { id: string; role: string }) {
    return this.prisma.application.findMany({
      where:
        actor.role === 'ADMIN'
          ? undefined
          : { managers: { some: { userId: actor.id } } },
      include: {
        redirectUris: true,
        roles: { include: { permissions: { include: { permission: true } } } },
        permissions: true,
        managers: {
          include: {
            user: { select: { id: true, email: true, fullName: true } },
          },
        },
        _count: { select: { userAccess: true } },
      },
      orderBy: { code: 'asc' },
    });
  }

  getApplication(appCode: string) {
    return this.findApplication(appCode, {
      redirectUris: true,
      roles: { include: { permissions: { include: { permission: true } } } },
      permissions: true,
      managers: {
        include: {
          user: { select: { id: true, email: true, fullName: true } },
        },
      },
      _count: { select: { userAccess: true, userAppRoles: true } },
    });
  }

  async createApplication(body: {
    code: string;
    name: string;
    clientId: string;
    require2fa?: boolean;
    redirectUri?: string;
  }) {
    const code = body.code.trim().toUpperCase();
    const id = `app-${code.toLowerCase()}`;
    this.validateApplicationInput(body);
    const app = await this.prisma.application.create({
      data: {
        id,
        code,
        name: body.name.trim(),
        clientId: body.clientId.trim(),
        require2fa: body.require2fa ?? false,
        status: 'ACTIVE',
      },
    });
    if (body.redirectUri?.trim()) {
      await this.addRedirectUri(code, body.redirectUri.trim());
    }
    await this.authorization.audit(null, 'APP_CREATED', code, {
      clientId: app.clientId,
    });
    return this.getApplication(code);
  }

  async updateApplication(
    appCode: string,
    body: {
      name?: string;
      clientId?: string;
      status?: ApplicationStatus;
      require2fa?: boolean;
    },
  ) {
    const app = await this.findApplication(appCode);
    await this.prisma.application.update({
      where: { id: app.id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.clientId !== undefined
          ? { clientId: body.clientId.trim() }
          : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.require2fa !== undefined
          ? { require2fa: body.require2fa }
          : {}),
      },
    });
    await Promise.all([
      this.authorization.invalidateApplication(
        app.id,
        app.code,
        body.status === 'DISABLED',
      ),
      this.authorization.audit(
        null,
        body.status === 'DISABLED' ? 'APP_DISABLED' : 'APP_UPDATED',
        app.code,
        body,
      ),
    ]);
    return this.getApplication(appCode);
  }

  async addRedirectUri(appCode: string, redirectUri: string) {
    const app = await this.findApplication(appCode);
    const uri = redirectUri.trim();
    this.validateRedirectUri(uri);
    return this.prisma.applicationRedirectUri.upsert({
      where: {
        applicationId_redirectUri: {
          applicationId: app.id,
          redirectUri: uri,
        },
      },
      create: {
        id: `${app.id}-uri-${randomUUID().slice(0, 8)}`,
        applicationId: app.id,
        redirectUri: uri,
      },
      update: {},
    });
  }

  async removeRedirectUri(appCode: string, redirectUri: string) {
    const app = await this.findApplication(appCode);
    await this.prisma.applicationRedirectUri.deleteMany({
      where: { applicationId: app.id, redirectUri: redirectUri.trim() },
    });
    return { deleted: true };
  }

  async createRole(
    appCode: string,
    body: { code: string; name?: string; description?: string },
  ) {
    const app = await this.findApplication(appCode);
    const code = body.code.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9_-]*$/.test(code)) {
      throw new BadRequestException('Role code is invalid');
    }
    const role = await this.prisma.appRole.create({
      data: {
        id: `${app.id}-role-${code.toLowerCase()}`,
        applicationId: app.id,
        code,
        name: body.name?.trim() || code,
        description: body.description?.trim(),
      },
    });
    await this.authorization.audit(null, 'ROLE_CREATED', app.code, {
      role: code,
    });
    return role;
  }

  async listRoles(appCode: string) {
    const app = await this.findApplication(appCode);
    return this.prisma.appRole.findMany({
      where: { applicationId: app.id },
      include: { permissions: { include: { permission: true } } },
      orderBy: { code: 'asc' },
    });
  }

  async updateRole(
    appCode: string,
    roleCode: string,
    body: { name?: string; description?: string },
  ) {
    const { app, role } = await this.findRole(appCode, roleCode);
    const result = await this.prisma.appRole.update({
      where: { id: role.id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.description !== undefined
          ? { description: body.description.trim() }
          : {}),
      },
    });
    await this.authorization.audit(null, 'ROLE_UPDATED', app.code, {
      role: role.code,
    });
    return result;
  }

  async deleteRole(appCode: string, roleCode: string) {
    const app = await this.findApplication(appCode);
    const role = await this.prisma.appRole.findUnique({
      where: {
        applicationId_code: {
          applicationId: app.id,
          code: roleCode.toUpperCase(),
        },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem)
      throw new BadRequestException('System roles cannot be deleted');
    await this.prisma.userAppRole.deleteMany({ where: { roleId: role.id } });
    await this.prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await this.prisma.appRole.delete({ where: { id: role.id } });
    await Promise.all([
      this.authorization.invalidateApplication(app.id, app.code),
      this.authorization.audit(null, 'ROLE_DELETED', app.code, {
        role: role.code,
      }),
    ]);
    return { deleted: true };
  }

  async createPermission(
    appCode: string,
    body: { code: string; description?: string },
  ) {
    const app = await this.findApplication(appCode);
    const code = body.code.trim();
    this.validatePermissionCode(app.code, code);
    const permission = await this.prisma.permission.create({
      data: {
        id: `${app.id}-perm-${code.replace(/\./g, '-')}`,
        applicationId: app.id,
        code,
        description: body.description?.trim(),
      },
    });
    await this.authorization.audit(null, 'PERMISSION_CREATED', app.code, {
      permission: code,
    });
    return permission;
  }

  async listPermissions(appCode: string) {
    const app = await this.findApplication(appCode);
    return this.prisma.permission.findMany({
      where: { applicationId: app.id },
      orderBy: { code: 'asc' },
    });
  }

  async updatePermission(
    appCode: string,
    permissionCode: string,
    body: { description?: string; deprecated?: boolean },
  ) {
    const { app, permission } = await this.findPermission(
      appCode,
      permissionCode,
    );
    const result = await this.prisma.permission.update({
      where: { id: permission.id },
      data: body,
    });
    await Promise.all([
      this.authorization.invalidateApplication(app.id, app.code),
      this.authorization.audit(null, 'PERMISSION_UPDATED', app.code, {
        permission: permission.code,
      }),
    ]);
    return result;
  }

  async deletePermission(appCode: string, permissionCode: string) {
    const app = await this.findApplication(appCode);
    const permission = await this.prisma.permission.findUnique({
      where: {
        applicationId_code: {
          applicationId: app.id,
          code: permissionCode,
        },
      },
    });
    if (!permission) throw new NotFoundException('Permission not found');
    await this.prisma.rolePermission.deleteMany({
      where: { permissionId: permission.id },
    });
    await this.prisma.permission.delete({ where: { id: permission.id } });
    await Promise.all([
      this.authorization.invalidateApplication(app.id, app.code),
      this.authorization.audit(null, 'PERMISSION_DELETED', app.code, {
        permission: permission.code,
      }),
    ]);
    return { deleted: true };
  }

  async grantPermissionToRole(
    appCode: string,
    roleCode: string,
    permissionCode: string,
  ) {
    const app = await this.findApplication(appCode);
    const role = await this.prisma.appRole.findUnique({
      where: {
        applicationId_code: {
          applicationId: app.id,
          code: roleCode.toUpperCase(),
        },
      },
    });
    const permission = await this.prisma.permission.findUnique({
      where: {
        applicationId_code: {
          applicationId: app.id,
          code: permissionCode,
        },
      },
    });
    if (!role || !permission) {
      throw new NotFoundException('Role or permission not found');
    }
    const result = await this.prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: permission.id,
        },
      },
      create: { roleId: role.id, permissionId: permission.id },
      update: {},
    });
    await this.rolePermissionsChanged(app.id, app.code, role.code);
    return result;
  }

  async revokePermissionFromRole(
    appCode: string,
    roleCode: string,
    permissionCode: string,
  ) {
    const app = await this.findApplication(appCode);
    const role = await this.prisma.appRole.findUnique({
      where: {
        applicationId_code: {
          applicationId: app.id,
          code: roleCode.toUpperCase(),
        },
      },
    });
    const permission = await this.prisma.permission.findUnique({
      where: {
        applicationId_code: {
          applicationId: app.id,
          code: permissionCode,
        },
      },
    });
    if (!role || !permission) {
      throw new NotFoundException('Role or permission not found');
    }
    await this.prisma.rolePermission.deleteMany({
      where: { roleId: role.id, permissionId: permission.id },
    });
    await this.rolePermissionsChanged(app.id, app.code, role.code);
    return { deleted: true };
  }

  async setRolePermissions(
    appCode: string,
    roleCode: string,
    permissionCodes: string[],
  ) {
    const { app, role } = await this.findRole(appCode, roleCode);
    const unique = [...new Set(permissionCodes)];
    const permissions = await this.prisma.permission.findMany({
      where: { applicationId: app.id, code: { in: unique } },
    });
    if (permissions.length !== unique.length) {
      throw new BadRequestException(
        'One or more permissions do not belong to the application',
      );
    }
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
      ...(permissions.length
        ? [
            this.prisma.rolePermission.createMany({
              data: permissions.map((permission) => ({
                roleId: role.id,
                permissionId: permission.id,
              })),
            }),
          ]
        : []),
    ]);
    await this.rolePermissionsChanged(app.id, app.code, role.code);
    return { permissions: unique };
  }

  async listManagers(appCode: string) {
    const app = await this.findApplication(appCode);
    return this.prisma.applicationManager.findMany({
      where: { applicationId: app.id },
      include: { user: { select: { id: true, email: true, fullName: true } } },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async addManager(actorId: string, appCode: string, userId: string) {
    const app = await this.findApplication(appCode);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const manager = await this.prisma.applicationManager.upsert({
      where: { applicationId_userId: { applicationId: app.id, userId } },
      create: { applicationId: app.id, userId, assignedBy: actorId },
      update: {},
    });
    await this.authorization.audit(actorId, 'APP_MANAGER_ASSIGNED', app.code, {
      userId,
    });
    return manager;
  }

  async removeManager(actorId: string, appCode: string, userId: string) {
    const app = await this.findApplication(appCode);
    await this.prisma.applicationManager.deleteMany({
      where: { applicationId: app.id, userId },
    });
    await this.authorization.audit(actorId, 'APP_MANAGER_REMOVED', app.code, {
      userId,
    });
    return { deleted: true };
  }

  async listAppUsers(appCode: string) {
    const app = await this.findApplication(appCode);
    const [access, assignments] = await Promise.all([
      this.prisma.userAppAccess.findMany({
        where: { applicationId: app.id },
        include: {
          user: {
            select: { id: true, email: true, fullName: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.userAppRole.findMany({
        where: { applicationId: app.id },
        include: { role: { select: { code: true } } },
      }),
    ]);
    const rolesByUser = new Map<string, string[]>();
    for (const { userId, role } of assignments) {
      rolesByUser.set(userId, [...(rolesByUser.get(userId) ?? []), role.code]);
    }
    return access.map((row) => ({
      ...row,
      roles: rolesByUser.get(row.userId) ?? [],
    }));
  }

  async importManifest(manifest: ApplicationManifest) {
    this.validateManifest(manifest);
    const code = manifest.app.code.trim().toUpperCase();
    const existing = await this.prisma.application.findFirst({
      where: { code },
    });
    const clientOwner = await this.prisma.application.findUnique({
      where: { clientId: manifest.app.clientId.trim() },
      select: { id: true },
    });
    if (clientOwner && clientOwner.id !== existing?.id) {
      throw new BadRequestException(
        'Manifest clientId belongs to another application',
      );
    }
    const app = existing
      ? await this.prisma.application.update({
          where: { id: existing.id },
          data: {
            name: manifest.app.name.trim(),
            clientId: manifest.app.clientId.trim(),
            require2fa: manifest.auth?.require2FA ?? false,
          },
        })
      : await this.prisma.application.create({
          data: {
            id: `app-${code.toLowerCase()}`,
            code,
            name: manifest.app.name.trim(),
            clientId: manifest.app.clientId.trim(),
            require2fa: manifest.auth?.require2FA ?? false,
          },
        });

    if (manifest.auth?.redirectUri) {
      await this.addRedirectUri(code, manifest.auth.redirectUri);
    }
    for (const role of manifest.roles ?? []) {
      await this.prisma.appRole.upsert({
        where: {
          applicationId_code: {
            applicationId: app.id,
            code: role.code.toUpperCase(),
          },
        },
        create: {
          id: `${app.id}-role-${role.code.toLowerCase()}`,
          applicationId: app.id,
          code: role.code.toUpperCase(),
          name: role.name?.trim() || role.code.toUpperCase(),
          description: role.description?.trim(),
        },
        update: {
          name: role.name?.trim(),
          description: role.description?.trim(),
          deprecated: false,
        },
      });
    }
    await this.prisma.appRole.updateMany({
      where: {
        applicationId: app.id,
        code: {
          notIn: (manifest.roles ?? []).map(({ code: value }) =>
            value.toUpperCase(),
          ),
        },
      },
      data: { deprecated: true },
    });
    const declaredPermissions = new Set(
      (manifest.permissions ?? []).map(({ code: value }) => value),
    );
    await this.prisma.permission.updateMany({
      where: {
        applicationId: app.id,
        code: { notIn: [...declaredPermissions] },
      },
      data: { deprecated: true },
    });
    for (const permission of manifest.permissions ?? []) {
      await this.prisma.permission.upsert({
        where: {
          applicationId_code: { applicationId: app.id, code: permission.code },
        },
        create: {
          id: `${app.id}-perm-${permission.code.replace(/\./g, '-')}`,
          applicationId: app.id,
          code: permission.code,
          description: permission.description?.trim(),
        },
        update: {
          description: permission.description?.trim(),
          deprecated: false,
        },
      });
    }
    for (const [role, permissions] of Object.entries(
      manifest.rolePermissions ?? {},
    )) {
      await this.setRolePermissions(code, role, permissions);
    }
    await Promise.all([
      this.authorization.invalidateApplication(app.id, app.code),
      this.authorization.audit(null, 'MANIFEST_IMPORTED', app.code, {
        roles: manifest.roles?.length ?? 0,
        permissions: manifest.permissions?.length ?? 0,
      }),
    ]);
    return this.getApplication(code);
  }

  private async findRole(appCode: string, roleCode: string) {
    const app = await this.findApplication(appCode);
    const role = await this.prisma.appRole.findUnique({
      where: {
        applicationId_code: {
          applicationId: app.id,
          code: roleCode.toUpperCase(),
        },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    return { app, role };
  }

  private async findPermission(appCode: string, permissionCode: string) {
    const app = await this.findApplication(appCode);
    const permission = await this.prisma.permission.findUnique({
      where: {
        applicationId_code: { applicationId: app.id, code: permissionCode },
      },
    });
    if (!permission) throw new NotFoundException('Permission not found');
    return { app, permission };
  }

  private async rolePermissionsChanged(
    appId: string,
    appCode: string,
    role: string,
  ) {
    await Promise.all([
      this.authorization.invalidateApplication(appId, appCode),
      this.authorization.audit(null, 'ROLE_PERMISSION_CHANGED', appCode, {
        role,
      }),
    ]);
  }

  private validatePermissionCode(appCode: string, permissionCode: string) {
    const prefix = `${appCode.toLowerCase()}.`;
    if (
      !permissionCode.startsWith(prefix) ||
      !/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*){2,}$/.test(permissionCode)
    ) {
      throw new BadRequestException(
        `Permission must match ${prefix}<resource>.<action>`,
      );
    }
  }

  private validateRedirectUri(value: string) {
    let uri: URL;
    try {
      uri = new URL(value);
    } catch {
      throw new BadRequestException(
        'redirect_uri must be a valid absolute URL',
      );
    }
    if (
      !['http:', 'https:'].includes(uri.protocol) ||
      value.includes('*') ||
      uri.hash
    ) {
      throw new BadRequestException(
        'redirect_uri must be an exact http(s) URL',
      );
    }
  }

  private validateApplicationInput(input: {
    code: string;
    name: string;
    clientId: string;
    redirectUri?: string;
  }) {
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(input.code.trim())) {
      throw new BadRequestException('Application code is invalid');
    }
    if (!input.name.trim() || !input.clientId.trim()) {
      throw new BadRequestException(
        'Application name and clientId are required',
      );
    }
    if (input.redirectUri) this.validateRedirectUri(input.redirectUri.trim());
  }

  private validateManifest(manifest: ApplicationManifest) {
    if (
      !manifest?.app ||
      typeof manifest.app.code !== 'string' ||
      typeof manifest.app.name !== 'string' ||
      typeof manifest.app.clientId !== 'string'
    ) {
      throw new BadRequestException(
        'Manifest app.code, app.name and app.clientId are required',
      );
    }
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(manifest.app.code.trim())) {
      throw new BadRequestException('Manifest application code is invalid');
    }
    if (!manifest.app.name.trim() || !manifest.app.clientId.trim()) {
      throw new BadRequestException('Manifest name and clientId are required');
    }
    if (
      (manifest.roles !== undefined && !Array.isArray(manifest.roles)) ||
      (manifest.permissions !== undefined &&
        !Array.isArray(manifest.permissions))
    ) {
      throw new BadRequestException(
        'Manifest roles and permissions must be arrays',
      );
    }
    if (
      (manifest.roles ?? []).some(
        (role) =>
          typeof role?.code !== 'string' ||
          !/^[A-Za-z][A-Za-z0-9_-]*$/.test(role.code),
      ) ||
      (manifest.permissions ?? []).some(
        (permission) => typeof permission?.code !== 'string',
      )
    ) {
      throw new BadRequestException(
        'Manifest contains an invalid role or permission',
      );
    }
    if (
      manifest.rolePermissions !== undefined &&
      (typeof manifest.rolePermissions !== 'object' ||
        Array.isArray(manifest.rolePermissions) ||
        Object.values(manifest.rolePermissions).some(
          (permissions) =>
            !Array.isArray(permissions) ||
            permissions.some((permission) => typeof permission !== 'string'),
        ))
    ) {
      throw new BadRequestException('Manifest rolePermissions is invalid');
    }
    const roleCodes = (manifest.roles ?? []).map(({ code }) =>
      code.toUpperCase(),
    );
    const permissionCodes = (manifest.permissions ?? []).map(
      ({ code }) => code,
    );
    if (new Set(roleCodes).size !== roleCodes.length) {
      throw new BadRequestException('Manifest contains duplicate role codes');
    }
    if (new Set(permissionCodes).size !== permissionCodes.length) {
      throw new BadRequestException('Manifest contains duplicate permissions');
    }
    permissionCodes.forEach((code) =>
      this.validatePermissionCode(manifest.app.code, code),
    );
    for (const [role, permissions] of Object.entries(
      manifest.rolePermissions ?? {},
    )) {
      if (!roleCodes.includes(role.toUpperCase())) {
        throw new BadRequestException(
          `Role mapping references unknown role: ${role}`,
        );
      }
      const unknown = permissions.find(
        (permission) => !permissionCodes.includes(permission),
      );
      if (unknown)
        throw new BadRequestException(
          `Role mapping references unknown permission: ${unknown}`,
        );
    }
    if (manifest.auth?.redirectUri)
      this.validateRedirectUri(manifest.auth.redirectUri);
  }

  private async findApplication(
    appCode: string,
    include?: Record<string, any>,
  ) {
    const application = await this.prisma.application.findFirst({
      where: {
        OR: [{ code: appCode.toUpperCase() }, { clientId: appCode }],
      },
      include,
    });
    if (!application) throw new NotFoundException('Application not found');
    return application;
  }
}
