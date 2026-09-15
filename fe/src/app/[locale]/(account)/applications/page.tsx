'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { EmptyState, PageHeader, StatusBadge } from '@/components/ui/primitives';
import { applicationService } from '@/services';

export default function ApplicationsPage() {
  const t = useTranslations('applications');
  const query = useQuery({
    queryKey: ['me', 'applications'],
    queryFn: applicationService.mine,
  });

  return (
    <div className="stack">
      <PageHeader title={t('title')} description={t('subtitle')} />
      {query.isLoading ? <div className="skeleton" style={{ height: 120 }} /> : null}
      {!query.isLoading && (!query.data || query.data.length === 0) ? (
        <EmptyState title={t('empty')} />
      ) : (
        <section className="grid two">
          {query.data?.map((app) => (
            <article className="card" key={app.code}>
              <div className="provider-head">
                <div>
                  <h3>{app.name}</h3>
                  <p className="muted">{app.code}</p>
                </div>
                <StatusBadge status={app.access} />
              </div>
              <p>
                {t('roles')}: {app.roles.length ? app.roles.join(', ') : '—'}
              </p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
