import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RecordTimelineEventDto } from './record-timeline-event.dto';

describe('RecordTimelineEventDto', () => {
  it('accepts a namespaced idempotency key from an application', async () => {
    const dto = plainToInstance(RecordTimelineEventDto, {
      userId: 'user-1',
      eventType: 'COURSE_COMPLETE',
      title: 'Completed NestJS fundamentals',
      idempotencyKey: 'quiz:course:nestjs-fund:user-1',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects a short or unsafe idempotency key', async () => {
    const dto = plainToInstance(RecordTimelineEventDto, {
      userId: 'user-1',
      eventType: 'COURSE_COMPLETE',
      title: 'Completed NestJS fundamentals',
      idempotencyKey: 'bad key',
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
