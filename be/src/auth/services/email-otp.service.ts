import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomInt } from 'crypto';
import { RedisService } from '../../redis/redis.service';

export const EMAIL_OTP_TTL_MS = 5 * 60 * 1000;

export type EmailOtpPurpose =
  | 'reset-password'
  | 'change-email'
  | 'two-factor-login'
  | 'two-factor-recovery';

@Injectable()
export class EmailOtpService {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async issue(purpose: EmailOtpPurpose, identity: string): Promise<string> {
    const otp = randomInt(100000, 1000000).toString();
    await this.redis.set(
      this.key(purpose, identity),
      this.digest(otp),
      EMAIL_OTP_TTL_MS,
    );
    return otp;
  }

  async consume(
    purpose: EmailOtpPurpose,
    identity: string,
    otp: string,
  ): Promise<boolean> {
    const result = await this.redis.raw.eval(
      `if redis.call('GET', KEYS[1]) == ARGV[1] then
         redis.call('DEL', KEYS[1])
         return 1
       end
       return 0`,
      1,
      this.redis.key(this.key(purpose, identity)),
      this.digest(otp),
    );
    return result === 1;
  }

  async revoke(purpose: EmailOtpPurpose, identity: string): Promise<void> {
    await this.redis.del(this.key(purpose, identity));
  }

  private key(purpose: EmailOtpPurpose, identity: string): string {
    const subject = createHash('sha256')
      .update(identity.trim().toLowerCase())
      .digest('hex');
    return `email_otp:${purpose}:${subject}`;
  }

  private digest(otp: string): string {
    const secret = this.config.get<string>('JWT_SECRET')?.trim();
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    return createHmac('sha256', secret).update(otp).digest('hex');
  }
}
