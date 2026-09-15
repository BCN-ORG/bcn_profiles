'use client';

import { AccountShell } from '@/components/layout/account-shell';
import { RequireAuth, useAuth } from '@/components/auth/auth-provider';
import { useRouter } from '@/i18n/navigation';
import { useEffect } from 'react';
import { isAdmin } from '@/lib/onboarding';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && !isAdmin(user)) {
      router.replace('/');
    }
  }, [isLoading, user, router]);

  if (!isLoading && user && !isAdmin(user)) {
    return null;
  }

  return (
    <RequireAuth>
      <AccountShell>{children}</AccountShell>
    </RequireAuth>
  );
}
