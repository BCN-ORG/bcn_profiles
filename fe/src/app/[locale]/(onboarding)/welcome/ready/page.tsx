'use client';

import { useState } from 'react';
import { PartyPopper } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/primitives';
import { useAuth } from '@/components/auth/auth-provider';
import { profileService } from '@/services';
import { useRouter } from '@/i18n/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function WelcomeReadyPage() {
  const t = useTranslations('welcome');
  const tc = useTranslations('common');
  const { refresh } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function finish() {
    setBusy(true);
    try {
      await profileService.completeOnboarding();
      await refresh();
      router.replace('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
      setBusy(false);
    }
  }

  return (
    <Card className="auth-panel overflow-hidden border-0 shadow-none">
      <CardHeader className="space-y-4 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <PartyPopper className="size-7" aria-hidden />
        </span>
        <CardTitle className="text-2xl font-semibold">
          {t('readyTitle')}
        </CardTitle>
        <CardDescription className="text-base leading-relaxed">
          {t('readyBody')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          className="h-11 w-full text-base font-semibold"
          disabled={busy}
          onClick={() => void finish()}
        >
          {busy ? tc('loading') : t('enter')}
        </Button>
      </CardContent>
    </Card>
  );
}
