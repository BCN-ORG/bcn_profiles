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

export default function RegisterPage() {
  const t = useTranslations('register');
  const tc = useTranslations('common');
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await authService.register(form);
      toast.success(t('success'));
      router.replace('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title={t('title')} description={t('subtitle')}>
      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        {(
          [
            ['fullName', t('fullName'), 'text'],
            ['email', t('email'), 'email'],
            ['phone', t('phone'), 'tel'],
            ['password', t('password'), 'password'],
          ] as const
        ).map(([key, label, type]) => (
          <div key={key} className="space-y-2">
            <Label className="text-sm font-medium">{label}</Label>
            <Input
              type={type}
              required
              minLength={key === 'password' ? 6 : undefined}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </div>
        ))}
        <Button className="h-11 w-full text-base font-semibold" disabled={busy}>
          {busy ? tc('loading') : t('submit')}
        </Button>
        <AuthLinkRow links={[{ href: '/login', label: t('haveAccount') }]} />
      </form>
    </AuthShell>
  );
}
