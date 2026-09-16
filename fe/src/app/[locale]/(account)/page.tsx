'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  ArrowUpRight,
  BadgeCheck,
  History,
  Link2,
  Shield,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { PageShell, PageSection } from '@/components/layout/page-shell';
import { useStatusLabel } from '@/hooks/use-status-label';
import {
  Button,
  PageHeader,
  Skeleton,
  StatusBadge,
} from '@/components/ui/primitives';
import { initials } from '@/lib/utils';
import { membershipService } from '@/services';
import { Link } from '@/i18n/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const QUICK_LINKS = [
  { href: '/connections', key: 'connections', icon: Link2 },
  { href: '/timeline', key: 'timeline', icon: History },
  { href: '/security', key: 'security', icon: Shield },
] as const;

export default function OverviewPage() {
  const t = useTranslations('overview');
  const tc = useTranslations('common');
  const tn = useTranslations('nav');
  const tm = useTranslations('membership');
  const label = useStatusLabel();
  const { user } = useAuth();
  const membership = useQuery({
    queryKey: ['me', 'membership'],
    queryFn: membershipService.get,
  });

  if (!user) return null;
  const name = user.fullName?.split(' ').at(-1) || 'bạn';

  return (
    <PageShell>
      <PageHeader
        title={t('title')}
        description={t('ready')}
      />

      <Card className="relative overflow-hidden border-primary/20 shadow-none before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-primary">
        <CardContent className="grid gap-8 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={user.status || 'ACTIVE'} />
              <span className="text-xs font-medium text-muted-foreground">
                {t('identity')}
              </span>
            </div>
            <h2 className="max-w-[20ch] text-3xl font-semibold tracking-[-0.03em] text-balance md:text-4xl">
              {t('hello', { name })}
            </h2>
            <p className="max-w-[42ch] text-sm leading-relaxed text-muted-foreground">
              {t('ready')}
            </p>
          </div>
          <Avatar size="lg" className="size-20 rounded-xl after:rounded-xl sm:size-24">
            {user.avatar ? <AvatarImage src={user.avatar} alt="" /> : null}
            <AvatarFallback className="rounded-xl bg-primary/10 text-2xl font-semibold text-primary">
              {initials(user.fullName)}
            </AvatarFallback>
          </Avatar>
        </CardContent>
      </Card>

      <PageSection className="md:grid-cols-12">
        <Card className="md:col-span-7">
          <CardHeader className="flex-row items-start justify-between gap-3 border-b border-border pb-5">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <UserRound className="size-4 text-primary" aria-hidden />
                {tn('account')}
              </CardTitle>
              <CardDescription className="mt-1">{user.email}</CardDescription>
            </div>
            <StatusBadge status={user.role} />
          </CardHeader>
          <CardContent className="flex flex-wrap items-end justify-between gap-5">
            <div className="grid min-w-[16rem] flex-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t('phoneLabel')}
                </p>
                <p className="mt-1 font-medium">{user.phone || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t('statusLabel')}
                </p>
                <p className="mt-1 font-medium">
                  {label(user.status || 'ACTIVE')}
                </p>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link href="/account">
                {tn('account')}
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-5">
          <CardHeader className="border-b border-border pb-5">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <BadgeCheck className="size-4 text-primary" aria-hidden />
              {tn('membership')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {membership.isLoading ? (
              <div className="space-y-4" aria-label={tc('loading')}>
                <Skeleton className="h-8 w-36" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-6 w-40" />
              </div>
            ) : membership.isError ? (
              <p className="text-sm font-medium text-destructive" role="alert">
                {tc('error')}
              </p>
            ) : (
              <>
                <p className="text-2xl font-semibold tracking-tight">
                  {membership.data?.eligible
                    ? tm('eligible')
                    : tm('notEligible')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {label(membership.data?.policy || 'ANY_TRUSTED_GROUP')}
                </p>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge
                    status={
                      membership.data?.sources.discord?.status || 'UNKNOWN'
                    }
                  />
                  <StatusBadge
                    status={membership.data?.sources.zalo?.status || 'UNKNOWN'}
                  />
                </div>
              </>
            )}
            <Button asChild variant="link" className="h-auto px-0">
              <Link href="/membership">
                {tn('membership')}
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0 shadow-none md:col-span-12">
          <nav
            className="grid divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0"
            aria-label={t('quickLinks')}
          >
            {QUICK_LINKS.map(({ href, key, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex min-h-20 items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <span className="flex size-9 items-center justify-center rounded-lg border border-primary/15 bg-primary/8 text-primary">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="flex-1 text-sm font-medium">{tn(key)}</span>
                <ArrowUpRight
                  className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden
                />
              </Link>
            ))}
          </nav>
        </Card>
      </PageSection>
    </PageShell>
  );
}
