'use client';

import { FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/auth-provider';
import { useStatusLabel } from '@/hooks/use-status-label';
import { Button, PageHeader } from '@/components/ui/primitives';
import { putAvatarFile } from '@/lib/avatar-upload';
import { authService, profileService } from '@/services';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PageShell } from '@/components/layout/page-shell';

export default function AccountPage() {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const label = useStatusLabel();
  const { user, refresh, setUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [busy, setBusy] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailStep, setEmailStep] = useState<'idle' | 'otp'>('idle');
  const [avatarBusy, setAvatarBusy] = useState(false);

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

  async function onAvatar(file: File | null) {
    if (!file) return;
    setAvatarBusy(true);
    try {
      const sig = await profileService.avatarSignature();
      const maxMb = (sig.maxBytes / 1024 / 1024).toFixed(1);
      await putAvatarFile(
        file,
        sig,
        t('avatarInvalidType'),
        t('avatarTooLarge', { maxMb }),
        t('avatarFail'),
      );
      const updated = await profileService.setAvatar(
        sig.secureUrl,
        sig.publicId,
      );
      setUser(updated);
      await refresh();
      toast.success(t('avatarOk'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
    } finally {
      setAvatarBusy(false);
    }
  }

  async function requestEmail(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await authService.requestEmailChange(newEmail);
      setEmailStep('otp');
      toast.success(t('emailOtpSent'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  async function confirmEmail(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await authService.confirmEmailChange(newEmail, emailOtp);
      setEmailStep('idle');
      setNewEmail('');
      setEmailOtp('');
      await refresh();
      toast.success(t('emailChanged'));
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
        <CardHeader>
          <CardTitle>{t('avatar')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Avatar size="lg">
            {user.avatar ? <AvatarImage src={user.avatar} alt="" /> : null}
            <AvatarFallback>
              {(user.fullName || user.email).slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Button asChild variant="secondary" disabled={avatarBusy}>
            <label>
              {avatarBusy ? tc('loading') : t('uploadAvatar')}
              <input
                type="file"
                accept="image/*"
                hidden
                disabled={avatarBusy}
                onChange={(e) => void onAvatar(e.target.files?.[0] ?? null)}
              />
            </label>
          </Button>
          {user.avatar ? (
            <Button
              type="button"
              variant="ghost"
              disabled={avatarBusy}
              onClick={() =>
                void profileService
                  .clearAvatar()
                  .then(async () => {
                    await refresh();
                    toast.success(t('avatarCleared'));
                  })
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              {t('clearAvatar')}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>{t('fullName')}</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('email')}</Label>
              <Input value={user.email} disabled />
            </div>
            <div className="space-y-2">
              <Label>{t('phone')}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('role')}</span>
              <strong>{label(user.role)}</strong>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('status')}</span>
              <strong>{label(user.status || 'ACTIVE')}</strong>
            </div>
            <div className="md:col-span-2">
              <Button disabled={busy}>{t('save')}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={emailStep === 'idle' ? requestEmail : confirmEmail}
          >
            <h3 className="text-base font-medium md:col-span-2">
              {t('changeEmail')}
            </h3>
            <div className="space-y-2">
              <Label>{t('newEmail')}</Label>
              <Input
                type="email"
                required
                value={newEmail}
                disabled={emailStep === 'otp'}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            {emailStep === 'otp' ? (
              <div className="space-y-2">
                <Label>{t('emailOtp')}</Label>
                <Input
                  required
                  maxLength={6}
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value)}
                />
              </div>
            ) : null}
            <div className="md:col-span-2">
              <Button disabled={busy}>
                {emailStep === 'idle' ? t('requestEmail') : t('confirmEmail')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageShell>
  );
}
