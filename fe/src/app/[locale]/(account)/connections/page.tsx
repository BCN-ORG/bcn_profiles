'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { Button, PageHeader, StatusBadge } from '@/components/ui/primitives';
import { identityService } from '@/services';
import { PageShell } from '@/components/layout/page-shell';
import {
  SocialIconBadge,
  type SocialProvider,
} from '@/components/auth/social-icons';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const providers: {
  id: 'GOOGLE' | 'GITHUB' | 'DISCORD' | 'ZALO';
  name: string;
  icon: SocialProvider;
}[] = [
  { id: 'GOOGLE', name: 'Google', icon: 'google' },
  { id: 'GITHUB', name: 'GitHub', icon: 'github' },
  { id: 'DISCORD', name: 'Discord', icon: 'discord' },
  { id: 'ZALO', name: 'Zalo', icon: 'zalo' },
];

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
    <PageShell>
      <PageHeader title={t('title')} description={t('subtitle')} />
      <div className="grid gap-4 md:grid-cols-2">
        {providers.map((provider) => {
          const identity = query.data?.find(
            (item) => item.provider === provider.id,
          );
          return (
            <Card key={provider.id}>
              <CardHeader className="flex-row items-start gap-3 space-y-0">
                <SocialIconBadge provider={provider.icon} />
                <div className="min-w-0 flex-1">
                  <CardTitle>{provider.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {identity
                      ? identity.providerEmail ||
                        identity.providerUsername ||
                        identity.providerDisplayName
                      : t('notLinked')}
                  </p>
                </div>
                <StatusBadge status={identity ? 'LINKED' : 'NOT_LINKED'} />
              </CardHeader>
              <CardContent>
                {identity ? (
                  <div className="flex flex-wrap gap-2">
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
                    className="w-full"
                    disabled={link.isPending}
                    onClick={() => link.mutate(provider.id)}
                  >
                    {tc('connect')}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}
