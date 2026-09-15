'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { Button, StatusBadge } from '@/components/ui/primitives';
import { SurfacePanel } from '@/components/layout/page-shell';
import { identityService, membershipService } from '@/services';
import { useRouter } from '@/i18n/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

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
    <Card className="auth-panel overflow-hidden border-0 shadow-none">
      <CardHeader className="space-y-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#5865F2]/10 px-3 py-1 text-xs font-medium text-[#5865F2]">
          <MessageCircle className="size-3.5" aria-hidden />
          Discord
        </span>
        <CardTitle className="text-xl font-semibold">{t('discordTitle')}</CardTitle>
        <CardDescription className="text-base leading-relaxed">
          {t('discordBody')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <SurfacePanel className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('discordStatus')}</span>
            <StatusBadge status={discord ? 'VERIFIED' : 'UNKNOWN'} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('membershipStatus')}</span>
            <StatusBadge
              status={
                eligible ? 'ELIGIBLE' : discord ? 'NOT_MEMBER' : 'UNKNOWN'
              }
            />
          </div>
          {discord?.providerUsername ? (
            <p className="text-sm font-medium">@{discord.providerUsername}</p>
          ) : null}
        </SurfacePanel>

        <div className="flex flex-col gap-2">
          {!discord && !oauthMissing ? (
            <Button
              className="h-11 w-full font-semibold"
              disabled={busy}
              onClick={() => void connectDiscord()}
            >
              {t('connectDiscord')}
            </Button>
          ) : discord && !eligible && !oauthMissing ? (
            <Button
              className="h-11 w-full font-semibold"
              disabled={busy}
              onClick={() => void recheck()}
            >
              {tc('recheck')}
            </Button>
          ) : null}
          {canContinue ? (
            <Button
              className="h-11 w-full font-semibold"
              onClick={() => router.push('/welcome/optional')}
            >
              {oauthMissing ? t('continueWithoutOauth') : tc('continue')}
            </Button>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              {t('discordRequired')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
