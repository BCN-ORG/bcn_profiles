import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { TimelineEventsController } from './timeline-events.controller';

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
});
