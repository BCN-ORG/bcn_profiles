import { Module } from '@nestjs/common';
import { AuthorizationController } from '../authorization/authorization.controller';
import { AuthorizationService } from '../authorization/authorization.service';
import { OauthController } from './oauth.controller';
import { OauthService } from './oauth.service';
import { OauthTokenService } from './oauth-token.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MembershipModule } from '../membership/membership.module';

@Module({
  imports: [PrismaModule, MembershipModule],
  controllers: [OauthController, AuthorizationController],
  providers: [OauthService, OauthTokenService, AuthorizationService],
  exports: [OauthTokenService, AuthorizationService],
})
export class OauthModule {}
