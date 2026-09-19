import { readOauthHandoff } from '@/lib/oauth-handoff';

/** Resolve OAuth app label: URL app_name → handoff → client_id → fallback. */
export function oauthAppName(
  search: { get(name: string): string | null },
  fallback = 'ứng dụng này',
): string {
  const named =
    search.get('app_name')?.trim() || readOauthHandoff()?.appName?.trim();
  if (named) return named;
  const clientId =
    search.get('client_id')?.trim() || readOauthHandoff()?.clientId?.trim();
  if (clientId) return clientId;
  return fallback;
}
