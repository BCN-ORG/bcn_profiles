'use client';

import { FormEvent, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Link } from '@/i18n/navigation';
import { Button, PageHeader, StatusBadge } from '@/components/ui/primitives';
import { securityService } from '@/services';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

  return (
    <PageShell>
      <PageHeader title={t('title')} />
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>{t('twoFactor')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('recommended')}</p>
            {typeof status.data?.backupCodesRemaining === 'number' ? (
              <p className="text-sm text-muted-foreground">
                {t('backupLeft', { count: status.data.backupCodesRemaining })}
              </p>
            ) : null}
          </div>
          <StatusBadge status={enabled ? 'TWO_FA_ON' : 'TWO_FA_OFF'} />
        </CardHeader>
        <CardContent className="space-y-4">
          {backupCodes.length > 0 ? (
            <Alert>
              <AlertDescription>
                {t('saveBackup')} {backupCodes.join(' · ')}
              </AlertDescription>
            </Alert>
          ) : null}

          {enabled ? (
            <form className="grid gap-4 md:grid-cols-2" onSubmit={disable}>
              <div className="space-y-2">
                <Label>{t('password')}</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t('totpCode')}</Label>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Button variant="danger" disabled={busy}>
                  {t('disable')}
                </Button>
              </div>
            </form>
          ) : setup?.qrCode ? (
            <form className="grid gap-4" onSubmit={confirmEnable}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="mx-auto w-48 rounded-lg border"
                src={setup.qrCode}
                alt="QR"
              />
              <code className="block rounded-md bg-muted px-3 py-2 text-center text-sm">
                {setup.secret}
              </code>
              <div className="space-y-2">
                <Label>{tl('code')}</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>
              <Button disabled={busy}>{tc('confirm')}</Button>
            </form>
          ) : (
            <form className="grid gap-4 md:grid-cols-2" onSubmit={startEnable}>
              <div className="space-y-2">
                <Label>{t('password')}</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-end">
                <Button disabled={busy}>{t('enable')}</Button>
              </div>
            </form>
          )}

          <p className="text-sm text-muted-foreground">
            <Link href="/2fa-recovery" className="hover:text-foreground">
              {t('lostAccess')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </PageShell>
  );
}
