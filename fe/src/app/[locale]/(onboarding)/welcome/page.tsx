'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/primitives';
import { useAuth } from '@/components/auth/auth-provider';
import { useRouter } from '@/i18n/navigation';

export default function WelcomePage() {
  const t = useTranslations('welcome');
  const { user } = useAuth();
  const router = useRouter();
  const name = user?.fullName?.split(' ')[0] || 'BCN';

  return (
    <section className="onboarding-stage unbox">
      <div className="unboxing-glow" aria-hidden />
      <span className="eyebrow">{t('eyebrow')}</span>
      <h1 className="unbox-title">{t('hello', { name })}</h1>
      <p className="onboarding-lead">{t('intro')}</p>
      <ul className="unbox-points">
        <li>{t('point1')}</li>
        <li>{t('point2')}</li>
        <li>{t('point3')}</li>
      </ul>
      <Button className="btn-wide" onClick={() => router.push('/welcome/discord')}>
        {t('start')}
      </Button>
    </section>
  );
}
