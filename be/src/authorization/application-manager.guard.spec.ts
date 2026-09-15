import { ForbiddenException } from '@nestjs/common';
import { ApplicationManagerGuard } from './application-manager.guard';

describe('ApplicationManagerGuard', () => {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(true) };

  function context(user: { id: string; role: string }, app = 'quiz') {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user, params: { app } }) }),
    } as any;
  }

  it('allows a manager only when assigned to the requested app', async () => {
    const prisma = {
      applicationManager: {
        findFirst: jest.fn().mockResolvedValue({ userId: 'user-1' }),
      },
    };
    const guard = new ApplicationManagerGuard(reflector as any, prisma as any);
    await expect(
      guard.canActivate(context({ id: 'user-1', role: 'USER' })),
    ).resolves.toBe(true);
    expect(prisma.applicationManager.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1' }),
      }),
    );
  });

  it('rejects an unassigned user', async () => {
    const prisma = {
      applicationManager: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const guard = new ApplicationManagerGuard(reflector as any, prisma as any);
    await expect(
      guard.canActivate(context({ id: 'user-2', role: 'USER' }, 'event')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
