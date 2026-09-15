'use client';

import { FormEvent, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button, PageHeader, StatusBadge } from '@/components/ui/primitives';
import { request } from '@/lib/api';
import { securityService } from '@/services';

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
  const [setup, setSetup] = useState<{
    token: string;
    secret?: string;
    qrCode?: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  async function startEnable(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await request.post<{
        secret: string;
        qrCode: string;
        setupToken: string;
      }>('/auth/2fa/me/enable/initiate', { password });
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
      await request.post(
        '/auth/2fa/me/enable/confirm',
        { code, secret: setup.secret },
        { Authorization: `Bearer ${setup.token}` },
      );
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
      await securityService.disable(password);
      await queryClient.invalidateQueries({ queryKey: ['me', '2fa'] });
      toast.success(t('disabled'));
      setPassword('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <PageHeader title={t('title')} />
      <article className="card stack">
        <div className="provider-head">
          <div>
            <h3>{t('twoFactor')}</h3>
            <p className="muted">{t('recommended')}</p>
          </div>
          <StatusBadge
            status={status.data?.enabled ? t('enabled') : t('disabled')}
          />
        </div>

        {status.data?.enabled ? (
          <form className="form-grid" onSubmit={disable}>
            <label>
              {t('password')}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <Button variant="danger" disabled={busy}>
              {t('disable')}
            </Button>
          </form>
        ) : setup?.qrCode ? (
          <form className="form-grid" onSubmit={confirmEnable}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="qr" src={setup.qrCode} alt="QR" />
            <code className="secret">{setup.secret}</code>
            <label>
              {tl('code')}
              <input value={code} onChange={(e) => setCode(e.target.value)} required />
            </label>
            <Button disabled={busy}>{tc('confirm')}</Button>
          </form>
        ) : (
          <form className="form-grid" onSubmit={startEnable}>
            <label>
              {t('password')}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <Button disabled={busy}>{t('enable')}</Button>
          </form>
        )}
      </article>
    </div>
  );
}
