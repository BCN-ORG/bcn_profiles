import { ForbiddenException } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';

describe('AuthorizationService', () => {
  function setup(
    assignments: unknown[] = [],
    overrides?: {
      accessMode?: 'MANUAL' | 'MEMBERS';
      access?: { status: string; expiresAt: Date | null } | null;
      existingRole?: { roleId: string } | null;
      memberRole?: { id: string } | null;
    },
  ) {
    const accessMode = overrides?.accessMode ?? 'MANUAL';
    const access =
      overrides?.access === undefined
        ? { status: 'ACTIVE', expiresAt: null }
        : overrides.access;
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ status: 'ACTIVE' }),
      },
      application: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'app-quiz',
          code: 'QUIZ',
          status: 'ACTIVE',
          accessMode,
        }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'app-quiz',
          code: 'QUIZ',
          accessMode,
        }),
      },
      userAppAccess: {
        findUnique: jest.fn().mockResolvedValue(access),
        create: jest.fn().mockResolvedValue({ status: 'ACTIVE' }),
        upsert: jest.fn().mockResolvedValue({ status: 'BLOCKED' }),
      },
      userAppRole: {
        findMany: jest.fn().mockResolvedValue(assignments),
        findFirst: jest
          .fn()
          .mockResolvedValue(
            overrides?.existingRole === undefined
              ? null
              : overrides.existingRole,
          ),
        create: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn(),
      },
      appRole: {
        findUnique: jest.fn().mockImplementation((args: { where?: { applicationId_code?: { code?: string } } }) => {
          const code = args?.where?.applicationId_code?.code;
          if (code === 'MEMBER') {
            return Promise.resolve(
              overrides?.memberRole === undefined
                ? { id: 'role-member' }
                : overrides.memberRole,
            );
          }
          return Promise.resolve({ id: 'role-admin', code: 'ADMIN' });
        }),
      },
      authAuditLog: { create: jest.fn() },
    };
    const redis = {
      getJson: jest.fn().mockResolvedValue(undefined),
      setJson: jest.fn(),
      del: jest.fn(),
    };
    const sessions = { revokeUserAppSessions: jest.fn() };
    const membership = { assertEligible: jest.fn().mockResolvedValue({}) };
    return {
      service: new AuthorizationService(
        prisma as never,
        redis as never,
        sessions as never,
        membership as never,
      ),
      prisma,
      redis,
      sessions,
      membership,
    };
  }

  it('loads application-scoped roles and permissions from the source of truth', async () => {
    const { service } = setup([
      {
        role: {
          code: 'MEMBER',
          permissions: [{ permission: { code: 'quiz.question.read' } }],
        },
      },
    ]);

    await expect(
      service.check('user-1', 'quiz', 'quiz.question.read'),
    ).resolves.toBe(true);
    await expect(
      service.check('user-1', 'quiz', 'quiz.question.create'),
    ).resolves.toBe(false);
  });

  it('returns the union of permissions from multiple roles in one app', async () => {
    const { service } = setup([
      {
        role: {
          code: 'ORGANIZER',
          permissions: [{ permission: { code: 'event.participant.read' } }],
        },
      },
      {
        role: {
          code: 'CHECKIN_STAFF',
          permissions: [{ permission: { code: 'event.checkin.execute' } }],
        },
      },
    ]);

    await expect(service.resolve('user-1', 'event')).resolves.toMatchObject({
      roles: ['ORGANIZER', 'CHECKIN_STAFF'],
      permissions: ['event.participant.read', 'event.checkin.execute'],
    });
  });

  it('denies runtime authorization when the user is not active', async () => {
    const { service, prisma } = setup();
    prisma.user.findUnique.mockResolvedValue({ status: 'BLOCKED' });

    await expect(service.resolve('user-1', 'quiz')).rejects.toMatchObject({
      response: { code: 'USER_INACTIVE' },
    });
  });

  it('invalidates authorization and revokes only that app sessions when blocked', async () => {
    const { service, redis, sessions } = setup();
    await service.setAccess('admin-1', 'user-1', 'quiz', 'BLOCKED');

    expect(redis.del).toHaveBeenCalledWith('authz:user-1:quiz');
    expect(sessions.revokeUserAppSessions).toHaveBeenCalledWith(
      'user-1',
      'quiz',
    );
  });

  it('invalidates cached permissions immediately after a role is removed', async () => {
    const { service, prisma, redis } = setup();
    await service.removeRole('admin-1', 'user-1', 'quiz', 'admin');

    expect(prisma.userAppRole.deleteMany).toHaveBeenCalled();
    expect(redis.del).toHaveBeenCalledWith('authz:user-1:quiz');
  });

  describe('assertAccess accessMode', () => {
    it('MANUAL denies when access row is missing', async () => {
      const { service } = setup([], { accessMode: 'MANUAL', access: null });
      await expect(service.assertAccess('user-1', 'app-quiz')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('MEMBERS creates access row when missing then allows', async () => {
      const { service, prisma } = setup([], {
        accessMode: 'MEMBERS',
        access: null,
        memberRole: null,
      });
      await expect(service.assertAccess('user-1', 'app-quiz')).resolves.toBeUndefined();
      expect(prisma.userAppAccess.create).toHaveBeenCalled();
      expect(prisma.userAppRole.create).not.toHaveBeenCalled();
    });

    it('MEMBERS denies when user is BLOCKED', async () => {
      const { service } = setup([], {
        accessMode: 'MEMBERS',
        access: { status: 'BLOCKED', expiresAt: null },
      });
      await expect(service.assertAccess('user-1', 'app-quiz')).rejects.toMatchObject({
        response: { code: 'APP_ACCESS_DENIED' },
      });
    });

    it('MEMBERS auto-assigns MEMBER role on first visit', async () => {
      const { service, prisma, redis } = setup([], {
        accessMode: 'MEMBERS',
        access: null,
        existingRole: null,
        memberRole: { id: 'role-member' },
      });
      await service.assertAccess('user-1', 'app-quiz');
      expect(prisma.userAppRole.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          applicationId: 'app-quiz',
          roleId: 'role-member',
          assignedBy: null,
        },
      });
      expect(redis.del).toHaveBeenCalledWith('authz:user-1:quiz');
    });

    it('MEMBERS does not assign MEMBER when user already has a role', async () => {
      const { service, prisma } = setup([], {
        accessMode: 'MEMBERS',
        access: null,
        existingRole: { roleId: 'role-examiner' },
        memberRole: { id: 'role-member' },
      });
      await service.assertAccess('user-1', 'app-quiz');
      expect(prisma.userAppRole.create).not.toHaveBeenCalled();
    });
  });
});
