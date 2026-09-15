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

function currentTitle(
  pathname: string,
  t: (key: string) => string,
): string {
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
                    'relative h-10 rounded-xl px-3 font-medium transition-[background,color,box-shadow] duration-200 ease-premium',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-primary/15'
                      : 'text-muted-foreground hover:text-foreground',
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
      <Sidebar
        collapsible="icon"
        className="border-r border-sidebar-border/80 bg-sidebar/90 backdrop-blur-xl"
      >
        <SidebarHeader className="gap-0 border-b border-sidebar-border/60 px-3 py-4">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-2xl px-1 py-0.5 outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground shadow-md shadow-primary/25">
              <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/25 to-transparent" />
              <span className="relative text-sm tracking-tight">B</span>
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
          ) : null}
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border/60 p-3">
          <div className="flex items-center gap-2.5 rounded-2xl bg-muted/40 p-2 ring-1 ring-border/50 transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1.5">
            <Avatar size="sm" className="size-9 shrink-0 rounded-xl after:rounded-xl">
              {user.avatar ? (
                <AvatarImage src={user.avatar} alt="" className="rounded-xl" />
              ) : null}
              <AvatarFallback className="rounded-xl bg-primary/12 text-xs font-semibold text-primary">
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

      <SidebarInset className="min-h-svh bg-transparent">
        <header className="sticky top-0 z-20 border-b border-border/50 bg-background/70 backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 md:px-8">
            <SidebarTrigger className="size-9 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold tracking-tight">
                {pageTitle}
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card/80 p-1 shadow-sm">
              <ThemeToggle />
              <LocaleSwitcher />
              <Button
                variant="ghost"
                size="sm"
                className="hidden h-8 rounded-full px-3 sm:inline-flex"
                onClick={() => void logout()}
              >
                <LogOut className="size-3.5" aria-hidden />
                {tc('logout')}
              </Button>
            </div>
          </div>
        </header>
        <div className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
