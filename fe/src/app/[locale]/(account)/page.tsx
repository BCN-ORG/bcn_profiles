'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/auth/auth-provider';
import { PageHeader, StatusBadge } from '@/components/ui/primitives';
import { initials } from '@/lib/utils';
import { membershipService } from '@/services';
import { Link } from '@/i18n/navigation';

export default function OverviewPage() {
  const t = useTranslations('overview');
  const tn = useTranslations('nav');
  const { user } = useAuth();
  const membership = useQuery({
    queryKey: ['me', 'membership'],
    queryFn: membershipService.get,
  });

  if (!user) return null;
  const name = user.fullName?.split(' ').at(-1) || 'bạn';

  return (
    <div className="stack">
      <PageHeader eyebrow="BCN ACCOUNT" title={t('title')} />
      <section className="hero-card">
        <div>
          <StatusBadge status={user.status || 'ACTIVE'} />
          <h2>{t('hello', { name })}</h2>
          <p className="muted">{t('ready')}</p>
        </div>
        <div className="monogram">{initials(user.fullName)}</div>
      </section>
      <section className="grid two">
        <article className="card">
          <span className="card-label">{tn('account')}</span>
          <div className="info">
            <span>Email</span>
            <strong>{user.email}</strong>
          </div>
          <div className="info">
            <span>Role</span>
            <strong>{user.role}</strong>
          </div>
          <Link href="/account" className="btn btn-secondary" style={{ marginTop: '1rem', display: 'inline-block' }}>
            {tn('account')}
          </Link>
        </article>
        <article className="card">
          <span className="card-label">{tn('membership')}</span>
          <h3>
            {membership.data?.eligible
              ? 'Eligible'
              : membership.isLoading
                ? '…'
                : 'Not eligible'}
          </h3>
          <p className="muted">{membership.data?.policy || 'ANY_TRUSTED_GROUP'}</p>
          <div className="actions" style={{ marginTop: '1rem' }}>
            <StatusBadge
              status={membership.data?.sources.discord?.status || 'UNKNOWN'}
            />
            <StatusBadge
              status={membership.data?.sources.zalo?.status || 'UNKNOWN'}
            />
          </div>
        </article>
      </section>
    </div>
  );
}
