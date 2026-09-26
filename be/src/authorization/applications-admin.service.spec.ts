import { BadRequestException } from '@nestjs/common';
import { ApplicationsAdminService } from './applications-admin.service';

describe('ApplicationsAdminService', () => {
  const app = { id: 'app-quiz', code: 'QUIZ' };

  function setup() {
    const prisma = {
      application: {
        findFirst: jest.fn().mockResolvedValue(app),
        update: jest.fn().mockResolvedValue({}),
      },
      applicationClientSecret: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation(({ data }) => ({
          id: data.id,
          label: data.label,
          status: data.status,
          createdAt: new Date('2026-09-16T00:00:00Z'),
          disabledAt: null,
        })),
        findFirst: jest.fn().mockResolvedValue({ id: 'secret-1' }),
        update: jest.fn().mockImplementation(({ data }) => ({
          id: 'secret-1',
          label: 'Key 1',
          status: data.status,
          createdAt: new Date('2026-09-16T00:00:00Z'),
          disabledAt: data.disabledAt ?? null,
        })),
      },
      permission: {
        create: jest.fn().mockImplementation(({ data }) => data),
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'p-read', code: 'quiz.question.read' }]),
      },
      appRole: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'r-admin', code: 'ADMIN' }),
      },
      rolePermission: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    const authorization = {
      audit: jest.fn(),
      invalidateApplication: jest.fn(),
    };
    return {
      service: new ApplicationsAdminService(
        prisma as any,
        authorization as any,
      ),
      prisma,
      authorization,
    };
  }

  it('rejects creating a permission outside the app manifest', async () => {
    const { service, prisma } = setup();
    await expect(
      service.createPermission('quiz', { code: 'quiz.question.read' }),
    ).rejects.toThrow(/manifest/i);
    expect(prisma.permission.create).not.toHaveBeenCalled();
  });

  it('rejects creating or deleting catalog roles and permissions', async () => {
    const { service, prisma } = setup();
    await expect(
      service.createRole('quiz', { code: 'HELPER' }),
    ).rejects.toThrow(/manifest/i);
    await expect(service.deleteRole('quiz', 'ADMIN')).rejects.toThrow(
      /manifest/i,
    );
    await expect(
      service.deletePermission('quiz', 'quiz.question.read'),
    ).rejects.toThrow(/manifest/i);
    expect(prisma.permission.create).not.toHaveBeenCalled();
  });

  it('replaces a role permission set and invalidates the whole app cache', async () => {
    const { service, prisma, authorization } = setup();
    await service.setRolePermissions('quiz', 'admin', ['quiz.question.read']);

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(authorization.invalidateApplication).toHaveBeenCalledWith(
      app.id,
      app.code,
    );
  });

  it('issues a server key without exposing the stored hash', async () => {
    const { service, prisma, authorization } = setup();
    const result = await service.createClientSecret('quiz', {
      label: 'Quiz prod',
    });

    expect(result.clientSecret).toEqual(expect.any(String));
    expect(result.clientSecret.length).toBeGreaterThan(20);
    expect(result).not.toHaveProperty('secretHash');
    expect(prisma.applicationClientSecret.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          applicationId: app.id,
          label: 'Quiz prod',
          secretHash: expect.any(String),
        }),
      }),
    );
    expect(authorization.audit).toHaveBeenCalledWith(
      null,
      'APP_SECRET_CREATED',
      'QUIZ',
      { secretId: result.id },
    );
  });

  it('rejects issuing more than 10 server keys', async () => {
    const { service, prisma } = setup();
    prisma.applicationClientSecret.count.mockResolvedValue(10);

    await expect(service.createClientSecret('quiz')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.applicationClientSecret.create).not.toHaveBeenCalled();
  });

  it('disables a server key', async () => {
    const { service, prisma, authorization } = setup();
    const result = await service.setClientSecretStatus(
      'quiz',
      'secret-1',
      'DISABLED',
    );

    expect(result.status).toBe('DISABLED');
    expect(prisma.applicationClientSecret.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'secret-1' },
        data: expect.objectContaining({ status: 'DISABLED' }),
      }),
    );
    expect(authorization.audit).toHaveBeenCalledWith(
      null,
      'APP_SECRET_DISABLED',
      'QUIZ',
      { secretId: 'secret-1' },
    );
  });
});
