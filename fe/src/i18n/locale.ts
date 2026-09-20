export const LOCALE_STORAGE_KEY = 'bcn-locale';
export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

export type StoredLocale = 'vi' | 'en';

export function isAppLocale(
  value: string | null | undefined,
): value is StoredLocale {
  return value === 'vi' || value === 'en';
}

/** Client: persist preference. Cookie is what middleware/SSR can read. */
export function setClientLocale(locale: StoredLocale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // ignore quota / private mode
  }
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=${maxAge}; samesite=lax`;
}
