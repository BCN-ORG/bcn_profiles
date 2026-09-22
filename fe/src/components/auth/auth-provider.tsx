'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { authService } from '@/services';
import type { User } from '@/types';
import { usePathname, useRouter } from '@/i18n/navigation';
import { needsOnboarding, isOnboardingExemptPath } from '@/lib/onboarding';
import {
  clearOauthHandoff,
  readOauthHandoff,
  takeOauthReturn,
} from '@/lib/oauth-handoff';
import { Skeleton } from '@/components/ui/primitives';

export { LocaleSwitcher } from '@/components/i18n/locale-controls';

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

/** After social login: block Profiles chrome until authorize resume finishes. */
function OauthHandoffResume({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const [blocking, setBlocking] = useState(
    () =>
      typeof window !== 'undefined' &&
      Boolean(readOauthHandoff()) &&
      !window.location.pathname.includes('/login'),
  );

  useEffect(() => {
    if (!readOauthHandoff()) {
      setBlocking(false);
      return;
    }
    if (pathname.startsWith('/login')) {
      setBlocking(false);
      return;
    }
    if (isLoading) {
      setBlocking(true);
      return;
    }
    if (user && !needsOnboarding(user)) {
      setBlocking(true);
      const resume = takeOauthReturn();
      if (resume) {
        window.location.replace(resume);
        return;
      }
    }
    setBlocking(false);
  }, [isLoading, user, pathname]);

  if (blocking) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Skeleton className="size-8 rounded-full" />
      </main>
    );
  }

  return <>{children}</>;
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
    clearOauthHandoff();
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
      <OauthHandoffResume>{children}</OauthHandoffResume>
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
