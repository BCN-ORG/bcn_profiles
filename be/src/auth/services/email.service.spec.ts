import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService', () => {
  const config = (values: Record<string, string>) =>
    ({ get: (key: string) => values[key] }) as ConfigService;
  beforeEach(() => jest.clearAllMocks());

  it('escapes user-controlled names before sending HTML', async () => {
    const service = new EmailService(
      config({
        RESEND_API_KEY: 're_test',
        EMAIL_FROM: 'BCN <noreply@example.test>',
        FRONTEND_URL: 'https://profiles.example.test',
      }),
    );
    const send = jest.fn().mockResolvedValue({ data: { id: 'mail-1' } });
    (
      service as unknown as {
        resend: { emails: { send: typeof send } };
      }
    ).resend = { emails: { send } };

    await service.sendApprovalEmail(
      'user@example.test',
      '</b><img src=x onerror=alert(1)>',
    );

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining(
          '&lt;/b&gt;&lt;img src&#x3D;x onerror&#x3D;alert(1)&gt;',
        ),
      }),
      expect.objectContaining({
        idempotencyKey: expect.stringMatching(/^approval-email-/),
      }),
    );
  });

  it('requires complete mail configuration in production', () => {
    expect(
      () =>
        new EmailService(
          config({
            NODE_ENV: 'production',
            RESEND_API_KEY: 're_test',
            FRONTEND_URL: 'https://profiles.example.test',
          }),
        ),
    ).toThrow('EMAIL_FROM environment variable is required');
  });
});
