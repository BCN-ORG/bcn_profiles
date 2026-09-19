import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { RecordTimelineEventDto } from './dto/record-timeline-event.dto';
import { TimelineEventsService } from './timeline-events.service';

@Controller('internal')
export class InternalTimelineEventsController {
  constructor(private readonly timelineEventsService: TimelineEventsService) {}

  @Public()
  @Post('timeline-events')
  record(
    @Headers('authorization') header: string | undefined,
    @Body() dto: RecordTimelineEventDto,
  ) {
    return this.timelineEventsService.recordFromApplication(header, dto);
  }

  /** Batch public profile fields for app backends (Basic client credentials). */
  @Public()
  @Get('users')
  lookupUsers(
    @Headers('authorization') header: string | undefined,
    @Query('ids') ids?: string,
  ) {
    return this.timelineEventsService.lookupUsersFromApplication(header, ids);
  }
}
