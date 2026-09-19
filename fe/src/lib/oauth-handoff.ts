const HANDOFF_KEY = 'bcn.oauth.handoff';
const TTL_MS = 15 * 60 * 1000;

export type OauthHandoff = {
  oauthReturn: string;
  clientId?: string;
  appName?: string;
  appReturn?: string;
  savedAt: number;
};

/** Only resume authorize URLs issued by Profiles OAuth. */
export function isOauthAuthorizeReturn(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    return /\/oauth\/authorize\/?$/.test(url.pathname) || url.pathname.includes('/oauth/authorize');
  } catch {
    return false;
  }
}

export function readOauthHandoff(): OauthHandoff | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OauthHandoff;
    if (
      !parsed?.oauthReturn ||
      !isOauthAuthorizeReturn(parsed.oauthReturn) ||
      typeof parsed.savedAt !== 'number' ||
      Date.now() - parsed.savedAt > TTL_MS
    ) {
      sessionStorage.removeItem(HANDOFF_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeOauthHandoff(input: {
  oauthReturn: string;
  clientId?: string | null;
  appName?: string | null;
  appReturn?: string | null;
}): void {
  if (typeof window === 'undefined') return;
  if (!isOauthAuthorizeReturn(input.oauthReturn)) return;
  try {
    const value: OauthHandoff = {
      oauthReturn: input.oauthReturn,
      savedAt: Date.now(),
      ...(input.clientId?.trim()
        ? { clientId: input.clientId.trim() }
        : {}),
      ...(input.appName?.trim() ? { appName: input.appName.trim() } : {}),
      ...(input.appReturn?.trim()
        ? { appReturn: input.appReturn.trim() }
        : {}),
    };
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function clearOauthHandoff(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(HANDOFF_KEY);
  } catch {
    /* ignore */
  }
}

/** Read + clear. Returns authorize URL to resume, or null. */
export function takeOauthReturn(): string | null {
  const handoff = readOauthHandoff();
  clearOauthHandoff();
  return handoff?.oauthReturn ?? null;
}

export function resolveOauthReturn(
  fromQuery: string | null | undefined,
): string | null {
  if (fromQuery && isOauthAuthorizeReturn(fromQuery)) return fromQuery;
  return readOauthHandoff()?.oauthReturn ?? null;
}
