import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OauthModule } from '../oauth/oauth.module';
import { ExternalIdentitiesController } from './external-identities.controller';
import { ExternalIdentitiesService } from './external-identities.service';
import { ExternalProviderService } from './provider.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MembershipModule } from '../membership/membership.module';

@Module({
  imports: [AuthModule, OauthModule, PrismaModule, MembershipModule],
  controllers: [ExternalIdentitiesController],
  providers: [ExternalIdentitiesService, ExternalProviderService],
})
export class ExternalIdentitiesModule {}
