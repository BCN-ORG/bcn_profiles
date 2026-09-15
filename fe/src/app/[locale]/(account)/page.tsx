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
import { Button, PageHeader, StatusBadge } from '@/components/ui/primitives';
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
        eyebrow="BCN Account"
        title={t('title')}
        description={t('ready')}
      />

      <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-primary/12 via-card to-card">
        <CardContent className="flex flex-col gap-6 pt-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={user.status || 'ACTIVE'} />
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-primary uppercase">
                {t('identity')}
              </span>
            </div>
            <h2 className="max-w-[18ch] text-3xl font-semibold tracking-tight text-balance md:text-4xl">
              {t('hello', { name })}
            </h2>
            <p className="max-w-[42ch] text-sm leading-relaxed text-muted-foreground">
              {t('ready')}
            </p>
          </div>
          <Avatar size="lg" className="size-20 rounded-3xl after:rounded-3xl">
            {user.avatar ? <AvatarImage src={user.avatar} alt="" /> : null}
            <AvatarFallback className="rounded-3xl bg-primary/15 text-2xl font-semibold text-primary">
              {initials(user.fullName)}
            </AvatarFallback>
          </Avatar>
        </CardContent>
      </Card>

      <PageSection className="md:grid-cols-12">
        <Card className="md:col-span-7">
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <UserRound className="size-4 text-primary" aria-hidden />
                {tn('account')}
              </CardTitle>
              <CardDescription className="mt-1">{user.email}</CardDescription>
            </div>
            <StatusBadge status={user.role} />
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                {t('phoneLabel')} · {user.phone || '—'}
              </p>
              <p>
                {t('statusLabel')} · {label(user.status || 'ACTIVE')}
              </p>
            </div>
            <Button asChild variant="secondary">
              <Link href="/account">
                {tn('account')}
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <BadgeCheck className="size-4 text-primary" aria-hidden />
              {tn('membership')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-2xl font-semibold tracking-tight">
              {membership.isLoading
                ? '…'
                : membership.data?.eligible
                  ? tm('eligible')
                  : tm('notEligible')}
            </p>
            <p className="text-sm text-muted-foreground">
              {label(membership.data?.policy || 'ANY_TRUSTED_GROUP')}
            </p>
            <div className="flex flex-wrap gap-2">
              <StatusBadge
                status={membership.data?.sources.discord?.status || 'UNKNOWN'}
              />
              <StatusBadge
                status={membership.data?.sources.zalo?.status || 'UNKNOWN'}
              />
            </div>
            <Button asChild variant="ghost" className="px-0">
              <Link href="/membership">
                {tn('membership')}
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-3 md:col-span-12 md:grid-cols-3">
          {QUICK_LINKS.map(({ href, key, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-card transition-[transform,box-shadow] duration-200 ease-premium hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="flex-1 text-sm font-medium">{tn(key)}</span>
              <ArrowUpRight
                className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
            </Link>
          ))}
        </div>
      </PageSection>
    </PageShell>
  );
}
