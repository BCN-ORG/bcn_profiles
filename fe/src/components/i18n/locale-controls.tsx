'use client';

import { useEffect, useRef, useTransition } from 'react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import {
  isAppLocale,
  LOCALE_STORAGE_KEY,
  setClientLocale,
  type StoredLocale,
} from '@/i18n/locale';
import { Button } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

function hrefWithSearch(pathname: string) {
  if (typeof window === 'undefined') return pathname;
  return `${pathname}${window.location.search}`;
}

/** Soft-apply locale from localStorage when SSR cookie was stale (no full reload). */
export function LocaleBootstrap() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const ran = useRef(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    } catch {
      return;
    }
    if (!isAppLocale(stored) || stored === locale) return;
    setClientLocale(stored);
    document.documentElement.lang = stored;
    startTransition(() => {
      router.replace(hrefWithSearch(pathname), { locale: stored });
      router.refresh();
    });
  }, [locale, pathname, router]);

  return null;
}

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function switchLocale(next: StoredLocale) {
    if (next === locale || pending) return;
    setClientLocale(next);
    document.documentElement.lang = next;
    startTransition(() => {
      router.replace(hrefWithSearch(pathname), { locale: next });
      router.refresh();
    });
  }

  return (
    <div className="inline-flex items-center gap-0.5">
      {(['vi', 'en'] as const).map((item) => (
        <Button
          key={item}
          type="button"
          variant={locale === item ? 'secondary' : 'ghost'}
          size="sm"
          disabled={pending}
          className={cn(
            'h-7 rounded-full px-2.5 text-[11px] font-semibold tracking-wide',
            locale === item && 'bg-primary/10 text-primary hover:bg-primary/15',
          )}
          onClick={() => switchLocale(item)}
        >
          {item.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
