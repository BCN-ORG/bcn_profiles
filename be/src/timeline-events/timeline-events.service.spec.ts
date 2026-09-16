import * as bcrypt from 'bcrypt';
import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { TimelineEventsService } from './timeline-events.service';

describe('TimelineEventsService.recordFromApplication', () => {
  const secret = 'quiz-server-secret';
  const clientId = 'bcn-quiz';
  let hash: string;

  beforeAll(async () => {
    hash = await bcrypt.hash(secret, 4);
  });

  function basic(client = clientId, value = secret) {
    return `Basic ${Buffer.from(`${client}:${value}`).toString('base64')}`;
  }

  function setup(app?: {
    status?: 'ACTIVE' | 'DISABLED';
    clientSecrets?: { secretHash: string }[];
  }) {
    const prisma = {
      application: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'app-quiz',
          code: 'QUIZ',
          status: app?.status ?? 'ACTIVE',
          clientSecrets: app?.clientSecrets ?? [{ secretHash: hash }],
        }),
      },
      timelineEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation(({ data }) => ({ id: 11, ...data })),
      },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }) },
      authAuditLog: { create: jest.fn() },
    };
    const service = new TimelineEventsService(
      prisma as any,
      { invalidateAll: jest.fn() } as any,
      { invalidateUser: jest.fn() } as any,
    );
    return { service, prisma };
  }

  const dto = {
    userId: 'user-1',
    eventType: 'COURSE_COMPLETE' as const,
    title: 'Completed NestJS fundamentals',
    idempotencyKey: 'quiz:course:nestjs-fund:user-1',
  };

  it('records an official timeline event for the authenticated app', async () => {
    const { service, prisma } = setup();

    await expect(
      service.recordFromApplication(basic(), dto),
    ).resolves.toMatchObject({
      sourceApp: 'QUIZ',
      idempotencyKey: dto.idempotencyKey,
      userUuid: 'user-1',
    });
    expect(prisma.timelineEvent.create).toHaveBeenCalled();
  });

  it('returns the existing event when the same app retries the same key', async () => {
    const existing = {
      id: 11,
      userUuid: 'user-1',
      sourceApp: 'QUIZ',
      idempotencyKey: dto.idempotencyKey,
    };
    const { service, prisma } = setup();
    prisma.timelineEvent.findUnique.mockResolvedValue(existing);

    await expect(service.recordFromApplication(basic(), dto)).resolves.toEqual(
      existing,
    );
    expect(prisma.timelineEvent.create).not.toHaveBeenCalled();
  });

  it('rejects a key reused by another user or app', async () => {
    const { service, prisma } = setup();
    prisma.timelineEvent.findUnique.mockResolvedValue({
      id: 11,
      userUuid: 'other-user',
      sourceApp: 'QUIZ',
      idempotencyKey: dto.idempotencyKey,
    });

    await expect(
      service.recordFromApplication(basic(), dto),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects missing or invalid application credentials', async () => {
    const { service } = setup();
    await expect(
      service.recordFromApplication(undefined, dto),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      service.recordFromApplication(basic(clientId, 'wrong'), dto),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a disabled application after valid credentials', async () => {
    const { service } = setup({ status: 'DISABLED' });
    await expect(
      service.recordFromApplication(basic(), dto),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('accepts any one of multiple active server keys', async () => {
    const second = 'quiz-second-secret';
    const { service } = setup({
      clientSecrets: [
        { secretHash: await bcrypt.hash('other-secret', 4) },
        { secretHash: await bcrypt.hash(second, 4) },
      ],
    });

    await expect(
      service.recordFromApplication(basic(clientId, second), dto),
    ).resolves.toMatchObject({ sourceApp: 'QUIZ' });
  });

  it('rejects a disabled server key', async () => {
    const { service } = setup({ clientSecrets: [] });
    await expect(
      service.recordFromApplication(basic(), dto),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
