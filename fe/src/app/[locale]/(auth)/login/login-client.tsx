'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { authService } from '@/services';
import { useAuth } from '@/components/auth/auth-provider';
import {
  AuthDivider,
  AuthLinkRow,
  AuthShell,
} from '@/components/layout/auth-shell';
import { Button } from '@/components/ui/primitives';
import { useRouter } from '@/i18n/navigation';
import { needsOnboarding } from '@/lib/onboarding';
import { clearAuthStep, readAuthStep, writeAuthStep } from '@/lib/auth-step';
import type { User } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SocialIcon } from '@/components/auth/social-icons';
import { OtpCountdown } from '@/components/auth/otp-countdown';
import { oauthAppName } from '@/lib/oauth-app-name';
import {
  clearOauthHandoff,
  resolveOauthReturn,
  writeOauthHandoff,
} from '@/lib/oauth-handoff';

type AuthStep =
  | { kind: 'login' }
  | { kind: 'verify'; token: string; method: 'totp' | 'email' | 'backup-code' }
  | { kind: 'setup'; token: string; secret?: string; qrCode?: string };

function initialAuthStep(): AuthStep {
  return readAuthStep() ?? { kind: 'login' };
}

export default function LoginPage() {
  const t = useTranslations('login');
  const tc = useTranslations('common');
  const to = useTranslations('oauthError');
  const { refresh, setUser, user, isLoading } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') || '/';
  const oauthReturnQuery = search.get('oauth_return');
  const oauthReturn = resolveOauthReturn(oauthReturnQuery);
  const continuingToApp = Boolean(oauthReturn);
  const appName = oauthAppName(search, to('unknownApp'));
  const appReturn = (() => {
    const raw = search.get('app_return')?.trim() || undefined;
    if (!raw) return null;
    try {
      const url = new URL(raw);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      return url.origin;
    } catch {
      return null;
    }
  })();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [step, setStepState] = useState<AuthStep>({ kind: 'login' });
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [emailOtpSentAt, setEmailOtpSentAt] = useState<number | null>(null);
  const [emailOtpBusy, setEmailOtpBusy] = useState(false);

  function setStep(nextStep: AuthStep) {
    setStepState(nextStep);
    if (nextStep.kind === 'login') {
      clearAuthStep();
      setEmailOtpSentAt(null);
    } else {
      writeAuthStep(nextStep);
    }
  }

  function leaveToOauth(url: string) {
    setLeaving(true);
    clearOauthHandoff();
    window.location.replace(url);
  }

  useEffect(() => {
    const stored = initialAuthStep();
    if (stored.kind !== 'login') setStepState(stored);
  }, []);

  useEffect(() => {
    if (oauthReturnQuery) {
      writeOauthHandoff({
        oauthReturn: oauthReturnQuery,
        clientId: search.get('client_id'),
        appName: search.get('app_name'),
        appReturn: search.get('app_return'),
      });
      return;
    }
    // Fresh Profiles login (not mid social/2FA) — drop stale app handoff.
    if (!search.get('oauth') && !search.get('token')) {
      clearOauthHandoff();
    }
  }, [oauthReturnQuery, search]);

  useEffect(() => {
    if (!isLoading && user) {
      clearAuthStep();
      if (needsOnboarding(user)) {
        router.replace('/welcome');
        return;
      }
      const resume = resolveOauthReturn(oauthReturnQuery);
      if (resume) {
        leaveToOauth(resume);
        return;
      }
      router.replace(next);
    }
  }, [isLoading, user, router, next, oauthReturnQuery]);

  useEffect(() => {
    const oauth = search.get('oauth');
    if (oauth === 'not_linked') {
      toast.message(
        t('socialNotLinked', { provider: search.get('provider') || 'OAuth' }),
      );
    } else if (oauth === 'cancelled' || oauth === 'incomplete') {
      toast.message(t('oauthCancelled'));
    } else if (oauth === 'failed') {
      toast.error(t('oauthFailed'));
    } else if (oauth === 'blocked') {
      toast.error(t('oauthBlocked'));
    }
  }, [search, t]);

  useEffect(() => {
    const oauth = search.get('oauth');
    const token = search.get('token');
    if (!token) return;
    if (oauth === '2fa_verify') {
      setStep({ kind: 'verify', token, method: 'totp' });
      toast.message(t('oauthNeeds2fa'));
    } else if (oauth === '2fa_setup') {
      setStep({ kind: 'setup', token });
      toast.message(t('oauthNeeds2faSetup'));
    } else {
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    url.searchParams.delete('oauth');
    const cleaned = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, '', cleaned);
  }, [search, t]);

  async function goAfterAuth(fromLogin?: User) {
    clearAuthStep();
    if (fromLogin) setUser(fromLogin);
    const result = await refresh();
    const me =
      (result as { data?: User | null }).data ?? fromLogin ?? undefined;
    if (!me) {
      setError(t('sessionFailed'));
      return;
    }
    setUser(me);
    if (needsOnboarding(me)) {
      router.replace('/welcome');
      return;
    }
    const resume = resolveOauthReturn(oauthReturnQuery);
    if (resume) {
      leaveToOauth(resume);
      return;
    }
    router.replace(next);
  }

  async function startSocial(
    provider: 'google' | 'github' | 'discord' | 'zalo',
    label: string,
  ) {
    try {
      const resume = resolveOauthReturn(oauthReturnQuery);
      const { authorizationUrl } = await authService.beginSocial(
        provider,
        resume,
      );
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
          setEmailOtpSentAt(null);
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

  async function sendLoginEmailOtp() {
    if (step.kind !== 'verify') return;
    setEmailOtpBusy(true);
    const requestedAt = Date.now();
    try {
      await authService.sendEmailOtp(step.token);
      setEmailOtpSentAt(requestedAt);
      toast.success(t('emailOtpSent'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
    } finally {
      setEmailOtpBusy(false);
    }
  }

  const title =
    step.kind === 'login'
      ? continuingToApp
        ? t('oauthTitle', { app: appName })
        : t('title')
      : step.kind === 'verify'
        ? t('verifyTitle')
        : t('setupTitle');

  const description =
    step.kind === 'login'
      ? continuingToApp
        ? t('oauthSubtitle', { app: appName })
        : t('subtitle')
      : undefined;

  if (leaving) {
    return (
      <AuthShell title={t('oauthLeaving', { app: appName })}>
        <p className="text-center text-sm text-muted-foreground">
          {t('oauthLeaving', { app: appName })}
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={title} description={description}>
      <form className="flex flex-col gap-5" onSubmit={submit}>
        {continuingToApp && step.kind === 'login' ? (
          <Alert>
            <AlertDescription>
              {t('oauthBanner', { app: appName })}
            </AlertDescription>
          </Alert>
        ) : null}
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {backupCodes.length > 0 ? (
          <Alert>
            <AlertDescription>
              Backup: {backupCodes.join(' · ')}
            </AlertDescription>
          </Alert>
        ) : null}

        {step.kind === 'login' ? (
          <>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('email')}</Label>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('password')}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-11"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-0.5 right-0.5 size-10"
                  aria-label={
                    showPassword ? t('hidePassword') : t('showPassword')
                  }
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? (
                    <EyeOff size={18} aria-hidden />
                  ) : (
                    <Eye size={18} aria-hidden />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : null}

        {step.kind === 'verify' ? (
          <>
            <Tabs
              value={step.method}
              onValueChange={(method) =>
                setStep({
                  ...step,
                  method: method as 'totp' | 'email' | 'backup-code',
                })
              }
            >
              <TabsList className="grid h-10 w-full grid-cols-3">
                {(['totp', 'email', 'backup-code'] as const).map((method) => (
                  <TabsTrigger key={method} value={method} className="text-xs">
                    {method === 'totp'
                      ? t('totp')
                      : method === 'email'
                        ? t('emailOtp')
                        : t('backup')}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            {step.method === 'email' ? (
              emailOtpSentAt ? (
                <OtpCountdown
                  sentAt={emailOtpSentAt}
                  onResend={sendLoginEmailOtp}
                />
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full"
                  disabled={emailOtpBusy}
                  onClick={() => void sendLoginEmailOtp()}
                >
                  {emailOtpBusy ? tc('loading') : t('sendEmailOtp')}
                </Button>
              )
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="login-verification-code">{t('code')}</Label>
              <Input
                id="login-verification-code"
                inputMode={step.method === 'backup-code' ? 'text' : 'numeric'}
                autoComplete={
                  step.method === 'backup-code' ? 'off' : 'one-time-code'
                }
                maxLength={step.method === 'backup-code' ? 8 : 6}
                value={code}
                onChange={(e) =>
                  setCode(
                    step.method === 'backup-code'
                      ? e.target.value.toUpperCase().slice(0, 8)
                      : e.target.value.replace(/\D/g, '').slice(0, 6),
                  )
                }
                required
              />
            </div>
          </>
        ) : null}

        {step.kind === 'setup' && !step.qrCode ? (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('password')}</Label>
            <Input
              type="password"
              autoComplete="current-password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              {t('setupPasswordHint')}
            </p>
          </div>
        ) : null}

        {step.kind === 'setup' && step.qrCode ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="mx-auto rounded-2xl border bg-white p-3 shadow-sm"
              src={step.qrCode}
              alt="QR"
            />
            <code className="block rounded-xl bg-muted/60 px-3 py-2.5 text-center text-xs">
              {step.secret}
            </code>
            <div className="space-y-2">
              <Label>{t('code')}</Label>
              <Input
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
          </>
        ) : null}

        <Button className="h-11 w-full text-base font-semibold" disabled={busy}>
          {busy
            ? tc('loading')
            : step.kind === 'login'
              ? continuingToApp
                ? t('oauthSubmit')
                : t('submit')
              : step.kind === 'setup' && !step.secret
                ? tc('continue')
                : tc('confirm')}
        </Button>

        {continuingToApp && appReturn && step.kind === 'login' ? (
          <Button asChild variant="ghost" className="h-11 w-full">
            <a href={appReturn}>{t('backToApp', { app: appName })}</a>
          </Button>
        ) : null}

        {step.kind === 'login' ? (
          <>
            <AuthLinkRow
              links={[
                { href: '/forgot-password', label: t('forgot') },
                { href: '/register', label: t('register') },
                { href: '/2fa-recovery', label: t('recovery') },
              ]}
            />
            <AuthDivider label={t('social')} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  ['google', 'Google'],
                  ['github', 'GitHub'],
                  ['discord', 'Discord'],
                  ['zalo', 'Zalo'],
                ] as const
              ).map(([provider, label]) => (
                <Button
                  key={provider}
                  type="button"
                  variant="outline"
                  className="h-12 flex-col gap-1.5 rounded-xl py-2"
                  onClick={() => void startSocial(provider, label)}
                >
                  <SocialIcon provider={provider} />
                  <span className="text-[11px] font-medium">{label}</span>
                </Button>
              ))}
            </div>
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setStep({ kind: 'login' })}
          >
            {t('backToLogin')}
          </Button>
        )}
      </form>
    </AuthShell>
  );
}
