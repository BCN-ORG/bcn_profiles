'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
import { useStatusLabel } from '@/hooks/use-status-label';
import { Button, PageHeader, StatusBadge } from '@/components/ui/primitives';
import { formatDate } from '@/lib/utils';
import {
  adminUserService,
  applicationService,
  auditService,
  membershipService,
  securityService,
  rbacService,
  timelineService,
  TIMELINE_EVENT_TYPES,
  type TimelineEventType,
} from '@/services';
import { Link, useRouter } from '@/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AdminUserDetailPage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const tm = useTranslations('membership');
  const ts = useTranslations('security');
  const tt = useTranslations('timeline');
  const label = useStatusLabel();
  const queryClient = useQueryClient();
  const router = useRouter();

  const user = useQuery({
    queryKey: ['admin', 'user', userId],
    queryFn: () => adminUserService.get(userId),
  });
  const membership = useQuery({
    queryKey: ['admin', 'user', userId, 'membership'],
    queryFn: () => membershipService.adminGet(userId),
  });
  const apps = useQuery({
    queryKey: ['admin', 'user', userId, 'applications'],
    queryFn: () => applicationService.adminList(userId),
  });
  const audit = useQuery({
    queryKey: ['admin', 'user', userId, 'audit'],
    queryFn: () => auditService.list({ userId, limit: 10 }),
  });
  const twoFa = useQuery({
    queryKey: ['admin', 'user', userId, '2fa'],
    queryFn: () => securityService.adminStatus(userId),
  });
  const appCatalog = useQuery({
    queryKey: ['admin', 'rbac', 'apps'],
    queryFn: () => rbacService.listApps(),
  });

  const [overrideStatus, setOverrideStatus] = useState<'ALLOW' | 'DENY'>(
    'ALLOW',
  );
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [appCode, setAppCode] = useState('');
  const [roleCode, setRoleCode] = useState('');
  const [timelineEventType, setTimelineEventType] =
    useState<TimelineEventType>('JOIN_BCN');
  const [timelineTitle, setTimelineTitle] = useState('');
  const [timelineBusy, setTimelineBusy] = useState(false);
  const [editingTimelineId, setEditingTimelineId] = useState<number | null>(
    null,
  );
  const selectedApp = appCatalog.data?.find((app) => app.code === appCode);

  useEffect(() => {
    if (!appCode && appCatalog.data?.[0]) setAppCode(appCatalog.data[0].code);
  }, [appCatalog.data, appCode]);

  useEffect(() => {
    setRoleCode(selectedApp?.roles[0]?.code ?? '');
  }, [appCode, selectedApp?.roles]);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', userId] }),
      queryClient.invalidateQueries({
        queryKey: ['admin', 'user', userId, 'membership'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['admin', 'user', userId, 'applications'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['admin', 'user', userId, 'audit'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['admin', 'user', userId, '2fa'],
      }),
    ]);
  };

  const act = useMutation({
    mutationFn: async (action: 'approve' | 'reject' | 'block' | 'unblock') => {
      if (action === 'approve') return adminUserService.approve(userId);
      if (action === 'reject') return adminUserService.reject(userId);
      if (action === 'block') return adminUserService.block(userId);
      return adminUserService.unblock(userId);
    },
    onSuccess: async () => {
      await invalidate();
      toast.success(t('updated'));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function submitOverride(event: FormEvent) {
    event.preventDefault();
    try {
      await membershipService.override(userId, {
        status: overrideStatus,
        reason,
        expiresAt: new Date(expiresAt).toISOString(),
      });
      await invalidate();
      toast.success(t('updated'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
    }
  }

  async function submitTimelineEvent(event: FormEvent) {
    event.preventDefault();
    const isEditing = editingTimelineId !== null;
    setTimelineBusy(true);
    try {
      const body = {
        eventType: timelineEventType,
        title: timelineTitle.trim(),
      };
      if (isEditing && editingTimelineId !== null) {
        await timelineService.update(editingTimelineId, body);
      } else {
        await timelineService.createForUser(userId, body);
      }
      setTimelineTitle('');
      setEditingTimelineId(null);
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'user', userId],
      });
      toast.success(tt(isEditing ? 'updated' : 'created'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
    } finally {
      setTimelineBusy(false);
    }
  }

  if (user.isLoading) return <p>{tc('loading')}</p>;
  if (!user.data) return <p>{tc('error')}</p>;

  return (
    <PageShell>
      <PageHeader
        title={user.data.fullName || user.data.email}
        description={t('userDetail')}
        actions={
          <Button asChild variant="ghost">
            <Link href="/admin/users">{tc('back')}</Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('email')}</span>
            <strong>{user.data.email}</strong>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('status')}</span>
            <StatusBadge status={user.data.status || 'ACTIVE'} />
          </div>
          <div className="flex flex-wrap gap-2">
            {user.data.status === 'PENDING' ? (
              <>
                <Button onClick={() => act.mutate('approve')}>
                  {t('approve')}
                </Button>
                <Button variant="danger" onClick={() => act.mutate('reject')}>
                  {t('reject')}
                </Button>
              </>
            ) : null}
            {user.data.status === 'ACTIVE' ? (
              <Button variant="danger" onClick={() => act.mutate('block')}>
                {t('block')}
              </Button>
            ) : null}
            {user.data.status === 'BLOCKED' ? (
              <Button onClick={() => act.mutate('unblock')}>
                {t('unblock')}
              </Button>
            ) : null}
            <Button
              variant="secondary"
              onClick={() =>
                void membershipService
                  .adminRecheck(userId)
                  .then(async () => {
                    await invalidate();
                    toast.success(tm('recheckSuccess'));
                  })
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              {tc('recheck')}
            </Button>
            <ConfirmDialog
              title={t('deleteTitle', {
                user: user.data.fullName || user.data.email,
              })}
              description={t('deleteConfirm')}
              confirmLabel={t('deleteUser')}
              cancelLabel={tc('cancel')}
              pendingLabel={tc('loading')}
              onConfirm={() =>
                adminUserService
                  .remove(userId)
                  .then(() => {
                    toast.success(t('deleted'));
                    router.replace('/admin/users');
                    return true;
                  })
                  .catch((e: Error) => {
                    toast.error(e.message);
                    return false;
                  })
              }
              trigger={<Button variant="danger">{t('deleteUser')}</Button>}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>{ts('twoFactor')}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {twoFa.data?.twoFactorRequired
                ? t('twoFaRequired')
                : t('twoFaOptional')}
            </p>
          </div>
          <StatusBadge
            status={twoFa.data?.twoFactorEnabled ? 'TWO_FA_ON' : 'TWO_FA_OFF'}
          />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                void securityService
                  .adminRequire(userId)
                  .then(async () => {
                    await invalidate();
                    toast.success(t('updated'));
                  })
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              {t('require2fa')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                void securityService
                  .adminUnrequire(userId)
                  .then(async () => {
                    await invalidate();
                    toast.success(t('updated'));
                  })
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              {t('unrequire2fa')}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() =>
                void securityService
                  .adminReset(userId, 'Admin reset')
                  .then(async () => {
                    await invalidate();
                    toast.success(t('updated'));
                  })
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              {t('reset2fa')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{tm('title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatusBadge
              status={membership.data?.eligible ? 'ELIGIBLE' : 'NOT_ELIGIBLE'}
            />
            <p className="text-sm text-muted-foreground">
              {label(membership.data?.policy || 'ANY_TRUSTED_GROUP')}
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{tm('discord')}</span>
              <StatusBadge
                status={membership.data?.sources.discord?.status || 'UNKNOWN'}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{tm('zalo')}</span>
              <StatusBadge
                status={membership.data?.sources.zalo?.status || 'UNKNOWN'}
              />
            </div>
            <form
              className="grid gap-4 border-t pt-4"
              onSubmit={submitOverride}
            >
              <h4 className="font-medium">{t('overrideTitle')}</h4>
              <div className="space-y-2">
                <Label>{t('overrideStatus')}</Label>
                <Select
                  value={overrideStatus}
                  onValueChange={(value) =>
                    setOverrideStatus(value as 'ALLOW' | 'DENY')
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALLOW">{label('ALLOW')}</SelectItem>
                    <SelectItem value="DENY">{label('DENY')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('overrideReason')}</Label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  minLength={3}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('overrideExpires')}</Label>
                <Input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  required
                />
              </div>
              <Button type="submit">{tc('save')}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('applications')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {apps.data?.map((app) => (
              <div
                key={app.code}
                className="flex items-start justify-between gap-4 text-sm"
              >
                <span>
                  {app.name} ({app.code})
                  <br />
                  <small className="text-muted-foreground">
                    {app.roles.map((role) => label(role)).join(', ') || '—'}
                  </small>
                </span>
                <StatusBadge status={app.access} />
              </div>
            ))}
            <form
              className="grid gap-4 border-t pt-4"
              onSubmit={(event) => {
                event.preventDefault();
                void applicationService
                  .grant(userId, appCode)
                  .then(async () => {
                    await invalidate();
                    toast.success(t('updated'));
                  })
                  .catch((e: Error) => toast.error(e.message));
              }}
            >
              <div className="space-y-2">
                <Label>App code</Label>
                <Select value={appCode} onValueChange={setAppCode}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(appCatalog.data ?? []).map((item) => (
                      <SelectItem key={item.id} value={item.code}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit">{t('grantApp')}</Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() =>
                    void applicationService
                      .block(userId, appCode)
                      .then(async () => {
                        await invalidate();
                        toast.success(t('updated'));
                      })
                      .catch((e: Error) => toast.error(e.message))
                  }
                >
                  {t('blockApp')}
                </Button>
              </div>
            </form>
            <form
              className="grid gap-4 border-t pt-4"
              onSubmit={(event) => {
                event.preventDefault();
                void applicationService
                  .assignRole(userId, appCode, roleCode)
                  .then(async () => {
                    await invalidate();
                    toast.success(t('updated'));
                  })
                  .catch((e: Error) => toast.error(e.message));
              }}
            >
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={roleCode} onValueChange={setRoleCode}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(selectedApp?.roles ?? []).map((role) => (
                      <SelectItem key={role.id} value={role.code}>
                        {role.name || role.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit">{t('assignRole')}</Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() =>
                    void applicationService
                      .removeRole(userId, appCode, roleCode)
                      .then(async () => {
                        await invalidate();
                        toast.success(t('updated'));
                      })
                      .catch((e: Error) => toast.error(e.message))
                  }
                >
                  {t('removeRole')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{tt('adminTitle')}</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            {tt('adminHint')}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <form
            className="grid gap-4 rounded-xl border border-border/70 bg-muted/20 p-4 md:grid-cols-[minmax(180px,0.8fr)_minmax(260px,2fr)_auto] md:items-end"
            onSubmit={submitTimelineEvent}
          >
            <div className="space-y-2">
              <Label>{tt('type')}</Label>
              <Select
                value={timelineEventType}
                onValueChange={(value) =>
                  setTimelineEventType(value as TimelineEventType)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMELINE_EVENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {tt(`events.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeline-title">{tt('eventTitle')}</Label>
              <Input
                id="timeline-title"
                required
                minLength={2}
                maxLength={200}
                value={timelineTitle}
                placeholder={tt('titlePlaceholder')}
                onChange={(event) => setTimelineTitle(event.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {editingTimelineId ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={timelineBusy}
                  onClick={() => {
                    setEditingTimelineId(null);
                    setTimelineTitle('');
                  }}
                >
                  {tc('cancel')}
                </Button>
              ) : null}
              <Button
                type="submit"
                disabled={timelineBusy || !timelineTitle.trim()}
              >
                {timelineBusy
                  ? tc('loading')
                  : tt(editingTimelineId ? 'saveChanges' : 'add')}
              </Button>
            </div>
          </form>

          {(user.data.timelineEvents?.length ?? 0) === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
              {tt('empty')}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tt('type')}</TableHead>
                    <TableHead>{tt('eventTitle')}</TableHead>
                    <TableHead>{tt('source')}</TableHead>
                    <TableHead>{tt('when')}</TableHead>
                    <TableHead className="w-24">
                      <span className="sr-only">{tc('actions')}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.data.timelineEvents?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-primary">
                        {tt(`events.${item.eventType}`)}
                      </TableCell>
                      <TableCell>{item.title}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.sourceApp || tt('sourceAdmin')}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={tt('editAction')}
                            onClick={() => {
                              setEditingTimelineId(item.id);
                              setTimelineEventType(item.eventType);
                              setTimelineTitle(item.title);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <ConfirmDialog
                            title={tt('deleteTitle')}
                            description={tt('deleteConfirm', {
                              title: item.title,
                            })}
                            confirmLabel={tt('deleteAction')}
                            cancelLabel={tc('cancel')}
                            pendingLabel={tc('loading')}
                            onConfirm={() =>
                              timelineService
                                .remove(item.id)
                                .then(async () => {
                                  if (editingTimelineId === item.id) {
                                    setEditingTimelineId(null);
                                    setTimelineTitle('');
                                  }
                                  await queryClient.invalidateQueries({
                                    queryKey: ['admin', 'user', userId],
                                  });
                                  toast.success(tt('deleted'));
                                  return true;
                                })
                                .catch((error: Error) => {
                                  toast.error(error.message);
                                  return false;
                                })
                            }
                            trigger={
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={tt('deleteAction')}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('auditTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>App</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.data?.data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.eventType}</TableCell>
                  <TableCell>{item.applicationCode || '—'}</TableCell>
                  <TableCell>{formatDate(item.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}
