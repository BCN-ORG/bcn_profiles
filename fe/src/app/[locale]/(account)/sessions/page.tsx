'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button, EmptyState, PageHeader, StatusBadge } from '@/components/ui/primitives';
import { formatDate } from '@/lib/utils';
import { sessionService } from '@/services';

export default function SessionsPage() {
  const t = useTranslations('sessions');
  const tc = useTranslations('common');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['me', 'sessions'],
    queryFn: sessionService.list,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['me', 'sessions'] });

  const revoke = useMutation({
    mutationFn: sessionService.revoke,
    onSuccess: async () => {
      await invalidate();
      toast.success(t('revoked'));
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const revokeOthers = useMutation({
    mutationFn: sessionService.revokeOthers,
    onSuccess: async (result) => {
      await invalidate();
      toast.success(`${t('revoked')} (${result.revoked})`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="stack">
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          <Button
            variant="secondary"
            disabled={revokeOthers.isPending}
            onClick={() => revokeOthers.mutate()}
          >
            {t('revokeOthers')}
          </Button>
        }
      />
      {!query.isLoading && (!query.data || query.data.length === 0) ? (
        <EmptyState title={t('empty')} />
      ) : (
        <section className="table-card">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>App</th>
                <th>Created</th>
                <th>Expires</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {query.data?.map((session) => (
                <tr key={session.id}>
                  <td>
                    {session.type}{' '}
                    {session.current ? <StatusBadge status={t('current')} /> : null}
                  </td>
                  <td>{session.application || '—'}</td>
                  <td>{formatDate(session.createdAt, locale)}</td>
                  <td>{formatDate(session.expiresAt, locale)}</td>
                  <td>
                    {!session.current ? (
                      <Button
                        variant="danger"
                        disabled={revoke.isPending}
                        onClick={() => {
                          if (confirm(tc('confirm'))) revoke.mutate(session.id);
                        }}
                      >
                        {tc('revoke')}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
