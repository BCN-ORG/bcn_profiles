'use client';

import { AccountShell } from '@/components/layout/account-shell';
import { RequireAuth, useAuth } from '@/components/auth/auth-provider';
import { useRouter } from '@/i18n/navigation';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isAdmin } from '@/lib/onboarding';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const managerRoute = pathname.endsWith('/admin/rbac');

  useEffect(() => {
    if (!isLoading && user && !isAdmin(user) && !managerRoute) {
      router.replace('/');
    }
  }, [isLoading, user, router, managerRoute]);

  if (!isLoading && user && !isAdmin(user) && !managerRoute) {
    return null;
  }

  return (
    <RequireAuth>
      <AccountShell>{children}</AccountShell>
    </RequireAuth>
  );
}
