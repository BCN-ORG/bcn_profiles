'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { Button, StatusBadge } from '@/components/ui/primitives';
import { identityService, membershipService } from '@/services';
import { useRouter } from '@/i18n/navigation';

export default function WelcomeDiscordPage() {
  const t = useTranslations('welcome');
  const tc = useTranslations('common');
  const router = useRouter();
  const search = useSearchParams();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [oauthMissing, setOauthMissing] = useState(false);

  const identities = useQuery({
    queryKey: ['me', 'identities'],
    queryFn: identityService.list,
  });
  const membership = useQuery({
    queryKey: ['me', 'membership'],
    queryFn: membershipService.get,
  });

  const discord = identities.data?.find((i) => i.provider === 'DISCORD');
  const eligible = membership.data?.eligible === true;
  const canContinue = Boolean(discord && eligible) || oauthMissing;

  useEffect(() => {
    const oauth = search.get('oauth');
    const provider = search.get('provider');
    if (!oauth) return;
    if (oauth === 'cancelled' || oauth === 'incomplete') {
      toast.message(t('oauthCancelled', { provider: provider || 'Discord' }));
    } else if (oauth === 'linked') {
      toast.success(t('discordLinked'));
      void queryClient.invalidateQueries({ queryKey: ['me', 'identities'] });
      void queryClient.invalidateQueries({ queryKey: ['me', 'membership'] });
    } else if (oauth === 'failed') {
      toast.error(t('oauthFailed'));
    }
  }, [search, t, queryClient]);

  async function connectDiscord() {
    setBusy(true);
    try {
      const result = await identityService.link('DISCORD');
      location.assign(result.authorizationUrl);
    } catch (error) {
      if (
        error instanceof ApiError &&
        (/OAuth is not configured/i.test(error.message) ||
          (error.details as { code?: string } | undefined)?.code ===
            'OAUTH_NOT_CONFIGURED')
      ) {
        setOauthMissing(true);
        toast.error(t('oauthUnavailable', { provider: 'Discord' }));
      } else {
        toast.error(error instanceof Error ? error.message : tc('error'));
      }
      setBusy(false);
    }
  }

  async function recheck() {
    setBusy(true);
    try {
      await membershipService.recheck();
      await queryClient.invalidateQueries({ queryKey: ['me', 'membership'] });
      toast.success(t('membershipRechecked'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="onboarding-stage">
      <span className="eyebrow">{t('step', { current: 1, total: 3 })}</span>
      <h1>{t('discordTitle')}</h1>
      <p className="onboarding-lead">{t('discordBody')}</p>

      <div className="onboarding-card">
        <div className="info">
          <span>{t('discordStatus')}</span>
          <StatusBadge status={discord ? 'VERIFIED' : 'UNKNOWN'} />
        </div>
        <div className="info">
          <span>{t('membershipStatus')}</span>
          <StatusBadge
            status={eligible ? 'ACTIVE' : discord ? 'NOT_MEMBER' : 'UNKNOWN'}
          />
        </div>
        {discord?.providerUsername ? (
          <p className="muted">@{discord.providerUsername}</p>
        ) : null}
      </div>

      <div className="onboarding-actions">
        {!discord && !oauthMissing ? (
          <Button className="btn-wide" disabled={busy} onClick={() => void connectDiscord()}>
            {t('connectDiscord')}
          </Button>
        ) : discord && !eligible && !oauthMissing ? (
          <Button className="btn-wide" disabled={busy} onClick={() => void recheck()}>
            {tc('recheck')}
          </Button>
        ) : null}
        {canContinue ? (
          <Button className="btn-wide" onClick={() => router.push('/welcome/optional')}>
            {oauthMissing ? t('continueWithoutOauth') : tc('continue')}
          </Button>
        ) : (
          <p className="muted">{t('discordRequired')}</p>
        )}
      </div>
    </section>
  );
}
