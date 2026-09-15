'use client';

import { AccountShell } from '@/components/layout/account-shell';
import { RequireAuth, useAuth } from '@/components/auth/auth-provider';
import { useRouter } from '@/i18n/navigation';
import { useEffect } from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && user.role !== 'ADMIN') {
      router.replace('/');
    }
  }, [isLoading, user, router]);

  return (
    <RequireAuth>
      <AccountShell>{children}</AccountShell>
    </RequireAuth>
  );
}
