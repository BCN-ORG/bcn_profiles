import type { CookieOptions, Request, Response } from 'express';
import { resolveCookieDomain } from './cookie-domain';

export function authBaseCookieOptions(req: Request): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    const domain = resolveCookieDomain(req);
    return {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      ...(domain ? { domain } : {}),
      path: '/',
    };
  }
  return {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
  };
}

export function accessTokenCookieOptions(req: Request): CookieOptions {
  return {
    ...authBaseCookieOptions(req),
    maxAge: 60 * 60 * 1000,
  };
}

export function refreshTokenCookieOptions(req: Request): CookieOptions {
  return {
    ...authBaseCookieOptions(req),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export function setAuthCookies(
  response: Response,
  req: Request,
  tokens: { access_token: string; refresh_token: string },
): void {
  response.cookie(
    'access_token',
    tokens.access_token,
    accessTokenCookieOptions(req),
  );
  response.cookie(
    'refresh_token',
    tokens.refresh_token,
    refreshTokenCookieOptions(req),
  );
}

export function clearAuthCookies(response: Response, req: Request): void {
  const options = authBaseCookieOptions(req);
  response.clearCookie('access_token', {
    path: options.path,
    domain: options.domain,
    secure: options.secure,
    sameSite: options.sameSite,
  });
  response.clearCookie('refresh_token', {
    path: options.path,
    domain: options.domain,
    secure: options.secure,
    sameSite: options.sameSite,
  });
}
