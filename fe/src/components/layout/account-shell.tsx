'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { LocaleSwitcher, useAuth } from '@/components/auth/auth-provider';
import { ThemeToggle } from '@/components/theme/theme-provider';
import { Button } from '@/components/ui/primitives';
import { initials } from '@/lib/utils';
import { authService } from '@/services';

const userLinks = [
  { href: '/', key: 'overview' },
  { href: '/account', key: 'account' },
  { href: '/connections', key: 'connections' },
  { href: '/membership', key: 'membership' },
  { href: '/applications', key: 'applications' },
  { href: '/sessions', key: 'sessions' },
  { href: '/security', key: 'security' },
] as const;

export function AccountShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const { user, refresh } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  async function logout() {
    try {
      await authService.logout();
      await refresh();
      router.replace('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
    }
  }

  const nav = (
    <nav className="side-nav">
      {userLinks.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={pathname === item.href ? 'nav active' : 'nav'}
          onClick={() => setOpen(false)}
        >
          {t(item.key)}
        </Link>
      ))}
      {user.role === 'ADMIN' ? (
        <>
          <div className="nav-section">{t('admin')}</div>
          <Link
            href="/admin/users"
            className={pathname.startsWith('/admin/users') ? 'nav active' : 'nav'}
            onClick={() => setOpen(false)}
          >
            {t('adminUsers')}
          </Link>
          <Link
            href="/admin/audit"
            className={pathname.startsWith('/admin/audit') ? 'nav active' : 'nav'}
            onClick={() => setOpen(false)}
          >
            {t('adminAudit')}
          </Link>
        </>
      ) : null}
    </nav>
  );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <span className="logo-mark">B</span>
          <div>
            <strong>BCN</strong>
            <small>ACCOUNT</small>
          </div>
        </div>
        {nav}
        <div className="sidebar-user">
          <span className="avatar fallback">{initials(user.fullName)}</span>
          <div>
            <strong>{user.fullName || 'BCN Member'}</strong>
            <small>{user.email}</small>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <div className="topbar">
          <button className="menu-toggle" type="button" onClick={() => setOpen((v) => !v)}>
            Menu
          </button>
          <ThemeToggle />
          <LocaleSwitcher />
          <Button variant="ghost" onClick={() => void logout()}>
            {tc('logout')}
          </Button>
        </div>
        {children}
      </div>
      {open ? <button className="backdrop" type="button" aria-label="Close" onClick={() => setOpen(false)} /> : null}
    </div>
  );
}
