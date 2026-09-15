'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { PageHeader, StatusBadge } from '@/components/ui/primitives';
import { formatDate, initials } from '@/lib/utils';
import { adminUserService } from '@/services';

export default function AdminUsersPage() {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['admin', 'users', search],
    queryFn: () => adminUserService.list(search),
  });

  return (
    <div className="stack">
      <PageHeader title={t('usersTitle')} />
      <section className="toolbar">
        <label className="search">
          {tc('search')}
          <input
            placeholder={tc('search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <span>{query.data?.data.length ?? 0}</span>
      </section>
      <section className="table-card">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td colSpan={5}>{tc('loading')}</td>
              </tr>
            ) : (
              query.data?.data.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="person">
                      <span className="avatar fallback">{initials(user.fullName)}</span>
                      <div>
                        <strong>{user.fullName || '—'}</strong>
                        <small>{user.email}</small>
                      </div>
                    </div>
                  </td>
                  <td>{user.role}</td>
                  <td>
                    <StatusBadge status={user.status || 'ACTIVE'} />
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>
                    <Link className="btn btn-secondary" href={`/admin/users/${user.id}`}>
                      {t('userDetail')}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
