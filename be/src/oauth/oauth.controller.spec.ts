import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { authorizeErrorCode, OauthController } from './oauth.controller';

describe('OauthController authorize', () => {
  const previousFrontend = process.env.FRONTEND_URL;
  const previousIssuer = process.env.OAUTH_ISSUER;

  afterEach(() => {
    process.env.FRONTEND_URL = previousFrontend;
    process.env.OAUTH_ISSUER = previousIssuer;
  });

  function controller(overrides?: {
    session?: object | null;
    authorize?: jest.Mock;
    appName?: string | null;
  }) {
    const oauth = {
      authorize:
        overrides?.authorize ??
        jest.fn().mockResolvedValue({
          code: 'code-1',
          redirectUri: 'http://localhost:4000/api/auth/callback',
          state: 'state-1',
        }),
    };
    const sessions = {
      getSso: jest
        .fn()
        .mockResolvedValue(
          overrides?.session === undefined
            ? { userId: 'user-1' }
            : overrides.session,
        ),
    };
    const authorization = {
      findApplicationName: jest
        .fn()
        .mockResolvedValue(
          overrides?.appName === undefined ? 'BCN Quiz' : overrides.appName,
        ),
    };
    return new OauthController(
      oauth as never,
      sessions as never,
      {} as never,
      authorization as never,
    );
  }

  function response() {
    return { redirect: jest.fn(), json: jest.fn(), status: jest.fn() };
  }

  it('sends signed-in authorize errors with app context for any client', async () => {
    process.env.FRONTEND_URL = 'https://profiles.bcn.id.vn';
    process.env.OAUTH_ISSUER = 'https://profiles.bcn.id.vn/api';
    const out = response();
    await controller({
      authorize: jest.fn().mockRejectedValue(
        new ForbiddenException({
          code: 'APP_ACCESS_DENIED',
          message: 'Application access is denied',
        }),
      ),
    }).authorize(
      {
        client_id: 'bcn-quiz',
        redirect_uri: 'https://quizzes.bcn.id.vn/api/auth/callback',
        response_type: 'code',
        state: 'state',
        code_challenge: 'a'.repeat(43),
        code_challenge_method: 'S256',
      },
      {
        cookies: { bcn_sso: 'sso' },
        protocol: 'http',
        get: () => 'internal',
        originalUrl: '/api/oauth/authorize?client_id=bcn-quiz',
      } as never,
      out as never,
    );

    expect(out.redirect).toHaveBeenCalledWith(
      302,
      'https://profiles.bcn.id.vn/oauth/error?code=APP_ACCESS_DENIED&oauth_return=https%3A%2F%2Fprofiles.bcn.id.vn%2Fapi%2Foauth%2Fauthorize%3Fclient_id%3Dbcn-quiz&client_id=bcn-quiz&app_name=BCN+Quiz&app_return=https%3A%2F%2Fquizzes.bcn.id.vn',
    );
  });

  it('maps missing application to APPLICATION_NOT_FOUND', () => {
    expect(
      authorizeErrorCode(new NotFoundException('Application not found')),
    ).toBe('APPLICATION_NOT_FOUND');
  });

  it('redirects unsigned users to login with DB app name and app_return', async () => {
    process.env.FRONTEND_URL = 'https://profiles.bcn.id.vn';
    process.env.OAUTH_ISSUER = 'https://profiles.bcn.id.vn/api';
    const out = response();
    await controller({ session: null, appName: 'BCN Events' }).authorize(
      {
        client_id: 'bcn-event',
        redirect_uri: 'https://event.bcn.id.vn/api/auth/callback',
        response_type: 'code',
        state: 'state',
        code_challenge: 'a'.repeat(43),
        code_challenge_method: 'S256',
      },
      {
        cookies: {},
        protocol: 'http',
        get: () => 'internal',
        originalUrl:
          '/api/oauth/authorize?client_id=bcn-event&redirect_uri=https%3A%2F%2Fevent.bcn.id.vn%2Fapi%2Fauth%2Fcallback',
      } as never,
      out as never,
    );

    expect(out.redirect).toHaveBeenCalledWith(
      302,
      'https://profiles.bcn.id.vn/login?oauth_return=https%3A%2F%2Fprofiles.bcn.id.vn%2Fapi%2Foauth%2Fauthorize%3Fclient_id%3Dbcn-event%26redirect_uri%3Dhttps%253A%252F%252Fevent.bcn.id.vn%252Fapi%252Fauth%252Fcallback&client_id=bcn-event&app_name=BCN+Events&app_return=https%3A%2F%2Fevent.bcn.id.vn',
    );
  });
});
