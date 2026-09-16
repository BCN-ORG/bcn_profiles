'use client';

import { useTranslations } from 'next-intl';
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
  ScrollText,
  Shield,
  User,
  Users,
} from 'lucide-react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { LocaleSwitcher, useAuth } from '@/components/auth/auth-provider';
import { ThemeToggle } from '@/components/theme/theme-provider';
import { Button } from '@/components/ui/primitives';
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

function currentTitle(pathname: string, t: (key: string) => string): string {
  const all = [...mainLinks, ...securityLinks, ...adminLinks];
  const match = all.find((item) => navActive(pathname, item.href));
  return match ? t(match.key) : t('overview');
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
                        'size-4 shrink-0 transition-colors',
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

export function AccountShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const pageTitle = currentTitle(pathname, t);
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
        <SidebarHeader className="gap-0 border-b border-sidebar-border px-3 py-4">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-1 py-0.5 outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground shadow-sm">
              <span className="text-sm tracking-tight">B</span>
            </span>
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

        <SidebarFooter className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2.5 rounded-lg p-1.5 transition-colors group-data-[collapsible=icon]:justify-center">
            <Avatar
              size="sm"
              className="size-9 shrink-0 rounded-lg after:rounded-lg"
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
                {user.fullName || 'BCN Member'}
              </strong>
              <small className="block truncate text-[11px] text-muted-foreground">
                {user.email}
              </small>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 rounded-lg text-muted-foreground group-data-[collapsible=icon]:hidden"
              onClick={() => void logout()}
              aria-label={tc('logout')}
              title={tc('logout')}
            >
              <LogOut className="size-4" aria-hidden />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset id="main-content" className="min-h-svh bg-background">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-md">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 md:px-8 lg:px-10">
            <SidebarTrigger className="size-9 rounded-lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold tracking-tight">
                {pageTitle}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <LocaleSwitcher />
              <Button
                variant="ghost"
                size="sm"
                className="hidden h-8 px-3 sm:inline-flex"
                onClick={() => void logout()}
              >
                <LogOut className="size-3.5" aria-hidden />
                {tc('logout')}
              </Button>
            </div>
          </div>
        </header>
        <div className="relative mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
