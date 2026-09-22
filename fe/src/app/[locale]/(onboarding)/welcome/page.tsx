'use client';

import { CheckCircle2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/primitives';
import { useAuth } from '@/components/auth/auth-provider';
import { useRouter } from '@/i18n/navigation';
import { isAdmin } from '@/lib/onboarding';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function WelcomePage() {
  const t = useTranslations('welcome');
  const tn = useTranslations('nav');
  const { user } = useAuth();
  const router = useRouter();
  const name = user?.fullName?.split(' ')[0] || 'BCN';

  return (
    <Card className="auth-panel overflow-hidden border-0 shadow-none">
      <CardHeader className="space-y-4 pb-2">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="size-3.5" aria-hidden />
          {t('eyebrow')}
        </span>
        <CardTitle className="text-2xl font-semibold tracking-tight md:text-3xl">
          {t('hello', { name })}
        </CardTitle>
        <CardDescription className="text-base leading-relaxed">
          {t('intro')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ul className="space-y-3">
          {[t('point1'), t('point2'), t('point3')].map((point) => (
            <li
              key={point}
              className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/50 p-3.5 text-sm"
            >
              <CheckCircle2
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden
              />
              <span className="text-muted-foreground">{point}</span>
            </li>
          ))}
        </ul>
        <Button
          className="h-11 w-full text-base font-semibold"
          onClick={() =>
            router.push(
              user?.metadata?.mustChangePassword
                ? '/welcome/password'
                : '/welcome/discord',
            )
          }
        >
          {t('start')}
        </Button>
        {isAdmin(user) ? (
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => router.push('/admin/users')}
          >
            {tn('adminUsers')}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
