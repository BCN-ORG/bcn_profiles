'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { AppWindow, Lock, ShieldCheck } from 'lucide-react';
import { useStatusLabel } from '@/hooks/use-status-label';
import {
  EmptyState,
  PageHeader,
  Skeleton,
  StatusBadge,
} from '@/components/ui/primitives';
import { applicationService } from '@/services';
import { PageShell } from '@/components/layout/page-shell';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { UserApplication } from '@/types';

function AppMark({ code }: { code: string }) {
  return (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-sm font-bold tracking-tight text-primary ring-1 ring-primary/15">
      {code.slice(0, 2)}
    </span>
  );
}

function RolePills({
  roles,
  label,
  empty,
}: {
  roles: string[];
  label: (value: string) => string;
  empty: string;
}) {
  if (!roles.length) {
    return <span className="text-sm text-muted-foreground">{empty}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {roles.map((role) => (
        <span
          key={role}
          className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-foreground"
        >
          {label(role)}
        </span>
      ))}
    </div>
  );
}

function AppCard({
  app,
  label,
  rolesLabel,
  noRoles,
  activeHint,
  blockedHint,
}: {
  app: UserApplication;
  label: (value: string) => string;
  rolesLabel: string;
  noRoles: string;
  activeHint: string;
  blockedHint: string;
}) {
  const blocked = app.access === 'BLOCKED';
  return (
    <Card
      className={cn(
        'transition-[box-shadow,transform] duration-200 ease-premium hover:-translate-y-0.5 hover:shadow-md',
        blocked && 'opacity-80',
      )}
    >
      <CardHeader className="flex-row items-start gap-4 space-y-0">
        <AppMark code={app.code} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">{app.name}</CardTitle>
            <StatusBadge status={app.access} />
          </div>
          <CardDescription className="font-mono text-xs tracking-wide">
            {app.code}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {rolesLabel}
          </p>
          <RolePills roles={app.roles} label={label} empty={noRoles} />
        </div>
        {blocked ? (
          <p className="flex items-center gap-1.5 text-xs text-destructive">
            <Lock className="size-3.5" aria-hidden />
            {blockedHint}
          </p>
        ) : app.access === 'ACTIVE' ? (
          <p className="flex items-center gap-1.5 text-xs text-primary">
            <ShieldCheck className="size-3.5" aria-hidden />
            {activeHint}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function ApplicationsPage() {
  const t = useTranslations('applications');
  const label = useStatusLabel();
  const query = useQuery({
    queryKey: ['me', 'applications'],
    queryFn: applicationService.mine,
  });

  const apps = query.data ?? [];
  const stats = useMemo(() => {
    const active = apps.filter((a) => a.access === 'ACTIVE').length;
    const blocked = apps.filter((a) => a.access === 'BLOCKED').length;
    const pending = apps.filter((a) => a.access === 'PENDING').length;
    return { active, blocked, pending, total: apps.length };
  }, [apps]);

  return (
    <PageShell>
      <PageHeader title={t('title')} description={t('subtitle')} />

      {query.isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}

      {!query.isLoading && apps.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ['total', stats.total, t('statTotal')],
              ['active', stats.active, t('statActive')],
              ['blocked', stats.blocked, t('statBlocked')],
            ] as const
          ).map(([key, value, title]) => (
            <Card key={key} size="sm" className="shadow-none">
              <CardContent className="flex items-center gap-3 pt-1">
                <span className="flex size-9 items-center justify-center rounded-xl bg-muted">
                  <AppWindow className="size-4 text-muted-foreground" aria-hidden />
                </span>
                <div>
                  <p className="text-2xl font-semibold tracking-tight">{value}</p>
                  <p className="text-xs text-muted-foreground">{title}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {!query.isLoading && apps.length === 0 ? (
        <EmptyState title={t('empty')} description={t('emptyHint')} />
      ) : null}

      {!query.isLoading && apps.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {apps.map((app) => (
            <AppCard
              key={app.code}
              app={app}
              label={label}
              rolesLabel={t('roles')}
              noRoles={t('noRoles')}
              activeHint={t('activeHint')}
              blockedHint={t('blockedHint')}
            />
          ))}
        </div>
      ) : null}
    </PageShell>
  );
}
