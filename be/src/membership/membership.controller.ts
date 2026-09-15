import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsDateString, IsIn, IsString, MinLength } from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../auth/decorators/user.decorator';
import { Role } from '../auth/enums/role.enum';
import { MembershipService } from './membership.service';

type CurrentUser = { id: string };

class MembershipOverrideDto {
  @IsIn(['ALLOW', 'DENY'])
  status!: 'ALLOW' | 'DENY';

  @IsString()
  @MinLength(3)
  reason!: string;

  @IsDateString()
  expiresAt!: string;
}

@Controller()
export class MembershipController {
  constructor(private readonly membership: MembershipService) {}

  @Get('me/membership')
  status(@User() user: CurrentUser) {
    return this.membership.status(user.id);
  }

  @Post('me/membership/recheck')
  recheck(@User() user: CurrentUser) {
    return this.membership.recheck(user.id);
  }

  @Get('admin/users/:userId/membership')
  @Roles(Role.ADMIN)
  adminStatus(@Param('userId') userId: string) {
    return this.membership.status(userId);
  }

  @Post('admin/users/:userId/membership/recheck')
  @Roles(Role.ADMIN)
  adminRecheck(@Param('userId') userId: string) {
    return this.membership.recheck(userId);
  }

  @Post('admin/users/:userId/membership/override')
  @Roles(Role.ADMIN)
  override(
    @User() actor: CurrentUser,
    @Param('userId') userId: string,
    @Body() dto: MembershipOverrideDto,
  ) {
    return this.membership.setOverride(actor.id, userId, dto);
  }
}
