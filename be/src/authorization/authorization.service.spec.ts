import { AuthorizationService } from './authorization.service';

describe('AuthorizationService', () => {
  function setup(assignments: unknown[] = []) {
    const prisma = {
      application: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'app-quiz',
          code: 'QUIZ',
          status: 'ACTIVE',
        }),
      },
      userAppAccess: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ status: 'ACTIVE', expiresAt: null }),
        upsert: jest.fn().mockResolvedValue({ status: 'BLOCKED' }),
      },
      userAppRole: {
        findMany: jest.fn().mockResolvedValue(assignments),
        deleteMany: jest.fn(),
      },
      appRole: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'role-admin', code: 'ADMIN' }),
      },
      authAuditLog: { create: jest.fn() },
    };
    const redis = {
      getJson: jest.fn().mockResolvedValue(undefined),
      setJson: jest.fn(),
      del: jest.fn(),
    };
    const sessions = { revokeUserAppSessions: jest.fn() };
    return {
      service: new AuthorizationService(
        prisma as any,
        redis as any,
        sessions as any,
      ),
      prisma,
      redis,
      sessions,
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
});
