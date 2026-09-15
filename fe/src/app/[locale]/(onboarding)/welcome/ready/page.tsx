'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/primitives';
import { useAuth } from '@/components/auth/auth-provider';
import { profileService } from '@/services';
import { useRouter } from '@/i18n/navigation';
import { ONBOARDING_VERSION } from '@/lib/onboarding';

export default function WelcomeReadyPage() {
  const t = useTranslations('welcome');
  const tc = useTranslations('common');
  const { refresh } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function finish() {
    setBusy(true);
    try {
      await profileService.update({
        metadata: { onboardingVersion: ONBOARDING_VERSION },
      });
      await refresh();
      router.replace('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
      setBusy(false);
    }
  }

  return (
    <section className="onboarding-stage unbox">
      <div className="unboxing-glow" aria-hidden />
      <span className="eyebrow">{t('step', { current: 3, total: 3 })}</span>
      <h1 className="unbox-title">{t('readyTitle')}</h1>
      <p className="onboarding-lead">{t('readyBody')}</p>
      <Button className="btn-wide" disabled={busy} onClick={() => void finish()}>
        {busy ? tc('loading') : t('enter')}
      </Button>
    </section>
  );
}
