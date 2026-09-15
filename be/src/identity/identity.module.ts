import { Global, Module } from '@nestjs/common';
import { IdentitySessionService } from './session.service';

@Global()
@Module({
  providers: [IdentitySessionService],
  exports: [IdentitySessionService],
})
export class IdentityModule {}
