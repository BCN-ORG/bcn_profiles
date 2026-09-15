import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { IdentitySessionService } from '../identity/session.service';
import type { AppAccessStatus } from 'prisma/client/enums';

export type AuthorizationContext = {
  access: AppAccessStatus;
  roles: string[];
  permissions: string[];
};

@Injectable()
export class AuthorizationService {
  private readonly cacheTtlMs = Number(
    process.env.AUTHZ_CACHE_TTL_MS ?? 5 * 60 * 1000,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly sessions: IdentitySessionService,
  ) {}

  async getApplication(clientIdOrCode: string) {
    const application = await this.prisma.application.findFirst({
      where: {
        OR: [
          { clientId: clientIdOrCode },
          { code: clientIdOrCode.toUpperCase() },
        ],
      },
    });
    if (!application) throw new NotFoundException('Application not found');
    if (application.status !== 'ACTIVE') {
      throw new ForbiddenException({
        code: 'APP_DISABLED',
        message: 'Application is disabled',
      });
    }
    return application;
  }

  async assertAccess(userId: string, appId: string): Promise<void> {
    const access = await this.prisma.userAppAccess.findUnique({
      where: { userId_applicationId: { userId, applicationId: appId } },
    });
    if (
      access?.status !== 'ACTIVE' ||
      (access.expiresAt && access.expiresAt.getTime() <= Date.now())
    ) {
      throw new ForbiddenException({
        code: 'APP_ACCESS_DENIED',
        message: 'Application access is denied',
      });
    }
  }

  async resolve(
    userId: string,
    appCode: string,
  ): Promise<AuthorizationContext> {
    const code = appCode.toUpperCase();
    const cacheKey = `authz:${userId}:${code.toLowerCase()}`;
    const cached = await this.redis.getJson<AuthorizationContext>(cacheKey);
    if (cached) return cached;

    const app = await this.getApplication(code);
    await this.assertAccess(userId, app.id);
    const assignments = await this.prisma.userAppRole.findMany({
      where: { userId, applicationId: app.id },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });
    const context: AuthorizationContext = {
      access: 'ACTIVE',
      roles: [...new Set(assignments.map(({ role }) => role.code))],
      permissions: [
        ...new Set(
          assignments.flatMap(({ role }) =>
            role.permissions.map(({ permission }) => permission.code),
          ),
        ),
      ],
    };
    await this.redis.setJson(cacheKey, context, this.cacheTtlMs);
    return context;
  }

  async check(
    userId: string,
    app: string,
    permission: string,
  ): Promise<boolean> {
    try {
      return (await this.resolve(userId, app)).permissions.includes(permission);
    } catch (error) {
      if (error instanceof ForbiddenException) return false;
      throw error;
    }
  }

  async setAccess(
    actorId: string,
    userId: string,
    appCode: string,
    status: 'ACTIVE' | 'BLOCKED',
  ) {
    const app = await this.getApplication(appCode);
    const access = await this.prisma.userAppAccess.upsert({
      where: { userId_applicationId: { userId, applicationId: app.id } },
      create: {
        id: randomUUID(),
        userId,
        applicationId: app.id,
        status,
        grantedBy: actorId,
        grantedAt: status === 'ACTIVE' ? new Date() : null,
      },
      update: {
        status,
        grantedBy: actorId,
        grantedAt: status === 'ACTIVE' ? new Date() : undefined,
      },
    });
    await Promise.all([
      this.invalidate(userId, app.code),
      ...(status === 'BLOCKED'
        ? [this.sessions.revokeUserAppSessions(userId, app.code.toLowerCase())]
        : []),
      this.audit(
        actorId,
        status === 'ACTIVE' ? 'APP_ACCESS_GRANTED' : 'APP_ACCESS_BLOCKED',
        app.code,
        { userId },
      ),
    ]);
    return access;
  }

  async listAccess(userId: string) {
    const rows = await this.prisma.userAppAccess.findMany({
      where: { userId },
      include: {
        application: true,
      },
    });
    const roleRows = await this.prisma.userAppRole.findMany({
      where: { userId },
      include: { role: true, application: true },
    });
    const rolesByApp = new Map<string, string[]>();
    for (const row of roleRows) {
      const code = row.application.code;
      const list = rolesByApp.get(code) ?? [];
      list.push(row.role.code);
      rolesByApp.set(code, list);
    }
    return rows.map((row) => ({
      code: row.application.code,
      name: row.application.name,
      access: row.status,
      roles: rolesByApp.get(row.application.code) ?? [],
      grantedAt: row.grantedAt?.toISOString(),
      expiresAt: row.expiresAt?.toISOString(),
    }));
  }

  async listAudit(query: {
    userId?: string;
    eventType?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const where = {
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.eventType ? { eventType: query.eventType } : {}),
    };
    const [total, data] = await Promise.all([
      this.prisma.authAuditLog.count({ where }),
      this.prisma.authAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async listRoles(userId: string, appCode: string) {
    const app = await this.getApplication(appCode);
    return this.prisma.userAppRole.findMany({
      where: { userId, applicationId: app.id },
      include: { role: true },
    });
  }

  async assignRole(
    actorId: string,
    userId: string,
    appCode: string,
    roleCode: string,
  ) {
    const app = await this.getApplication(appCode);
    const role = await this.prisma.appRole.findUnique({
      where: {
        applicationId_code: {
          applicationId: app.id,
          code: roleCode.toUpperCase(),
        },
      },
    });
    if (!role) throw new NotFoundException('Role not found for application');
    const result = await this.prisma.userAppRole.upsert({
      where: {
        userId_applicationId_roleId: {
          userId,
          applicationId: app.id,
          roleId: role.id,
        },
      },
      create: { userId, applicationId: app.id, roleId: role.id },
      update: {},
    });
    await Promise.all([
      this.invalidate(userId, app.code),
      this.audit(actorId, 'ROLE_GRANTED', app.code, {
        userId,
        role: role.code,
      }),
    ]);
    return result;
  }

  async removeRole(
    actorId: string,
    userId: string,
    appCode: string,
    roleCode: string,
  ) {
    const app = await this.getApplication(appCode);
    const role = await this.prisma.appRole.findUnique({
      where: {
        applicationId_code: {
          applicationId: app.id,
          code: roleCode.toUpperCase(),
        },
      },
    });
    if (!role) throw new NotFoundException('Role not found for application');
    await this.prisma.userAppRole.deleteMany({
      where: { userId, applicationId: app.id, roleId: role.id },
    });
    await Promise.all([
      this.invalidate(userId, app.code),
      this.audit(actorId, 'ROLE_REVOKED', app.code, {
        userId,
        role: role.code,
      }),
    ]);
  }

  async invalidate(userId: string, app: string): Promise<void> {
    await this.redis.del(`authz:${userId}:${app.toLowerCase()}`);
  }

  async audit(
    userId: string | null,
    eventType: string,
    applicationCode?: string,
    metadata?: object,
  ) {
    await this.prisma.authAuditLog.create({
      data: { id: randomUUID(), userId, eventType, applicationCode, metadata },
    });
  }
}
