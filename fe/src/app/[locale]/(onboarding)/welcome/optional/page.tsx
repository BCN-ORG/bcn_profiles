'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { Button, StatusBadge } from '@/components/ui/primitives';
import { identityService } from '@/services';
import { useRouter } from '@/i18n/navigation';

const OPTIONAL = [
  { id: 'GOOGLE', label: 'Google' },
  { id: 'GITHUB', label: 'GitHub' },
] as const;

export default function WelcomeOptionalPage() {
  const t = useTranslations('welcome');
  const tc = useTranslations('common');
  const router = useRouter();
  const search = useSearchParams();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const identities = useQuery({
    queryKey: ['me', 'identities'],
    queryFn: identityService.list,
  });

  useEffect(() => {
    const oauth = search.get('oauth');
    const provider = search.get('provider');
    if (!oauth) return;
    if (oauth === 'cancelled' || oauth === 'incomplete') {
      toast.message(t('oauthCancelled', { provider: provider || 'OAuth' }));
    } else if (oauth === 'linked') {
      toast.success(t('providerLinked', { provider: provider || '' }));
      void queryClient.invalidateQueries({ queryKey: ['me', 'identities'] });
    } else if (oauth === 'failed') {
      toast.error(t('oauthFailed'));
    }
  }, [search, t, queryClient]);

  async function connect(provider: string, label: string) {
    setBusy(provider);
    try {
      const result = await identityService.link(provider);
      location.assign(result.authorizationUrl);
    } catch (error) {
      if (
        error instanceof ApiError &&
        (/OAuth is not configured/i.test(error.message) ||
          (error.details as { code?: string } | undefined)?.code ===
            'OAUTH_NOT_CONFIGURED')
      ) {
        toast.error(t('oauthUnavailable', { provider: label }));
      } else {
        toast.error(error instanceof Error ? error.message : tc('error'));
      }
      setBusy(null);
    }
  }

  return (
    <section className="onboarding-stage">
      <span className="eyebrow">{t('step', { current: 2, total: 3 })}</span>
      <h1>{t('optionalTitle')}</h1>
      <p className="onboarding-lead">{t('optionalBody')}</p>

      <div className="onboarding-provider-list">
        {OPTIONAL.map((provider) => {
          const linked = identities.data?.some(
            (item) => item.provider === provider.id,
          );
          return (
            <div key={provider.id} className="onboarding-card provider-row">
              <div>
                <strong>{provider.label}</strong>
                <StatusBadge status={linked ? 'VERIFIED' : 'UNKNOWN'} />
              </div>
              {linked ? (
                <span className="muted">{t('linked')}</span>
              ) : (
                <Button
                  variant="secondary"
                  disabled={busy === provider.id}
                  onClick={() => void connect(provider.id, provider.label)}
                >
                  {tc('connect')}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="onboarding-actions">
        <Button className="btn-wide" onClick={() => router.push('/welcome/ready')}>
          {t('skipOptional')}
        </Button>
        <Button
          variant="ghost"
          className="btn-wide"
          onClick={() => router.push('/welcome/discord')}
        >
          {tc('back')}
        </Button>
      </div>
    </section>
  );
}
