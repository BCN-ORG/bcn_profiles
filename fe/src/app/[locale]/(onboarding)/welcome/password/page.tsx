'use client';

import { FormEvent, useState } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/primitives';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from '@/i18n/navigation';
import { authService } from '@/services';

export default function WelcomePasswordPage() {
  const t = useTranslations('welcome');
  const tl = useTranslations('login');
  const tc = useTranslations('common');
  const { refresh } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [visible, setVisible] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t('passwordMismatch'));
      return;
    }
    setBusy(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      await refresh();
      toast.success(t('passwordChanged'));
      router.replace('/welcome/discord');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
      setBusy(false);
    }
  }

  return (
    <Card className="auth-panel overflow-hidden border-0 shadow-none">
      <CardHeader className="space-y-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <KeyRound className="size-3.5" aria-hidden />
          {t('passwordEyebrow')}
        </span>
        <CardTitle className="text-xl font-semibold">
          {t('passwordTitle')}
        </CardTitle>
        <CardDescription className="text-base leading-relaxed">
          {t('passwordBody')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="current-password">{t('currentPassword')}</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={visible.current ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="pr-11"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-0.5 right-0.5 size-10"
                aria-label={
                  visible.current ? tl('hidePassword') : tl('showPassword')
                }
                onClick={() =>
                  setVisible((value) => ({
                    ...value,
                    current: !value.current,
                  }))
                }
              >
                {visible.current ? (
                  <EyeOff size={18} aria-hidden />
                ) : (
                  <Eye size={18} aria-hidden />
                )}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">{t('newPassword')}</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={visible.next ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={8}
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="pr-11"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-0.5 right-0.5 size-10"
                aria-label={
                  visible.next ? tl('hidePassword') : tl('showPassword')
                }
                onClick={() =>
                  setVisible((value) => ({
                    ...value,
                    next: !value.next,
                  }))
                }
              >
                {visible.next ? (
                  <EyeOff size={18} aria-hidden />
                ) : (
                  <Eye size={18} aria-hidden />
                )}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t('confirmPassword')}</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={visible.confirm ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="pr-11"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-0.5 right-0.5 size-10"
                aria-label={
                  visible.confirm ? tl('hidePassword') : tl('showPassword')
                }
                onClick={() =>
                  setVisible((value) => ({
                    ...value,
                    confirm: !value.confirm,
                  }))
                }
              >
                {visible.confirm ? (
                  <EyeOff size={18} aria-hidden />
                ) : (
                  <Eye size={18} aria-hidden />
                )}
              </Button>
            </div>
          </div>
          <Button className="h-11 w-full font-semibold" disabled={busy}>
            {busy ? tc('loading') : t('changePassword')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
