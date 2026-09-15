'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { authService } from '@/services';
import type { User } from '@/types';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { needsOnboarding } from '@/lib/onboarding';

const AuthContext = createContext<{
  user: User | null | undefined;
  isLoading: boolean;
  refresh: () => Promise<unknown>;
  setUser: (user: User | null) => void;
}>({
  user: undefined,
  isLoading: true,
  refresh: async () => undefined,
  setUser: () => undefined,
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
  });

  return (
    <AuthContext.Provider
      value={{
        user: query.data ?? null,
        isLoading: query.isLoading,
        refresh: query.refetch,
        setUser: (user) => queryClient.setQueryData(['me'], user),
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
    const onWelcome = pathname.startsWith('/welcome');
    if (needsOnboarding(user) && !onWelcome) {
      router.replace('/welcome');
    }
  }, [isLoading, user, pathname, router]);

  if (isLoading) {
    return (
      <main className="center-screen">
        <div className="loader" />
        <p>{t('loading')}</p>
      </main>
    );
  }

  if (!user) return null;

  if (needsOnboarding(user) && !pathname.startsWith('/welcome')) {
    return (
      <main className="center-screen">
        <div className="loader" />
        <p>{t('loading')}</p>
      </main>
    );
  }

  return <>{children}</>;
}

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <div className="locale-switch">
      {(['vi', 'en'] as const).map((item) => (
        <Link
          key={item}
          href={pathname}
          locale={item}
          className={locale === item ? 'active' : ''}
        >
          {item.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
