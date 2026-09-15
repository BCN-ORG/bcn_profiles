'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { Button, PageHeader, StatusBadge } from '@/components/ui/primitives';
import { identityService } from '@/services';

const providers = [
  { id: 'GOOGLE', name: 'Google', mark: 'G', color: '#4285f4' },
  { id: 'GITHUB', name: 'GitHub', mark: 'GH', color: '#24292f' },
  { id: 'DISCORD', name: 'Discord', mark: 'D', color: '#5865f2' },
] as const;

function oauthErrorMessage(
  error: unknown,
  providerName: string,
  t: (key: string, values?: Record<string, string>) => string,
  fallback: string,
) {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : fallback;
  }
  const code = (error.details as { code?: string } | undefined)?.code;
  if (
    code === 'OAUTH_NOT_CONFIGURED' ||
    /OAuth is not configured/i.test(error.message)
  ) {
    return t('oauthUnavailable', { provider: providerName });
  }
  return error.message || fallback;
}

export default function ConnectionsPage() {
  const t = useTranslations('connections');
  const tc = useTranslations('common');
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['me', 'identities'],
    queryFn: identityService.list,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['me', 'identities'] });

  const link = useMutation({
    mutationFn: identityService.link,
    onSuccess: (result) => location.assign(result.authorizationUrl),
    onError: (e: Error, providerId) => {
      const provider = providers.find((p) => p.id === providerId);
      toast.error(
        oauthErrorMessage(e, provider?.name || providerId, t, tc('error')),
      );
    },
  });
  const sync = useMutation({
    mutationFn: identityService.sync,
    onSuccess: async () => {
      await invalidate();
      toast.success(tc('sync'));
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const unlink = useMutation({
    mutationFn: identityService.unlink,
    onSuccess: async () => {
      await invalidate();
      toast.success(tc('disconnect'));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="stack">
      <PageHeader title={t('title')} description={t('subtitle')} />
      <section className="provider-grid">
        {providers.map((provider) => {
          const identity = query.data?.find((item) => item.provider === provider.id);
          return (
            <article className="provider-card" key={provider.id}>
              <div className="provider-head">
                <span className="provider-mark" style={{ background: provider.color }}>
                  {provider.mark}
                </span>
                <div>
                  <h3>{provider.name}</h3>
                  <p className="muted">
                    {identity
                      ? identity.providerEmail ||
                        identity.providerUsername ||
                        identity.providerDisplayName
                      : t('notLinked')}
                  </p>
                </div>
                <StatusBadge status={identity ? 'ACTIVE' : 'PENDING'} />
              </div>
              {identity ? (
                <div className="actions">
                  <Button
                    variant="secondary"
                    disabled={sync.isPending}
                    onClick={() => sync.mutate(provider.id)}
                  >
                    {tc('sync')}
                  </Button>
                  <Button
                    variant="danger"
                    disabled={unlink.isPending}
                    onClick={() => {
                      if (confirm(`${tc('disconnect')} ${provider.name}?`)) {
                        unlink.mutate(provider.id);
                      }
                    }}
                  >
                    {tc('disconnect')}
                  </Button>
                </div>
              ) : (
                <Button
                  className="btn-wide"
                  disabled={link.isPending}
                  onClick={() => link.mutate(provider.id)}
                >
                  {tc('connect')}
                </Button>
              )}
            </article>
          );
        })}
        <article className="provider-card">
          <div className="provider-head">
            <span className="provider-mark" style={{ background: '#0068ff' }}>
              Z
            </span>
            <div>
              <h3>Zalo</h3>
              <p className="muted">{t('zaloSoon')}</p>
            </div>
          </div>
          <Button className="btn-wide" variant="secondary" disabled>
            {tc('comingSoon')}
          </Button>
        </article>
      </section>
    </div>
  );
}
