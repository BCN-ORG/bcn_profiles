'use client';

import { AccountShell } from '@/components/layout/account-shell';
import { RequireAuth } from '@/components/auth/auth-provider';

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <AccountShell>{children}</AccountShell>
    </RequireAuth>
  );
}
