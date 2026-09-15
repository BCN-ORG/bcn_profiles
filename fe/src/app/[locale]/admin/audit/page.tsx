'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/ui/primitives';
import { formatDate } from '@/lib/utils';
import { auditService } from '@/services';
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

export default function AdminAuditPage() {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const query = useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: () => auditService.list({ limit: 50 }),
  });

  return (
    <PageShell>
      <PageHeader title={t('auditTitle')} />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>User</TableHead>
                <TableHead>App</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5}>{tc('loading')}</TableCell>
                </TableRow>
              ) : (
                query.data?.data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.eventType}</TableCell>
                    <TableCell>{item.userId || '—'}</TableCell>
                    <TableCell>{item.applicationCode || '—'}</TableCell>
                    <TableCell>{item.provider || '—'}</TableCell>
                    <TableCell>{formatDate(item.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}
