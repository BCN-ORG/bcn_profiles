'use client';

import { FormEvent, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  Download,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from '@/i18n/navigation';
import {
  Button,
  PageHeader,
  Skeleton,
  StatusBadge,
} from '@/components/ui/primitives';
import { securityService } from '@/services';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { PageShell } from '@/components/layout/page-shell';

export default function SecurityPage() {
  const t = useTranslations('security');
  const tc = useTranslations('common');
  const tl = useTranslations('login');
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: ['me', '2fa'],
    queryFn: securityService.status,
  });
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [setup, setSetup] = useState<{
    token: string;
    secret?: string;
    qrCode?: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const enabled = Boolean(status.data?.twoFactorEnabled);
  const required = Boolean(status.data?.twoFactorRequired);

  async function startEnable(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await securityService.enableInitiate(password);
      setSetup({
        token: result.setupToken,
        secret: result.secret,
        qrCode: result.qrCode,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnable(event: FormEvent) {
    event.preventDefault();
    if (!setup?.secret) return;
    setBusy(true);
    try {
      const result = await securityService.enableConfirm(
        code,
        setup.secret,
        setup.token,
      );
      setBackupCodes(result.backupCodes || []);
      setSetup(null);
      setCode('');
      setPassword('');
      await queryClient.invalidateQueries({ queryKey: ['me', '2fa'] });
      toast.success(t('enabled'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  async function disable(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await securityService.disable(password, totpCode);
      await queryClient.invalidateQueries({ queryKey: ['me', '2fa'] });
      toast.success(t('disabled'));
      setPassword('');
      setTotpCode('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  function downloadBackupCodes() {
    const content = [
      t('backupFileTitle'),
      '',
      t('backupFileWarning'),
      '',
      ...backupCodes,
      '',
    ].join('\n');
    const url = URL.createObjectURL(
      new Blob(['\uFEFF', content], { type: 'text/plain;charset=utf-8' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'bcn-account-backup-codes.txt';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success(t('backupDownloaded'));
  }

  return (
    <PageShell>
      <PageHeader title={t('title')} description={t('subtitle')} />

      {backupCodes.length > 0 ? (
        <Card className="border-success/30 bg-success/[0.045] shadow-none">
          <CardHeader className="border-b border-success/15 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <KeyRound className="size-4 text-success" aria-hidden />
                {t('backupTitle')}
              </CardTitle>
              <CardDescription>{t('backupDescription')}</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-3 bg-background sm:mt-0"
              onClick={downloadBackupCodes}
            >
              <Download className="size-4" aria-hidden />
              {t('downloadBackup')}
            </Button>
          </CardHeader>
          <CardContent className="pt-5">
            <ul
              className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
              aria-label={t('backupTitle')}
            >
              {backupCodes.map((backupCode) => (
                <li
                  key={backupCode}
                  className="rounded-lg border border-success/20 bg-background px-3 py-2 text-center font-mono text-sm font-semibold tracking-wider"
                >
                  {backupCode}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {t('backupOnce')}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader className="border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="size-5" aria-hidden />
              </span>
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold">
                  {t('twoFactor')}
                </CardTitle>
                <CardDescription>
                  {enabled ? t('enabledDescription') : t('disabledDescription')}
                </CardDescription>
              </div>
            </div>
            {status.isLoading ? (
              <Skeleton className="mt-3 h-6 w-20 rounded-full sm:mt-0" />
            ) : status.isError ? null : (
              <StatusBadge
                className="mt-3 sm:mt-0"
                status={enabled ? 'TWO_FA_ON' : 'TWO_FA_OFF'}
              />
            )}
          </CardHeader>

          <CardContent className="pt-6">
            {status.isLoading ? (
              <div className="space-y-4" aria-label={tc('loading')}>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-11 w-full max-w-md" />
                <Skeleton className="h-10 w-32" />
              </div>
            ) : status.isError ? (
              <Alert variant="destructive">
                <TriangleAlert aria-hidden />
                <AlertTitle>{tc('error')}</AlertTitle>
                <AlertDescription className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void status.refetch()}
                  >
                    {t('retry')}
                  </Button>
                </AlertDescription>
              </Alert>
            ) : enabled ? (
              <div className="space-y-7">
                <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{t('protected')}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {typeof status.data?.backupCodesRemaining === 'number'
                        ? t('backupLeft', {
                            count: status.data.backupCodesRemaining,
                          })
                        : t('backupStatusUnknown')}
                    </p>
                  </div>
                  <Smartphone
                    className="size-5 shrink-0 text-primary"
                    aria-hidden
                  />
                </div>

                {required ? (
                  <Alert>
                    <LockKeyhole aria-hidden />
                    <AlertTitle>{t('requiredTitle')}</AlertTitle>
                    <AlertDescription>{t('requiredDescription')}</AlertDescription>
                  </Alert>
                ) : (
                  <section className="border-t border-border pt-6">
                    <div className="mb-4 max-w-2xl">
                      <h2 className="font-semibold text-destructive">
                        {t('dangerTitle')}
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {t('dangerDescription')}
                      </p>
                    </div>
                    <form
                      className="grid max-w-2xl gap-4 md:grid-cols-2"
                      onSubmit={disable}
                    >
                      <div className="space-y-2">
                        <Label htmlFor="disable-password">{t('password')}</Label>
                        <Input
                          id="disable-password"
                          type="password"
                          autoComplete="current-password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="disable-totp">{t('totpCode')}</Label>
                        <Input
                          id="disable-totp"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          pattern="[0-9]*"
                          maxLength={6}
                          value={totpCode}
                          onChange={(event) => setTotpCode(event.target.value)}
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Button variant="danger" disabled={busy}>
                          {busy ? tc('loading') : t('disable')}
                        </Button>
                      </div>
                    </form>
                  </section>
                )}
              </div>
            ) : setup?.qrCode ? (
              <form className="space-y-6" onSubmit={confirmEnable}>
                <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
                  <div className="rounded-xl border border-border bg-white p-4 dark:bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="mx-auto aspect-square w-full max-w-48"
                      src={setup.qrCode}
                      alt={t('qrAlt')}
                    />
                  </div>
                  <div className="space-y-5">
                    <div>
                      <h2 className="font-semibold">{t('scanTitle')}</h2>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {t('scanDescription')}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('manualKey')}</Label>
                      <code className="block break-all rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm">
                        {setup.secret}
                      </code>
                    </div>
                    <div className="max-w-sm space-y-2">
                      <Label htmlFor="setup-code">{tl('code')}</Label>
                      <Input
                        id="setup-code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 border-t border-border pt-5">
                  <Button disabled={busy}>
                    {busy ? tc('loading') : tc('confirm')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setSetup(null);
                      setCode('');
                    }}
                  >
                    {tc('cancel')}
                  </Button>
                </div>
              </form>
            ) : (
              <form className="max-w-xl space-y-5" onSubmit={startEnable}>
                <div>
                  <h2 className="font-semibold">{t('enableTitle')}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {t('enableDescription')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enable-password">{t('password')}</Label>
                  <Input
                    id="enable-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
                <Button disabled={busy}>
                  {busy ? tc('loading') : t('enable')}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="border-b border-border pb-5">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <KeyRound className="size-4 text-primary" aria-hidden />
              {t('recoveryTitle')}
            </CardTitle>
            <CardDescription>{t('recoveryDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            <p className="text-sm leading-6 text-muted-foreground">
              {t('downloadHint')}
            </p>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link href="/2fa-recovery">
                {t('lostAccess')}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
