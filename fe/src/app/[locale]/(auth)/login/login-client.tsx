'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { authService } from '@/services';
import { useAuth, LocaleSwitcher } from '@/components/auth/auth-provider';
import { ThemeToggle } from '@/components/theme/theme-provider';
import { Button } from '@/components/ui/primitives';
import { useRouter } from '@/i18n/navigation';
import { needsOnboarding } from '@/lib/onboarding';
import type { User } from '@/types';

type AuthStep =
  | { kind: 'login' }
  | { kind: 'verify'; token: string; method: 'totp' | 'email' | 'backup-code' }
  | { kind: 'setup'; token: string; secret?: string; qrCode?: string };

const SOCIAL_ICONS = {
  google: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  ),
  github: (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden
      fill="currentColor"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  ),
  discord: (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden
      fill="#5865F2"
    >
      <path d="M20.317 4.37a19.8 19.8 0 0 0-4.885-1.515.074.074 0 0 0-.078.037c-.211.375-.445.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25.077.077 0 0 0-.078-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.028C.533 9.046-.319 13.58.099 18.058a.08.08 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.042-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.106c.36.699.772 1.363 1.225 1.993a.076.076 0 0 0 .084.029 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.211 0 2.176 1.096 2.157 2.419 0 1.333-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.176 1.096 2.157 2.419 0 1.333-.946 2.419-2.157 2.419z" />
    </svg>
  ),
} as const;

export default function LoginPage() {
  const t = useTranslations('login');
  const tb = useTranslations('brand');
  const tc = useTranslations('common');
  const { refresh, setUser, user, isLoading } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [step, setStep] = useState<AuthStep>({ kind: 'login' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(needsOnboarding(user) ? '/welcome' : next);
    }
  }, [isLoading, user, router, next]);

  useEffect(() => {
    const oauth = search.get('oauth');
    if (oauth === 'not_linked') {
      toast.message(
        t('socialNotLinked', { provider: search.get('provider') || 'OAuth' }),
      );
    } else if (oauth === 'cancelled' || oauth === 'incomplete') {
      toast.message(t('oauthCancelled'));
    }
  }, [search, t]);

  async function goAfterAuth(fromLogin?: User) {
    if (fromLogin) setUser(fromLogin);
    const result = await refresh();
    const me =
      (result as { data?: User | null }).data ?? fromLogin ?? undefined;
    if (!me) {
      setError(t('sessionFailed'));
      return;
    }
    setUser(me);
    router.replace(needsOnboarding(me) ? '/welcome' : next);
  }

  async function startSocial(
    provider: 'google' | 'github' | 'discord',
    label: string,
  ) {
    try {
      const { authorizationUrl } = await authService.beginSocial(provider);
      location.assign(authorizationUrl);
    } catch (reason) {
      const code =
        reason instanceof ApiError
          ? (reason.details as { code?: string } | undefined)?.code
          : undefined;
      if (
        code === 'OAUTH_NOT_CONFIGURED' ||
        (reason instanceof ApiError &&
          /OAuth is not configured/i.test(reason.message))
      ) {
        toast.error(t('socialUnavailable', { provider: label }));
        return;
      }
      if (code === 'IDENTITY_NOT_LINKED') {
        toast.error(t('socialNotLinked', { provider: label }));
        return;
      }
      toast.error(reason instanceof Error ? reason.message : tc('error'));
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (step.kind === 'login') {
        const result = await authService.login(email, password);
        if (result.requiresTwoFactorSetup && result.setupToken) {
          setStep({ kind: 'setup', token: result.setupToken });
        } else if (
          result.requiresTwoFactorVerification &&
          result.verificationToken
        ) {
          setStep({
            kind: 'verify',
            token: result.verificationToken,
            method: 'totp',
          });
        } else {
          await goAfterAuth(result.user);
        }
      } else if (step.kind === 'verify') {
        await authService.verify2fa(step.method, code, step.token);
        await goAfterAuth();
      } else if (!step.secret) {
        const result = await authService.setupInitiate(password, step.token);
        setStep({
          kind: 'setup',
          token: result.setupToken,
          secret: result.secret,
          qrCode: result.qrCode,
        });
      } else {
        const result = await authService.setupConfirm(
          code,
          step.secret,
          step.token,
        );
        setBackupCodes(result.backupCodes);
        await goAfterAuth();
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="brand">
          <span className="logo-mark">B</span>
          <div>
            <strong>BCN</strong>
            <small>ACCOUNT</small>
          </div>
        </div>
        <div>
          <span className="eyebrow">{tb('name')}</span>
          <h1>{tb('tagline')}</h1>
        </div>
      </section>
      <section className="login-panel">
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <ThemeToggle />
          <LocaleSwitcher />
        </div>
        <form className="auth-card" onSubmit={submit}>
          <span className="eyebrow">BCN IDENTITY</span>
          <h2>
            {step.kind === 'login'
              ? t('title')
              : step.kind === 'verify'
                ? t('verifyTitle')
                : t('setupTitle')}
          </h2>
          <p className="muted">{step.kind === 'login' ? t('subtitle') : null}</p>
          {error ? <div className="alert error">{error}</div> : null}
          {backupCodes.length > 0 ? (
            <div className="alert">Backup: {backupCodes.join(' · ')}</div>
          ) : null}
          {step.kind === 'login' ? (
            <>
              <label>
                {t('email')}
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label>
                {t('password')}
                <span className="password-field">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    aria-label={
                      showPassword ? t('hidePassword') : t('showPassword')
                    }
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </label>
            </>
          ) : null}
          {step.kind === 'verify' ? (
            <>
              <div className="method-tabs">
                {(['totp', 'email', 'backup-code'] as const).map((method) => (
                  <button
                    type="button"
                    key={method}
                    className={step.method === method ? 'active' : ''}
                    onClick={() => setStep({ ...step, method })}
                  >
                    {method === 'totp'
                      ? t('totp')
                      : method === 'email'
                        ? t('emailOtp')
                        : t('backup')}
                  </button>
                ))}
              </div>
              {step.method === 'email' ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    void authService
                      .sendEmailOtp(step.token)
                      .then(() => toast.success('OTP sent'))
                      .catch((e) => toast.error(e.message))
                  }
                >
                  {t('sendEmailOtp')}
                </Button>
              ) : null}
              <label>
                {t('code')}
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </label>
            </>
          ) : null}
          {step.kind === 'setup' && step.qrCode ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="qr" src={step.qrCode} alt="QR" />
              <code className="secret">{step.secret}</code>
              <label>
                {t('code')}
                <input
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </label>
            </>
          ) : null}
          <Button className="btn-wide" disabled={busy}>
            {busy
              ? tc('loading')
              : step.kind === 'login'
                ? t('submit')
                : step.kind === 'setup' && !step.secret
                  ? tc('continue')
                  : tc('confirm')}
          </Button>
          {step.kind === 'login' ? (
            <>
              <p className="muted">{t('social')}</p>
              <div className="social-row">
                {(
                  [
                    ['google', 'Google'],
                    ['github', 'GitHub'],
                    ['discord', 'Discord'],
                  ] as const
                ).map(([provider, label]) => (
                  <Button
                    key={provider}
                    type="button"
                    variant="secondary"
                    className="social-btn"
                    onClick={() => void startSocial(provider, label)}
                  >
                    {SOCIAL_ICONS[provider]}
                    <span>{label}</span>
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep({ kind: 'login' })}
            >
              {t('backToLogin')}
            </Button>
          )}
        </form>
      </section>
    </main>
  );
}
