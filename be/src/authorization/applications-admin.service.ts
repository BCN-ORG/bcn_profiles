import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { ApplicationStatus } from 'prisma/client/enums';

@Injectable()
export class ApplicationsAdminService {
  constructor(private readonly prisma: PrismaService) {}

  listApplications() {
    return this.prisma.application.findMany({
      include: {
        redirectUris: true,
        roles: { include: { permissions: { include: { permission: true } } } },
        permissions: true,
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
    return this.getApplication(appCode);
  }

  async addRedirectUri(appCode: string, redirectUri: string) {
    const app = await this.findApplication(appCode);
    const uri = redirectUri.trim();
    if (!uri.startsWith('http://') && !uri.startsWith('https://')) {
      throw new BadRequestException('redirect_uri must be http(s)');
    }
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
    body: { code: string; name?: string },
  ) {
    const app = await this.findApplication(appCode);
    const code = body.code.trim().toUpperCase();
    return this.prisma.appRole.create({
      data: {
        id: `${app.id}-role-${code.toLowerCase()}`,
        applicationId: app.id,
        code,
        name: body.name?.trim() || code,
      },
    });
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
    await this.prisma.userAppRole.deleteMany({ where: { roleId: role.id } });
    await this.prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await this.prisma.appRole.delete({ where: { id: role.id } });
    return { deleted: true };
  }

  async createPermission(
    appCode: string,
    body: { code: string; description?: string },
  ) {
    const app = await this.findApplication(appCode);
    const code = body.code.trim();
    return this.prisma.permission.create({
      data: {
        id: `${app.id}-perm-${code.replace(/\./g, '-')}`,
        applicationId: app.id,
        code,
        description: body.description?.trim(),
      },
    });
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
    return this.prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: permission.id,
        },
      },
      create: { roleId: role.id, permissionId: permission.id },
      update: {},
    });
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
    return { deleted: true };
  }

  listAppUsers(appCode: string) {
    return this.findApplication(appCode).then((app) =>
      this.prisma.userAppAccess.findMany({
        where: { applicationId: app.id },
        include: {
          user: {
            select: { id: true, email: true, fullName: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  private async findApplication(
    appCode: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    include?: Record<string, any>,
  ) {
    const application = await this.prisma.application.findFirst({
      where: {
        OR: [
          { code: appCode.toUpperCase() },
          { clientId: appCode },
        ],
      },
      include,
    });
    if (!application) throw new NotFoundException('Application not found');
    return application;
  }
}
