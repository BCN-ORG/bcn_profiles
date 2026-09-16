import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  UnauthorizedException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimelineEventDto } from './dto/create-timeline-event.dto';
import { UpdateTimelineEventDto } from './dto/update-timeline-event.dto';
import { RecordTimelineEventDto } from './dto/record-timeline-event.dto';
import { UsersListCacheService } from '../users/users-list-cache.service';
import { TimelineEventsCacheService } from './timeline-events-cache.service';
import { Role } from '../auth/enums/role.enum';

@Injectable()
export class TimelineEventsService implements OnModuleInit {
  private readonly logger = new Logger(TimelineEventsService.name);

  constructor(
    private prisma: PrismaService,
    private readonly usersListCache: UsersListCacheService,
    private readonly timelineCache: TimelineEventsCacheService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.prefetchHotTimelines();
  }

  /** Warm common my-timeline pages for admins and recently active users. */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async prefetchHotTimelines(): Promise<void> {
    try {
      const [admins, recentActive] = await Promise.all([
        this.prisma.user.findMany({
          where: { role: 'ADMIN' },
          select: { id: true },
          take: 20,
        }),
        this.prisma.user.findMany({
          where: { status: 'ACTIVE', role: { not: 'ADMIN' } },
          select: { id: true },
          orderBy: { updatedAt: 'desc' },
          take: 10,
        }),
      ]);

      const userIds = [
        ...new Set([...admins, ...recentActive].map((user) => user.id)),
      ];

      // Small concurrency to warm cache without saturating the remote DB pool.
      const batchSize = 5;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (userId) => {
            const page = await this.queryAllByUser(userId, 1, 20);
            await this.timelineCache.setList(userId, 1, 20, page);
            for (const event of page) {
              await this.timelineCache.setDetail(event.id, event);
            }
          }),
        );
      }

      this.logger.debug(`Prefetched timelines for ${userIds.length} user(s)`);
    } catch (error) {
      this.logger.warn(
        `Failed to prefetch timelines: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async create(userId: string, createDto: CreateTimelineEventDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const created = await this.prisma.timelineEvent.create({
      data: {
        userUuid: userId,
        eventType: createDto.eventType,
        title: createDto.title,
        metadata: createDto.metadata,
      },
    });
    await this.invalidateCaches(userId);
    return created;
  }

  async recordFromApplication(
    authorization: string | undefined,
    dto: RecordTimelineEventDto,
  ) {
    const app = await this.authenticateApplication(authorization);
    const existing = await this.prisma.timelineEvent.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) {
      if (existing.userUuid !== dto.userId || existing.sourceApp !== app.code) {
        throw new ConflictException({
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'idempotencyKey is already used by another timeline event',
        });
      }
      return existing;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    try {
      const created = await this.prisma.timelineEvent.create({
        data: {
          userUuid: dto.userId,
          eventType: dto.eventType,
          title: dto.title,
          metadata: dto.metadata,
          sourceApp: app.code,
          idempotencyKey: dto.idempotencyKey,
        },
      });
      await this.prisma.authAuditLog.create({
        data: {
          id: randomUUID(),
          userId: dto.userId,
          eventType: 'TIMELINE_RECORDED',
          applicationCode: app.code,
          metadata: {
            timelineEventId: created.id,
            eventType: dto.eventType,
            idempotencyKey: dto.idempotencyKey,
          },
        },
      });
      await this.invalidateCaches(dto.userId);
      return created;
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error;
      const raced = await this.prisma.timelineEvent.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (raced) return raced;
      throw error;
    }
  }

  private async authenticateApplication(header: string | undefined) {
    const match = header?.match(/^Basic (\S+)$/i);
    if (!match) {
      throw new UnauthorizedException({
        code: 'APP_CREDENTIALS_INVALID',
        message: 'Application Basic credentials are required',
      });
    }
    const decoded = Buffer.from(match[1], 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    const clientId = separator >= 0 ? decoded.slice(0, separator) : '';
    const clientSecret = separator >= 0 ? decoded.slice(separator + 1) : '';
    const app = clientId
      ? await this.prisma.application.findUnique({
          where: { clientId },
          select: {
            id: true,
            code: true,
            status: true,
            clientSecrets: {
              where: { status: 'ACTIVE' },
              select: { secretHash: true },
            },
          },
        })
      : null;
    let secretOk = false;
    for (const key of app?.clientSecrets ?? []) {
      if (await bcrypt.compare(clientSecret, key.secretHash)) {
        secretOk = true;
        break;
      }
    }
    if (!secretOk) {
      throw new UnauthorizedException({
        code: 'APP_CREDENTIALS_INVALID',
        message: 'Application credentials are invalid',
      });
    }
    if (app!.status !== 'ACTIVE') {
      throw new ForbiddenException({
        code: 'APP_DISABLED',
        message: 'Application is disabled',
      });
    }
    return app!;
  }

  async findAllByUser(userId: string, page: number = 1, limit: number = 20) {
    const cached = await this.timelineCache.getList(userId, page, limit);
    if (cached) {
      return cached;
    }

    const events = await this.queryAllByUser(userId, page, limit);
    await this.timelineCache.setList(userId, page, limit, events);
    for (const event of events) {
      await this.timelineCache.setDetail(event.id, event);
    }
    return events;
  }

  async findOne(id: number, requesterId?: string, requesterRole?: string) {
    const cached = await this.timelineCache.getDetail(id);
    if (cached) {
      this.assertCanViewTimelineEvent(
        cached as { userUuid: string },
        requesterId,
        requesterRole,
      );
      return cached;
    }

    const event = await this.prisma.timelineEvent.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(`Timeline event with ID ${id} not found`);
    }

    this.assertCanViewTimelineEvent(event, requesterId, requesterRole);
    await this.timelineCache.setDetail(id, event);
    return event;
  }

  private assertCanViewTimelineEvent(
    event: { userUuid: string },
    requesterId?: string,
    requesterRole?: string,
  ) {
    if (!requesterId) {
      return;
    }
    if (event.userUuid !== requesterId && requesterRole !== Role.ADMIN) {
      throw new ForbiddenException(
        'You can only view your own timeline events',
      );
    }
  }

  async update(id: number, updateDto: UpdateTimelineEventDto) {
    const event = (await this.findOne(id)) as { userUuid: string };

    const updated = await this.prisma.timelineEvent.update({
      where: { id },
      data: updateDto,
    });
    await this.invalidateCaches(event.userUuid);
    return updated;
  }

  async remove(id: number) {
    const event = (await this.findOne(id)) as { userUuid: string; id: number };

    const removed = await this.prisma.timelineEvent.delete({
      where: { id },
    });
    await this.invalidateCaches(event.userUuid);
    return removed;
  }

  private async queryAllByUser(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    return this.prisma.timelineEvent.findMany({
      where: { userUuid: userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });
  }

  private async invalidateCaches(userId: string): Promise<void> {
    await this.timelineCache.invalidateUser(userId);
    await this.usersListCache.invalidateAll();
  }
}
