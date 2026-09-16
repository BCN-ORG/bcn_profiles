import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { EventType } from './create-timeline-event.dto';

export class UpdateTimelineEventDto {
  @IsEnum(EventType)
  @IsOptional()
  eventType?: EventType;

  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}
