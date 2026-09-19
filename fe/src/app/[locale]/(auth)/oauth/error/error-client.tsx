'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { AuthLinkRow, AuthShell } from '@/components/layout/auth-shell';
import { Button } from '@/components/ui/primitives';
import { Link } from '@/i18n/navigation';
import { oauthAppName } from '@/lib/oauth-app-name';
import {
  isOauthAuthorizeReturn,
  readOauthHandoff,
} from '@/lib/oauth-handoff';

const CODES = [
  'APP_ACCESS_DENIED',
  'APP_DISABLED',
  'STEP_UP_AUTH_REQUIRED',
  'ACCOUNT_BLOCKED',
  'MEMBERSHIP_REQUIRED',
  'OAUTH_REDIRECT_URI_INVALID',
  'APPLICATION_NOT_FOUND',
  'OAUTH_ERROR',
] as const;

type ErrorCode = (typeof CODES)[number];

function errorCode(value: string | null): ErrorCode {
  return CODES.find((code) => code === value) ?? 'OAUTH_ERROR';
}

function safeAppReturn(value: string | null): string | null {
  const raw = value?.trim() || readOauthHandoff()?.appReturn || null;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

function safeOauthReturn(value: string | null): string | null {
  if (value && isOauthAuthorizeReturn(value)) return value;
  const handoff = readOauthHandoff()?.oauthReturn;
  return handoff && isOauthAuthorizeReturn(handoff) ? handoff : null;
}

export default function OauthErrorPage() {
  const t = useTranslations('oauthError');
  const search = useSearchParams();
  const code = errorCode(search.get('code'));
  const appName = oauthAppName(search, t('unknownApp'));
  const oauthReturn = safeOauthReturn(search.get('oauth_return'));
  const appReturn = safeAppReturn(search.get('app_return'));
  const primaryHref =
    code === 'MEMBERSHIP_REQUIRED' ? '/membership' : '/applications';
  const primaryLabel =
    code === 'MEMBERSHIP_REQUIRED' ? t('fixMembership') : t('viewApps');

  return (
    <AuthShell
      title={t(`${code}.title`)}
      description={t(`${code}.body`, { app: appName })}
    >
      <div className="flex flex-col gap-5">
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <ShieldAlert
            className="mt-0.5 size-4 shrink-0 text-destructive"
            aria-hidden
          />
          <span>{t('hint')}</span>
        </p>
        <Button asChild className="h-11 w-full font-semibold">
          <Link href={primaryHref}>{primaryLabel}</Link>
        </Button>
        {oauthReturn ? (
          <Button asChild variant="outline" className="h-11 w-full font-semibold">
            <a href={oauthReturn}>{t('retry')}</a>
          </Button>
        ) : null}
        {appReturn ? (
          <Button asChild variant="ghost" className="h-11 w-full">
            <a href={appReturn}>{t('backToApp', { app: appName })}</a>
          </Button>
        ) : null}
        <AuthLinkRow
          links={[
            { href: '/connections', label: t('connections') },
            { href: '/security', label: t('security') },
            { href: '/', label: t('home') },
          ]}
        />
      </div>
    </AuthShell>
  );
}
