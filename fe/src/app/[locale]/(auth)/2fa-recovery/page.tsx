'use client';

import { FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AuthLinkRow, AuthShell } from '@/components/layout/auth-shell';
import { Button } from '@/components/ui/primitives';
import { authService } from '@/services';
import { useRouter } from '@/i18n/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TwoFactorRecoveryPage() {
  const t = useTranslations('recovery');
  const tc = useTranslations('common');
  const router = useRouter();
  const [step, setStep] = useState<'request' | 'verify' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [busy, setBusy] = useState(false);

  async function request(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await authService.recoveryRequest(email);
      toast.success(t('otpSent'));
      setStep('verify');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await authService.recoveryVerify(email, otp);
      setRecoveryToken(result.recoveryToken);
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
      await authService.recoveryReset(password, recoveryToken);
      toast.success(t('resetOk'));
      router.replace('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  const title =
    step === 'request'
      ? t('title')
      : step === 'verify'
        ? t('otp')
        : t('password');

  return (
    <AuthShell title={title} description={t('subtitle')}>
      <form
        className="flex flex-col gap-5"
        onSubmit={
          step === 'request' ? request : step === 'verify' ? verify : reset
        }
      >
        {step === 'request' ? (
          <div className="space-y-2">
            <Label>{t('email')}</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        ) : null}
        {step === 'verify' ? (
          <div className="space-y-2">
            <Label>{t('otp')}</Label>
            <Input
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>
        ) : null}
        {step === 'reset' ? (
          <div className="space-y-2">
            <Label>{t('password')}</Label>
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        ) : null}
        <Button className="h-11 w-full font-semibold" disabled={busy}>
          {busy
            ? tc('loading')
            : step === 'request'
              ? t('sendOtp')
              : step === 'verify'
                ? tc('continue')
                : t('resetSubmit')}
        </Button>
        <AuthLinkRow links={[{ href: '/login', label: t('backLogin') }]} />
      </form>
    </AuthShell>
  );
}
