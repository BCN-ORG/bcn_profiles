import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum EventType {
  JOIN_BCN = 'JOIN_BCN',
  COURSE_COMPLETE = 'COURSE_COMPLETE',
  QUIZ_COMPLETE = 'QUIZ_COMPLETE',
  PROJECT_COMPLETE = 'PROJECT_COMPLETE',
  SEMESTER_COMPLETE = 'SEMESTER_COMPLETE',
}

export class CreateTimelineEventDto {
  @IsEnum(EventType)
  @IsNotEmpty()
  eventType!: EventType;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}
