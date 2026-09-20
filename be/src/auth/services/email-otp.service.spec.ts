import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { EMAIL_OTP_TTL_MS, EmailOtpService } from './email-otp.service';

describe('EmailOtpService', () => {
  it('stores a purpose-bound OTP for five minutes and consumes it once', async () => {
    const values = new Map<string, string>();
    const set = jest.fn(async (key: string, value: string) => {
      values.set(`test:${key}`, value);
    });
    const redis = {
      key: (key: string) => `test:${key}`,
      set,
      del: jest.fn(async (key: string) => values.delete(`test:${key}`)),
      raw: {
        eval: jest.fn(
          async (
            _script: string,
            _count: number,
            key: string,
            value: string,
          ) => {
            if (values.get(key) !== value) return 0;
            values.delete(key);
            return 1;
          },
        ),
      },
    } as unknown as RedisService;
    const config = {
      get: jest.fn().mockReturnValue('otp-test-secret'),
    } as unknown as ConfigService;
    const service = new EmailOtpService(redis, config);

    const otp = await service.issue('reset-password', 'User@Example.com');

    expect(otp).toMatch(/^\d{6}$/);
    expect(set).toHaveBeenCalledWith(
      expect.stringMatching(/^email_otp:reset-password:[a-f0-9]{64}$/),
      expect.stringMatching(/^[a-f0-9]{64}$/),
      EMAIL_OTP_TTL_MS,
    );
    await expect(
      service.consume('change-email', 'User@Example.com', otp),
    ).resolves.toBe(false);
    await expect(
      service.consume('reset-password', 'user@example.com', otp),
    ).resolves.toBe(true);
    await expect(
      service.consume('reset-password', 'user@example.com', otp),
    ).resolves.toBe(false);
  });
});
