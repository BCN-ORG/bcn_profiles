import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { OauthTokenService } from './oauth-token.service';

describe('OauthTokenService', () => {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        NODE_ENV: 'test',
        OAUTH_ISSUER: 'https://profiles.bcn.id.vn',
        OAUTH_ACCESS_TOKEN_TTL_SECONDS: '900',
        JWT_RS256_KID: 'test-key',
      };
      return values[key];
    }),
  } as unknown as ConfigService;

  it('issues a minimal RS256 access token and enforces audience', () => {
    const service = new OauthTokenService(config);
    const token = service.issue('user-1', 'quiz', 'session-1');
    const payload = service.validate(token, 'quiz');

    expect(Object.keys(payload).sort()).toEqual(
      ['aud', 'exp', 'iat', 'iss', 'sid', 'sub'].sort(),
    );
    expect(payload).toMatchObject({
      iss: 'https://profiles.bcn.id.vn',
      sub: 'user-1',
      aud: 'quiz',
      sid: 'session-1',
    });
    expect(() => service.validate(token, 'event')).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a tampered token and exposes only the public RSA key', () => {
    const service = new OauthTokenService(config);
    const token = service.issue('user-1', 'quiz', 'session-1');
    const parts = token.split('.');
    parts[1] = Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(parts[1], 'base64url').toString()),
        sub: 'attacker',
      }),
    ).toString('base64url');

    expect(() => service.validate(parts.join('.'))).toThrow(
      UnauthorizedException,
    );
    expect(service.jwks().keys[0]).not.toHaveProperty('d');
    expect(service.jwks().keys[0]).toMatchObject({
      alg: 'RS256',
      use: 'sig',
      kid: 'test-key',
    });
  });
});
