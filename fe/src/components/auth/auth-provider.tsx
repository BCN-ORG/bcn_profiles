'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { authService } from '@/services';
import type { User } from '@/types';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { needsOnboarding, isOnboardingExemptPath } from '@/lib/onboarding';
import { Button, Skeleton } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

const AuthContext = createContext<{
  user: User | null | undefined;
  isLoading: boolean;
  refresh: () => Promise<unknown>;
  setUser: (user: User | null) => void;
  signOut: () => Promise<void>;
}>({
  user: undefined,
  isLoading: true,
  refresh: async () => undefined,
  setUser: () => undefined,
  signOut: async () => undefined,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['me'],
    queryFn: authService.me,
    retry: false,
    // Keep prior user across locale remounts while refetching.
    placeholderData: (previous) => previous,
  });

  async function signOut() {
    try {
      await authService.logout();
    } catch {
      // Clear local session even when the API call fails (network, expired cookie).
    }
    queryClient.setQueryData(['me'], null);
    queryClient.removeQueries({
      predicate: (q) => q.queryKey[0] === 'me',
    });
  }

  return (
    <AuthContext.Provider
      value={{
        user: query.data === undefined ? undefined : (query.data ?? null),
        isLoading: query.isLoading && query.data === undefined,
        refresh: query.refetch,
        setUser: (user) => queryClient.setQueryData(['me'], user),
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const t = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, user, router, pathname]);

  useEffect(() => {
    if (isLoading || !user) return;
    if (needsOnboarding(user) && !isOnboardingExemptPath(pathname)) {
      router.replace('/welcome');
    }
  }, [isLoading, user, pathname, router]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Skeleton className="size-8 rounded-full" />
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      </main>
    );
  }

  if (!user) return null;

  if (needsOnboarding(user) && !isOnboardingExemptPath(pathname)) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Skeleton className="size-8 rounded-full" />
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      </main>
    );
  }

  return <>{children}</>;
}

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const href = query ? `${pathname}?${query}` : pathname;

  return (
    <div className="inline-flex items-center gap-0.5">
      {(['vi', 'en'] as const).map((item) => (
        <Button
          key={item}
          asChild
          variant={locale === item ? 'secondary' : 'ghost'}
          size="sm"
          className={cn(
            'h-7 rounded-full px-2.5 text-[11px] font-semibold tracking-wide',
            locale === item && 'bg-primary/10 text-primary hover:bg-primary/15',
          )}
        >
          <Link href={href} locale={item}>
            {item.toUpperCase()}
          </Link>
        </Button>
      ))}
    </div>
  );
}
