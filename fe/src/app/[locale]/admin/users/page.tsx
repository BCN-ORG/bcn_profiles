'use client';

import { FormEvent, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Link } from '@/i18n/navigation';
import { Button, PageHeader, StatusBadge } from '@/components/ui/primitives';
import { formatDate, initials } from '@/lib/utils';
import { adminUserService } from '@/services';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PageShell } from '@/components/layout/page-shell';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AdminUsersPage() {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'pending'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
  });
  const [busy, setBusy] = useState(false);

  const query = useQuery({
    queryKey: ['admin', 'users', tab, search],
    queryFn: () =>
      adminUserService.list(search, { pending: tab === 'pending' }),
  });

  async function createUser(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await adminUserService.create(form);
      setForm({ email: '', password: '', fullName: '', phone: '' });
      setShowCreate(false);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success(t('created'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <PageHeader
        title={t('usersTitle')}
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowCreate((v) => !v)}
          >
            {t('createUser')}
          </Button>
        }
      />
      {showCreate ? (
        <Card>
          <CardContent className="pt-6">
            <form className="grid gap-4 md:grid-cols-2" onSubmit={createUser}>
              {(
                [
                  ['fullName', t('fullName')],
                  ['email', 'Email'],
                  ['phone', t('phone')],
                  ['password', t('password')],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
                  <Input
                    type={
                      key === 'password'
                        ? 'password'
                        : key === 'email'
                          ? 'email'
                          : 'text'
                    }
                    required={key === 'email' || key === 'password'}
                    minLength={key === 'password' ? 6 : undefined}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
              <div className="md:col-span-2">
                <Button disabled={busy}>
                  {busy ? tc('loading') : t('createUser')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
      <div className="flex flex-wrap items-center gap-4">
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as 'all' | 'pending')}
        >
          <TabsList>
            <TabsTrigger value="all">{t('tabAll')}</TabsTrigger>
            <TabsTrigger value="pending">{t('tabPending')}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-1 items-center gap-2">
          <Label className="sr-only">{tc('search')}</Label>
          <Input
            className="max-w-xs"
            placeholder={t('searchUsersPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="text-sm text-muted-foreground">
            {query.data?.data.length ?? 0}
          </span>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('userColumn')}</TableHead>
                <TableHead>{t('role')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('createdAt')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5}>{tc('loading')}</TableCell>
                </TableRow>
              ) : (
                query.data?.data.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar size="sm">
                          <AvatarFallback>
                            {initials(user.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <strong className="block text-sm">
                            {user.fullName || '—'}
                          </strong>
                          <small className="text-muted-foreground">
                            {user.email}
                          </small>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={user.role} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={user.status || 'ACTIVE'} />
                    </TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/admin/users/${user.id}`}>
                          {t('userDetail')}
                        </Link>
                      </Button>
                    </TableCell>
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
