import {
  buildAuthorizeReturnUrl,
  sanitizeOauthReturnTo,
  safeAppOrigin,
} from './oauth-return.util';

describe('oauth-return.util', () => {
  const previous = {
    APP_URL: process.env.APP_URL,
    OAUTH_ISSUER: process.env.OAUTH_ISSUER,
  };

  afterEach(() => {
    process.env.APP_URL = previous.APP_URL;
    process.env.OAUTH_ISSUER = previous.OAUTH_ISSUER;
  });

  it('builds authorize return from issuer origin (ignores proxy protocol)', () => {
    expect(
      buildAuthorizeReturnUrl(
        'https://profiles.bcn.id.vn/api',
        '/api/oauth/authorize?client_id=bcn-judge',
      ),
    ).toBe(
      'https://profiles.bcn.id.vn/api/oauth/authorize?client_id=bcn-judge',
    );
  });

  it('accepts returnTo for any client_id on the issuer host', () => {
    process.env.OAUTH_ISSUER = 'https://profiles.bcn.id.vn/api';
    expect(
      sanitizeOauthReturnTo(
        'https://profiles.bcn.id.vn/api/oauth/authorize?client_id=bcn-attendance&redirect_uri=https%3A%2F%2Fattendance.bcn.id.vn%2Fcallback',
      ),
    ).toContain('client_id=bcn-attendance');
  });

  it('rejects returnTo to a foreign host', () => {
    process.env.OAUTH_ISSUER = 'https://profiles.bcn.id.vn/api';
    expect(
      sanitizeOauthReturnTo(
        'https://evil.example/api/oauth/authorize?client_id=x',
      ),
    ).toBeUndefined();
  });

  it('extracts app origin from any client redirect_uri', () => {
    expect(safeAppOrigin('https://event.bcn.id.vn/api/auth/callback?x=1')).toBe(
      'https://event.bcn.id.vn',
    );
  });
});
