'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { Button, StatusBadge } from '@/components/ui/primitives';
import { identityService } from '@/services';
import { useRouter } from '@/i18n/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

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
    <Card className="auth-panel overflow-hidden border-0 shadow-none">
      <CardHeader className="space-y-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Link2 className="size-3.5" aria-hidden />
          {t('optionalTitle')}
        </span>
        <CardTitle className="text-xl font-semibold">{t('optionalTitle')}</CardTitle>
        <CardDescription className="text-base leading-relaxed">
          {t('optionalBody')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {OPTIONAL.map((provider) => {
            const linked = identities.data?.some(
              (item) => item.provider === provider.id,
            );
            return (
              <div
                key={provider.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-background/50 p-4"
              >
                <div className="flex items-center gap-3">
                  <strong className="text-sm">{provider.label}</strong>
                  <StatusBadge status={linked ? 'LINKED' : 'NOT_LINKED'} />
                </div>
                {linked ? (
                  <span className="text-sm text-muted-foreground">
                    {t('linked')}
                  </span>
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

        <div className="flex flex-col gap-2">
          <Button
            className="h-11 w-full font-semibold"
            onClick={() => router.push('/welcome/ready')}
          >
            {t('skipOptional')}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => router.push('/welcome/discord')}
          >
            {tc('back')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
