'use client';

import { FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/auth-provider';
import { Button, PageHeader } from '@/components/ui/primitives';
import { profileService } from '@/services';

export default function AccountPage() {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const { user, refresh } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await profileService.update({ fullName, phone });
      await refresh();
      toast.success(tc('save'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <PageHeader title={t('title')} />
      <form className="card form-grid" onSubmit={onSubmit}>
        <label>
          {t('fullName')}
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label>
          {t('email')}
          <input value={user.email} disabled />
        </label>
        <label>
          {t('phone')}
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <div className="info">
          <span>{t('role')}</span>
          <strong>{user.role}</strong>
        </div>
        <div className="info">
          <span>{t('status')}</span>
          <strong>{user.status || 'ACTIVE'}</strong>
        </div>
        <Button disabled={busy}>{t('save')}</Button>
      </form>
    </div>
  );
}
