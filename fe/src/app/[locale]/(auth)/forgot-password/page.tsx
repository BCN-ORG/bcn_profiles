'use client';

import { FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import { AuthLinkRow, AuthShell } from '@/components/layout/auth-shell';
import { Button } from '@/components/ui/primitives';
import { authService } from '@/services';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const t = useTranslations('password');
  const tc = useTranslations('common');
  const router = useRouter();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function requestOtp(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await authService.forgotPassword(email);
      toast.success(t('otpSent'));
      setStep('reset');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  async function reset(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await authService.resetPassword(email, otp, newPassword);
      toast.success(t('resetOk'));
      router.replace('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title={step === 'request' ? t('forgotTitle') : t('resetTitle')}
      description={step === 'request' ? t('forgotBody') : undefined}
    >
      {step === 'request' ? (
        <form className="flex flex-col gap-5" onSubmit={requestOtp}>
          <div className="space-y-2">
            <Label>{t('email')}</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button className="h-11 w-full font-semibold" disabled={busy}>
            {busy ? tc('loading') : t('sendOtp')}
          </Button>
          <AuthLinkRow links={[{ href: '/login', label: t('backLogin') }]} />
        </form>
      ) : (
        <form className="flex flex-col gap-5" onSubmit={reset}>
          <div className="space-y-2">
            <Label>{t('otp')}</Label>
            <Input
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('newPassword')}</Label>
            <Input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <Button className="h-11 w-full font-semibold" disabled={busy}>
            {busy ? tc('loading') : t('resetSubmit')}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
