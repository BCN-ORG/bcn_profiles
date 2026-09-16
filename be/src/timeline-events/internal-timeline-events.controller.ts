import { Body, Controller, Headers, Post } from '@nestjs/common';
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
}
