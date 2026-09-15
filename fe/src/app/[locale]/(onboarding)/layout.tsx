'use client';

import { useEffect, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
  RequireAuth,
  useAuth,
  LocaleSwitcher,
} from '@/components/auth/auth-provider';
import { ThemeToggle } from '@/components/theme/theme-provider';
import { usePathname, useRouter } from '@/i18n/navigation';
import { needsOnboarding } from '@/lib/onboarding';

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
    <main className="onboarding-page">
      <header className="onboarding-top">
        <div className="brand">
          <span className="logo-mark">B</span>
          <div>
            <strong>BCN</strong>
            <small>ACCOUNT</small>
          </div>
        </div>
        <div className="onboarding-tools">
          <ThemeToggle />
          <LocaleSwitcher />
        </div>
      </header>
      <p className="onboarding-hint muted">{t('guided')}</p>
      {children}
    </main>
  );
}
