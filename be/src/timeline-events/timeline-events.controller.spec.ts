import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { Role } from '../auth/enums/role.enum';
import { TimelineEventsController } from './timeline-events.controller';
import { InternalTimelineEventsController } from './internal-timeline-events.controller';

describe('TimelineEventsController authorization', () => {
  const rolesFor = (method: keyof TimelineEventsController) => {
    const handler = Object.getOwnPropertyDescriptor(
      TimelineEventsController.prototype,
      method,
    )?.value as object;
    return Reflect.getMetadata(ROLES_KEY, handler) as Role[] | undefined;
  };

  it.each(['create', 'update', 'remove'] as const)(
    'restricts %s to admins',
    (method) => {
      expect(rolesFor(method)).toEqual([Role.ADMIN]);
    },
  );

  it('keeps the personal timeline readable by authenticated users', () => {
    expect(rolesFor('findMyTimeline')).toBeUndefined();
  });

  it('lets registered apps record timeline events without a user session', () => {
    const handler = Object.getOwnPropertyDescriptor(
      InternalTimelineEventsController.prototype,
      'record',
    )?.value as object;
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
  });
});
