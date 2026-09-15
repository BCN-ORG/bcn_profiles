'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useStatusLabel } from '@/hooks/use-status-label';
import { Button, EmptyState, PageHeader, StatusBadge } from '@/components/ui/primitives';
import { formatDate } from '@/lib/utils';
import { sessionService } from '@/services';
import { Card, CardContent } from '@/components/ui/card';
import { PageShell } from '@/components/layout/page-shell';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function SessionsPage() {
  const t = useTranslations('sessions');
  const tc = useTranslations('common');
  const label = useStatusLabel();
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
    <PageShell>
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
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('type')}</TableHead>
                  <TableHead>{t('app')}</TableHead>
                  <TableHead>{t('created')}</TableHead>
                  <TableHead>{t('expires')}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data?.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      {label(session.type)}{' '}
                      {session.current ? (
                        <StatusBadge status="CURRENT" />
                      ) : null}
                    </TableCell>
                    <TableCell>{session.application || '—'}</TableCell>
                    <TableCell>{formatDate(session.createdAt, locale)}</TableCell>
                    <TableCell>{formatDate(session.expiresAt, locale)}</TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
