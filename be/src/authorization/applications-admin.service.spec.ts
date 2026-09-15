import { BadRequestException } from '@nestjs/common';
import { ApplicationsAdminService } from './applications-admin.service';

describe('ApplicationsAdminService', () => {
  const app = { id: 'app-quiz', code: 'QUIZ' };

  function setup() {
    const prisma = {
      application: { findFirst: jest.fn().mockResolvedValue(app) },
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

  it('rejects permissions belonging to another application', async () => {
    const { service } = setup();
    await expect(
      service.createPermission('quiz', { code: 'event.checkin.execute' }),
    ).rejects.toBeInstanceOf(BadRequestException);
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
});
