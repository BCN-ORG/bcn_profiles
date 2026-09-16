'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { CalendarDays, ShieldCheck } from 'lucide-react';
import { EmptyState, PageHeader } from '@/components/ui/primitives';
import { formatDate } from '@/lib/utils';
import { timelineService } from '@/services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageShell } from '@/components/layout/page-shell';

export default function TimelinePage() {
  const t = useTranslations('timeline');
  const tc = useTranslations('common');
  const query = useQuery({
    queryKey: ['me', 'timeline'],
    queryFn: () => timelineService.mine(),
  });

  return (
    <PageShell>
      <PageHeader title={t('title')} description={t('subtitle')} />
      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
        <ShieldCheck
          className="mt-0.5 size-5 shrink-0 text-primary"
          aria-hidden
        />
        <div>
          <p className="font-medium">{t('officialTitle')}</p>
          <p className="mt-1 leading-6 text-muted-foreground">
            {t('officialHint')}
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t('historyTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {tc('loading')}
            </p>
          ) : (query.data?.length ?? 0) === 0 ? (
            <EmptyState title={t('empty')} description={t('emptyHint')} />
          ) : (
            <ol className="relative ml-3 border-l border-border">
              {query.data?.map((item) => (
                <li key={item.id} className="relative pb-8 pl-8 last:pb-0">
                  <span className="absolute -left-4 top-0 flex size-8 items-center justify-center rounded-full border border-primary/20 bg-card text-primary shadow-sm">
                    <CalendarDays className="size-4" aria-hidden />
                  </span>
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="mt-1 text-xs font-medium text-primary">
                          {t(`events.${item.eventType}`)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t('recordedBy', {
                            app: item.sourceApp || t('sourceAdmin'),
                          })}
                        </p>
                      </div>
                      <time className="text-xs text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </time>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
