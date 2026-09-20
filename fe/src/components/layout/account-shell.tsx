'use client';

import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  AppWindow,
  BadgeCheck,
  History,
  KeyRound,
  LayoutDashboard,
  Link2,
  LogOut,
  MonitorSmartphone,
  Moon,
  ScrollText,
  Shield,
  Sun,
  User,
  Users,
} from 'lucide-react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { useTheme } from '@/components/theme/theme-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { cn, initials } from '@/lib/utils';
import { isAdmin } from '@/lib/onboarding';
import { useQuery } from '@tanstack/react-query';
import { rbacService } from '@/services';
import type { LucideIcon } from 'lucide-react';
import { useTransition } from 'react';
import { setClientLocale, type StoredLocale } from '@/i18n/locale';

type NavItem = { href: string; key: string; icon: LucideIcon };

const mainLinks: NavItem[] = [
  { href: '/', key: 'overview', icon: LayoutDashboard },
  { href: '/account', key: 'account', icon: User },
  { href: '/connections', key: 'connections', icon: Link2 },
  { href: '/membership', key: 'membership', icon: BadgeCheck },
  { href: '/applications', key: 'applications', icon: AppWindow },
  { href: '/timeline', key: 'timeline', icon: History },
];

const securityLinks: NavItem[] = [
  { href: '/sessions', key: 'sessions', icon: MonitorSmartphone },
  { href: '/security', key: 'security', icon: KeyRound },
];

const adminLinks: NavItem[] = [
  { href: '/admin/users', key: 'adminUsers', icon: Users },
  { href: '/admin/rbac', key: 'adminRbac', icon: Shield },
  { href: '/admin/audit', key: 'adminAudit', icon: ScrollText },
];

function navActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavGroup({
  label,
  items,
  pathname,
  t,
}: {
  label?: string;
  items: NavItem[];
  pathname: string;
  t: (key: string) => string;
}) {
  return (
    <SidebarGroup className="px-2 py-1">
      {label ? (
        <SidebarGroupLabel className="mb-1 px-3 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground/80 uppercase">
          {label}
        </SidebarGroupLabel>
      ) : null}
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = navActive(pathname, item.href);
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  className={cn(
                    'relative h-10 rounded-lg px-3 font-medium transition-[background,color] duration-200 ease-premium',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground',
                  )}
                >
                  <Link href={item.href}>
                    {active ? (
                      <span
                        className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary"
                        aria-hidden
                      />
                    ) : null}
                    <Icon
                      className={cn(
                        'size-4 shrink-0 transition-colors group-data-[collapsible=icon]:size-5',
                        active ? 'text-primary' : 'text-muted-foreground',
                      )}
                      aria-hidden
                    />
                    <span>{t(item.key)}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function AccountUserMenu({
  name,
  email,
  avatar,
  onLogout,
}: {
  name: string;
  email: string;
  avatar?: string | null;
  onLogout: () => void;
}) {
  const tc = useTranslations('common');
  const { resolvedTheme, setTheme } = useTheme();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const isDark = resolvedTheme === 'dark';

  function switchLocale(next: StoredLocale) {
    if (next === locale || pending) return;
    setClientLocale(next);
    document.documentElement.lang = next;
    startTransition(() => {
      router.replace(
        `${pathname}${typeof window !== 'undefined' ? window.location.search : ''}`,
        { locale: next },
      );
      router.refresh();
    });
  }

  return (
    <div className="group relative">
      <button
        type="button"
        className="flex size-11 cursor-pointer items-center justify-center rounded-xl outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        aria-haspopup="menu"
        aria-label={name}
      >
        <Avatar size="lg" className="size-11 rounded-xl after:rounded-xl">
          {avatar ? (
            <AvatarImage src={avatar} alt="" className="rounded-xl" />
          ) : null}
          <AvatarFallback className="rounded-xl bg-primary/12 text-sm font-semibold text-primary">
            {initials(name)}
          </AvatarFallback>
        </Avatar>
      </button>

      <div
        role="menu"
        className={cn(
          'invisible absolute top-full right-0 z-50 w-56 pt-2 opacity-0 transition-[opacity,visibility] duration-150 ease-premium',
          'pointer-events-none group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100',
          'group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100',
        )}
      >
        <div className="overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-card ring-1 ring-foreground/5">
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>

          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
            >
              {isDark ? (
                <Sun className="size-4 text-primary" aria-hidden />
              ) : (
                <Moon className="size-4 text-primary" aria-hidden />
              )}
              {isDark ? tc('themeLight') : tc('themeDark')}
            </button>

            <div className="mt-1 rounded-lg px-2.5 py-2">
              <p className="mb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {tc('language')}
              </p>
              <div className="flex gap-1">
                {(['vi', 'en'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    disabled={pending}
                    className={cn(
                      'h-7 flex-1 cursor-pointer rounded-full text-[11px] font-semibold tracking-wide transition-colors',
                      locale === item
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                    onClick={() => switchLocale(item)}
                  >
                    {item.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-border p-1.5">
            <button
              type="button"
              role="menuitem"
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
              onClick={onLogout}
            >
              <LogOut className="size-4" aria-hidden />
              {tc('logout')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AccountShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const managedApps = useQuery({
    queryKey: ['admin', 'rbac', 'apps'],
    queryFn: () => rbacService.listApps(),
    enabled: Boolean(user),
  });

  if (!user) return null;

  async function logout() {
    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
    }
  }

  const displayName = user.fullName || 'BCN Member';

  return (
    <SidebarProvider>
      <a
        href="#main-content"
        className="fixed top-3 left-3 z-50 -translate-y-20 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg transition-transform focus:translate-y-0"
      >
        {tc('skipContent')}
      </a>
      <Sidebar
        collapsible="icon"
        className="border-r border-sidebar-border bg-sidebar"
      >
        <SidebarHeader className="h-16 justify-center gap-0 overflow-visible border-b border-sidebar-border px-3 py-0 group-data-[collapsible=icon]:px-1.5">
          <Link
            href="/"
            className="flex h-full items-center gap-3 rounded-lg px-1 outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/bcn-card-back.webp"
              alt="BCN"
              width={40}
              height={40}
              className="size-10 shrink-0 rounded-lg object-cover ring-1 ring-border/80"
            />
            <div className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
              <strong className="block truncate text-sm font-semibold tracking-tight">
                BCN Account
              </strong>
              <small className="block truncate text-[11px] text-muted-foreground">
                Identity Center
              </small>
            </div>
          </Link>
        </SidebarHeader>

        <SidebarContent className="gap-1 py-3">
          <NavGroup items={mainLinks} pathname={pathname} t={t} />
          <NavGroup
            label={t('sectionSecurity')}
            items={securityLinks}
            pathname={pathname}
            t={t}
          />
          {isAdmin(user) ? (
            <NavGroup
              label={t('admin')}
              items={adminLinks}
              pathname={pathname}
              t={t}
            />
          ) : managedApps.data?.length ? (
            <NavGroup
              label={t('admin')}
              items={[adminLinks[1]]}
              pathname={pathname}
              t={t}
            />
          ) : null}
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-3 group-data-[collapsible=icon]:p-2">
          <div className="flex items-center gap-2.5 rounded-lg p-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
            <Avatar
              size="sm"
              className="size-9 shrink-0 rounded-lg after:rounded-lg group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:after:rounded-xl"
            >
              {user.avatar ? (
                <AvatarImage src={user.avatar} alt="" className="rounded-lg" />
              ) : null}
              <AvatarFallback className="rounded-lg bg-primary/12 text-xs font-semibold text-primary">
                {initials(user.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <strong className="block truncate text-sm font-medium">
                {displayName}
              </strong>
              <small className="block truncate text-[11px] text-muted-foreground">
                {user.email}
              </small>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset id="main-content" className="min-h-svh bg-background">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-md">
          <div className="flex h-16 w-full items-center justify-between gap-3 px-4 md:px-6 lg:px-8">
            <SidebarTrigger className="size-9 rounded-lg" />
            <AccountUserMenu
              name={displayName}
              email={user.email}
              avatar={user.avatar}
              onLogout={() => void logout()}
            />
          </div>
        </header>
        <div className="relative mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
