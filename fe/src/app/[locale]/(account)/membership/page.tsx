'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useStatusLabel } from '@/hooks/use-status-label';
import { Button, PageHeader, StatusBadge } from '@/components/ui/primitives';
import { formatDate } from '@/lib/utils';
import { membershipService } from '@/services';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageShell } from '@/components/layout/page-shell';

export default function MembershipPage() {
  const t = useTranslations('membership');
  const tc = useTranslations('common');
  const label = useStatusLabel();
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
    <PageShell>
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          <Button disabled={recheck.isPending} onClick={() => recheck.mutate()}>
            {tc('recheck')}
          </Button>
        }
      />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('policy')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <h2 className="text-2xl font-semibold">
              {data?.eligible ? t('eligible') : t('notEligible')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {label(data?.policy || 'ANY_TRUSTED_GROUP')}
            </p>
            {data?.override ? (
              <div className="space-y-1">
                <StatusBadge status={data.override.status} />
                <p className="text-sm text-muted-foreground">
                  {t('override')}: {data.override.reason} ·{' '}
                  {formatDate(data.override.expiresAt)}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('discord')}</span>
              <StatusBadge
                status={data?.sources.discord?.status || 'UNKNOWN'}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('zalo')}</span>
              <StatusBadge status={data?.sources.zalo?.status || 'UNKNOWN'} />
            </div>
            <p className="text-sm text-muted-foreground">
              Discord: {formatDate(data?.sources.discord?.checkedAt)}
              <br />
              Zalo: {formatDate(data?.sources.zalo?.checkedAt)}
            </p>
          </CardContent>
        </Card>
      </div>
      {query.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {(query.error as Error).message || tc('error')}
          </AlertDescription>
        </Alert>
      ) : null}
    </PageShell>
  );
}
