'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/ui/primitives';
import { formatDate } from '@/lib/utils';
import { auditService } from '@/services';

export default function AdminAuditPage() {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const query = useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: () => auditService.list({ limit: 50 }),
  });

  return (
    <div className="stack">
      <PageHeader title={t('auditTitle')} />
      <section className="table-card">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>User</th>
              <th>App</th>
              <th>Provider</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td colSpan={5}>{tc('loading')}</td>
              </tr>
            ) : (
              query.data?.data.map((item) => (
                <tr key={item.id}>
                  <td>{item.eventType}</td>
                  <td>{item.userId || '—'}</td>
                  <td>{item.applicationCode || '—'}</td>
                  <td>{item.provider || '—'}</td>
                  <td>{formatDate(item.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
