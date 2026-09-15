import type { CookieOptions, Request, Response } from 'express';
import { resolveCookieDomain } from './cookie-domain';

const SSO_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function ssoCookieOptions(req: Request): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    const domain = resolveCookieDomain(req);
    return {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      ...(domain ? { domain } : {}),
      path: '/',
      maxAge: SSO_MAX_AGE_MS,
    };
  }
  return {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: SSO_MAX_AGE_MS,
  };
}

export function setSsoCookie(
  response: Response,
  req: Request,
  sid?: string,
): void {
  if (!sid) return;
  response.cookie('bcn_sso', sid, ssoCookieOptions(req));
}

export function clearSsoCookie(response: Response, req: Request): void {
  const options = ssoCookieOptions(req);
  response.clearCookie('bcn_sso', {
    path: options.path,
    domain: options.domain,
    secure: options.secure,
    sameSite: options.sameSite,
  });
}
