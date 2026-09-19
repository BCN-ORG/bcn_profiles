/**
 * Shared OAuth handoff helpers — app-agnostic (Quiz, Event, Judge, …).
 * returnTo is always Profiles authorize; app_return is the client origin.
 */

export function sanitizeOauthReturnTo(
  raw: string | undefined | null,
): string | undefined {
  if (!raw?.trim()) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    if (!url.pathname.includes('/oauth/authorize')) return undefined;
    const allowedHosts = oauthIssuerHosts();
    if (allowedHosts.length > 0 && !allowedHosts.includes(url.host)) {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

/** Prefer issuer origin so oauth_return stays correct behind reverse proxies. */
export function buildAuthorizeReturnUrl(
  issuer: string,
  originalUrl: string,
): string {
  const base = new URL(issuer);
  const path = originalUrl.startsWith('/') ? originalUrl : `/${originalUrl}`;
  return `${base.origin}${path}`;
}

/** Origin of the OAuth client redirect_uri — “back to app” only. */
export function safeAppOrigin(redirectUri: string | undefined): string | null {
  if (!redirectUri?.trim()) return null;
  try {
    const url = new URL(redirectUri);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function appendOauthAppParams(
  url: URL,
  clientId: string | undefined,
  appName: string | null,
  appReturn?: string | null,
) {
  if (clientId) url.searchParams.set('client_id', clientId);
  if (appName) url.searchParams.set('app_name', appName);
  if (appReturn) url.searchParams.set('app_return', appReturn);
}

function oauthIssuerHosts(): string[] {
  return [
    process.env.APP_URL,
    process.env.OAUTH_ISSUER,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]
    .filter(Boolean)
    .map((value) => {
      try {
        return new URL(value as string).host;
      } catch {
        return null;
      }
    })
    .filter((host): host is string => Boolean(host));
}
