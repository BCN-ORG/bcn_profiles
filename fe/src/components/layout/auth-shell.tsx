'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Layers, ShieldCheck } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from '@/components/auth/auth-provider';
import { ThemeToggle } from '@/components/theme/theme-provider';
import { cn } from '@/lib/utils';

const FEATURES = [
  { icon: ShieldCheck, key: 'f1' as const },
  { icon: Layers, key: 'f2' as const },
  { icon: CheckCircle2, key: 'f3' as const },
];

export function AuthShell({
  children,
  title,
  description,
  className,
}: {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}) {
  const tb = useTranslations('brand');
  const ta = useTranslations('authShell');

  return (
    <div className="auth-canvas relative min-h-[100dvh]">
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <ThemeToggle />
        <LocaleSwitcher />
      </div>

      <div className="mx-auto grid min-h-[100dvh] w-full max-w-6xl lg:grid-cols-[1fr_minmax(0,420px)] lg:gap-16 lg:px-8">
        {/* Hero — desktop */}
        <section className="hidden flex-col justify-center px-6 py-16 lg:flex lg:px-0 lg:py-24">
          <div className="animate-enter mb-10 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-success font-bold text-success-foreground shadow-lg shadow-success/25">
              B
            </span>
            <div>
              <p className="text-lg font-semibold tracking-tight">BCN</p>
              <p className="text-sm text-muted-foreground">Account Center</p>
            </div>
          </div>

          <div className="animate-enter animate-enter-delay-1 space-y-5">
            <h1 className="max-w-[14ch] text-[2.75rem] leading-[1.05] font-semibold tracking-tight text-balance">
              {tb('tagline')}
            </h1>
            <p className="max-w-md text-base leading-relaxed text-muted-foreground">
              {ta('heroSubtitle')}
            </p>
          </div>

          <ul className="animate-enter animate-enter-delay-2 mt-12 space-y-4">
            {FEATURES.map(({ icon: Icon, key }) => (
              <li
                key={key}
                className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur-sm"
              >
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-medium">{ta(`${key}Title`)}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {ta(`${key}Body`)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Form column */}
        <div className="flex flex-col justify-center px-4 py-16 sm:px-6 lg:px-0 lg:py-24">
          {/* Mobile brand */}
          <div className="animate-enter mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-success font-bold text-success-foreground">
              B
            </span>
            <div>
              <p className="font-semibold">BCN Account</p>
              <p className="text-xs text-muted-foreground">{tb('name')}</p>
            </div>
          </div>

          <div
            className={cn(
              'animate-enter animate-enter-delay-1 w-full',
              className,
            )}
          >
            {(title || description) && (
              <header className="mb-6 space-y-2">
                {title ? (
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {title}
                  </h2>
                ) : null}
                {description ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                ) : null}
              </header>
            )}
            <div className="auth-panel rounded-3xl p-6 sm:p-8">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="relative py-2">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border/80" />
      </div>
      <p className="relative mx-auto w-fit bg-transparent px-3 text-xs text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export function AuthLinkRow({
  links,
}: {
  links: { href: string; label: string }[];
}) {
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-sm text-muted-foreground">
      {links.map((link, i) => (
        <span key={link.href} className="inline-flex items-center gap-3">
          {i > 0 ? <span className="text-border" aria-hidden>·</span> : null}
          <Link
            href={link.href}
            className="font-medium text-foreground/80 underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            {link.label}
          </Link>
        </span>
      ))}
    </p>
  );
}
