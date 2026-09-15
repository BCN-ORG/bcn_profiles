'use client';

import { FormEvent, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button, PageHeader } from '@/components/ui/primitives';
import { formatDate } from '@/lib/utils';
import { timelineService } from '@/services';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageShell } from '@/components/layout/page-shell';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const EVENT_TYPES = [
  'JOIN_BCN',
  'COURSE_COMPLETE',
  'QUIZ_COMPLETE',
  'PROJECT_COMPLETE',
  'SEMESTER_COMPLETE',
] as const;

export default function TimelinePage() {
  const t = useTranslations('timeline');
  const tc = useTranslations('common');
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['me', 'timeline'],
    queryFn: () => timelineService.mine(),
  });
  const [eventType, setEventType] =
    useState<(typeof EVENT_TYPES)[number]>('JOIN_BCN');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await timelineService.create({ eventType, title });
      setTitle('');
      await queryClient.invalidateQueries({ queryKey: ['me', 'timeline'] });
      toast.success(t('created'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <PageHeader title={t('title')} description={t('subtitle')} />
      <Card>
        <CardContent className="pt-6">
          <form className="grid gap-4 md:grid-cols-3" onSubmit={onCreate}>
            <div className="space-y-2">
              <Label>{t('type')}</Label>
              <Select
                value={eventType}
                onValueChange={(value) =>
                  setEventType(value as (typeof EVENT_TYPES)[number])
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('eventTitle')}</Label>
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button disabled={busy}>{t('add')}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('type')}</TableHead>
                <TableHead>{t('eventTitle')}</TableHead>
                <TableHead>{t('when')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading ? (
                <TableRow>
                  <TableCell colSpan={3}>{tc('loading')}</TableCell>
                </TableRow>
              ) : (query.data?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={3}>{t('empty')}</TableCell>
                </TableRow>
              ) : (
                query.data?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.eventType}</TableCell>
                    <TableCell>{item.title}</TableCell>
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
