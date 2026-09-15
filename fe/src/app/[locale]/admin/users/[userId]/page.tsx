'use client';

import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button, PageHeader, StatusBadge } from '@/components/ui/primitives';
import { formatDate } from '@/lib/utils';
import {
  adminUserService,
  applicationService,
  auditService,
  membershipService,
} from '@/services';
import { Link } from '@/i18n/navigation';

export default function AdminUserDetailPage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const tm = useTranslations('membership');
  const queryClient = useQueryClient();

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

  const [overrideStatus, setOverrideStatus] = useState<'ALLOW' | 'DENY'>('ALLOW');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [appCode, setAppCode] = useState('QUIZ');
  const [roleCode, setRoleCode] = useState('MEMBER');

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

  if (user.isLoading) return <p>{tc('loading')}</p>;
  if (!user.data) return <p>{tc('error')}</p>;

  return (
    <div className="stack">
      <PageHeader
        title={user.data.fullName || user.data.email}
        description={t('userDetail')}
        actions={
          <Link className="btn btn-ghost" href="/admin/users">
            {tc('back')}
          </Link>
        }
      />

      <section className="card stack">
        <div className="info">
          <span>Email</span>
          <strong>{user.data.email}</strong>
        </div>
        <div className="info">
          <span>Status</span>
          <StatusBadge status={user.data.status || 'ACTIVE'} />
        </div>
        <div className="actions">
          {user.data.status === 'PENDING' ? (
            <>
              <Button onClick={() => act.mutate('approve')}>{t('approve')}</Button>
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
            <Button onClick={() => act.mutate('unblock')}>{t('unblock')}</Button>
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
        </div>
      </section>

      <section className="grid two">
        <article className="card stack">
          <h3>{tm('title')}</h3>
          <StatusBadge
            status={membership.data?.eligible ? tm('eligible') : tm('notEligible')}
          />
          <p className="muted">{membership.data?.policy}</p>
          <div className="info">
            <span>{tm('discord')}</span>
            <StatusBadge
              status={membership.data?.sources.discord?.status || 'UNKNOWN'}
            />
          </div>
          <div className="info">
            <span>{tm('zalo')}</span>
            <StatusBadge
              status={membership.data?.sources.zalo?.status || 'UNKNOWN'}
            />
          </div>
          <form className="form-grid" onSubmit={submitOverride}>
            <h4>{t('overrideTitle')}</h4>
            <label>
              Status
              <select
                value={overrideStatus}
                onChange={(e) =>
                  setOverrideStatus(e.target.value as 'ALLOW' | 'DENY')
                }
              >
                <option value="ALLOW">ALLOW</option>
                <option value="DENY">DENY</option>
              </select>
            </label>
            <label>
              {t('overrideReason')}
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                minLength={3}
              />
            </label>
            <label>
              {t('overrideExpires')}
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                required
              />
            </label>
            <Button type="submit">{tc('save')}</Button>
          </form>
        </article>

        <article className="card stack">
          <h3>Applications</h3>
          {apps.data?.map((app) => (
            <div className="info" key={app.code}>
              <span>
                {app.name} ({app.code})
                <br />
                <small className="muted">{app.roles.join(', ') || '—'}</small>
              </span>
              <StatusBadge status={app.access} />
            </div>
          ))}
          <form
            className="form-grid"
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
            <label>
              App code
              <input value={appCode} onChange={(e) => setAppCode(e.target.value)} />
            </label>
            <div className="actions">
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
            className="form-grid"
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
            <label>
              Role
              <input
                value={roleCode}
                onChange={(e) => setRoleCode(e.target.value)}
              />
            </label>
            <div className="actions">
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
        </article>
      </section>

      <section className="table-card">
        <h3>{t('auditTitle')}</h3>
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>App</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {audit.data?.data.map((item) => (
              <tr key={item.id}>
                <td>{item.eventType}</td>
                <td>{item.applicationCode || '—'}</td>
                <td>{formatDate(item.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
