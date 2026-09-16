import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { EventType } from './create-timeline-event.dto';

export class RecordTimelineEventDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsEnum(EventType)
  eventType!: EventType;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(120)
  @Matches(/^[A-Za-z0-9:_-]+$/, {
    message:
      'idempotencyKey must be 8-120 characters of letters, numbers, :, _, or -',
  })
  idempotencyKey!: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}
