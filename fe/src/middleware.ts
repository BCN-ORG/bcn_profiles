import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Unprefixed paths only — locale lives in cookie / localStorage, not the URL.
  matcher: ['/', '/((?!_next|_vercel|.*\\..*).*)'],
};
