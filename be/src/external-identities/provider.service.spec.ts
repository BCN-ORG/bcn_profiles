import { createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { ExternalProviderService } from './provider.service';

describe('ExternalProviderService', () => {
  it('builds a Zalo authorization URL with PKCE challenge', () => {
    const config = {
      get: (key: string) =>
        ({
          ZALO_CLIENT_ID: '123456',
          ZALO_CLIENT_SECRET: 'secret',
          ZALO_REDIRECT_URI:
            'https://profiles.bcn.id.vn/api/auth/social/zalo/callback',
        })[key],
    };
    const service = new ExternalProviderService(config as ConfigService);
    const verifier = 'a'.repeat(21) + 'A'.repeat(11) + '1'.repeat(11);
    const url = new URL(
      service.authorizationUrl('ZALO', 'csrf-state', verifier),
    );
    expect(url.origin + url.pathname).toBe(
      'https://oauth.zaloapp.com/v4/permission',
    );
    expect(url.searchParams.get('app_id')).toBe('123456');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://profiles.bcn.id.vn/api/auth/social/zalo/callback',
    );
    expect(url.searchParams.get('state')).toBe('csrf-state');
    expect(url.searchParams.get('code_challenge')).toBe(
      createHash('sha256').update(verifier).digest('base64url'),
    );
    expect(url.searchParams.get('client_id')).toBeNull();
    expect(url.searchParams.get('response_type')).toBeNull();
  });
});
