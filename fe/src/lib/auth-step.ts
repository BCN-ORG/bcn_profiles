const AUTH_STEP_KEY = 'bcn.auth.loginStep';

export type StoredAuthStep =
  | { kind: 'verify'; token: string; method: 'totp' | 'email' | 'backup-code' }
  | { kind: 'setup'; token: string; secret?: string; qrCode?: string };

export function readAuthStep(): StoredAuthStep | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(AUTH_STEP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuthStep;
    if (
      (parsed.kind === 'verify' || parsed.kind === 'setup') &&
      typeof parsed.token === 'string' &&
      parsed.token
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function writeAuthStep(step: StoredAuthStep): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(AUTH_STEP_KEY, JSON.stringify(step));
  } catch {
    /* ignore */
  }
}

export function clearAuthStep(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(AUTH_STEP_KEY);
  } catch {
    /* ignore */
  }
}
