'use client';

import { useEffect, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
  RequireAuth,
  useAuth,
  LocaleSwitcher,
} from '@/components/auth/auth-provider';
import { ThemeToggle } from '@/components/theme/theme-provider';
import { OnboardingSteps } from '@/components/layout/onboarding-steps';
import { usePathname, useRouter } from '@/i18n/navigation';
import { needsOnboarding } from '@/lib/onboarding';

function stepFromPath(pathname: string) {
  if (pathname.includes('/ready')) return 4;
  if (pathname.includes('/optional')) return 3;
  if (pathname.includes('/discord')) return 2;
  return 1;
}

export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RequireAuth>
      <OnboardingShell>{children}</OnboardingShell>
    </RequireAuth>
  );
}

function OnboardingShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('welcome');

  useEffect(() => {
    if (!user) return;
    if (!needsOnboarding(user) && !pathname.startsWith('/welcome/ready')) {
      router.replace('/');
    }
  }, [user, pathname, router]);

  if (!user) return null;

  return (
    <main className="auth-canvas min-h-[100dvh]">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/50 bg-background/70 px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-md shadow-primary/20">
            B
          </span>
          <div className="leading-tight">
            <strong className="block text-sm tracking-tight">BCN</strong>
            <small className="text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
              Onboarding
            </small>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <LocaleSwitcher />
        </div>
      </header>
      <div className="animate-enter mx-auto max-w-lg px-6 py-10 pb-20">
        <p className="mb-6 text-center text-sm text-muted-foreground">
          {t('guided')}
        </p>
        <OnboardingSteps current={stepFromPath(pathname)} total={4} />
        {children}
      </div>
    </main>
  );
}
