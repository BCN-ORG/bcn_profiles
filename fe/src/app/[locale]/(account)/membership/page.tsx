'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button, PageHeader, StatusBadge } from '@/components/ui/primitives';
import { formatDate } from '@/lib/utils';
import { membershipService } from '@/services';

export default function MembershipPage() {
  const t = useTranslations('membership');
  const tc = useTranslations('common');
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['me', 'membership'],
    queryFn: membershipService.get,
  });
  const recheck = useMutation({
    mutationFn: membershipService.recheck,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me', 'membership'] });
      toast.success(t('recheckSuccess'));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const data = query.data;

  return (
    <div className="stack">
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          <Button disabled={recheck.isPending} onClick={() => recheck.mutate()}>
            {tc('recheck')}
          </Button>
        }
      />
      <section className="grid two">
        <article className="card">
          <span className="card-label">{t('policy')}</span>
          <h2>{data?.eligible ? t('eligible') : t('notEligible')}</h2>
          <p className="muted">{data?.policy || 'ANY_TRUSTED_GROUP'}</p>
          {data?.override ? (
            <div style={{ marginTop: '1rem' }}>
              <StatusBadge status={data.override.status} />
              <p className="muted">
                {t('override')}: {data.override.reason} ·{' '}
                {formatDate(data.override.expiresAt)}
              </p>
            </div>
          ) : null}
        </article>
        <article className="card stack">
          <div className="info">
            <span>{t('discord')}</span>
            <StatusBadge status={data?.sources.discord?.status || 'UNKNOWN'} />
          </div>
          <div className="info">
            <span>{t('zalo')}</span>
            <StatusBadge status={data?.sources.zalo?.status || 'UNKNOWN'} />
          </div>
          <p className="muted">
            Discord: {formatDate(data?.sources.discord?.checkedAt)}
            <br />
            Zalo: {formatDate(data?.sources.zalo?.checkedAt)}
          </p>
        </article>
      </section>
      {query.isError ? (
        <div className="alert error">{(query.error as Error).message || tc('error')}</div>
      ) : null}
    </div>
  );
}
