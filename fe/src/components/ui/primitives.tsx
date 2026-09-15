import * as React from 'react';
import { Button as ShadcnButton, buttonVariants } from '@/components/ui/button';
import { Skeleton as ShadcnSkeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import type { VariantProps } from 'class-variance-authority';

const variantMap = {
  primary: 'default',
  secondary: 'secondary',
  ghost: 'ghost',
  danger: 'destructive',
  default: 'default',
  outline: 'outline',
  destructive: 'destructive',
  link: 'link',
} as const;

type LegacyVariant = keyof typeof variantMap;

export function Button({
  variant = 'primary',
  className,
  size,
  ...props
}: Omit<React.ComponentProps<typeof ShadcnButton>, 'variant'> & {
  variant?: LegacyVariant;
}) {
  return (
    <ShadcnButton
      variant={variantMap[variant] ?? 'default'}
      size={size}
      className={cn(className)}
      {...props}
    />
  );
}

export { StatusBadge };

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border/50 pb-5">
      <div className="max-w-2xl space-y-1.5">
        {eyebrow ? (
          <p className="text-[11px] font-semibold tracking-[0.18em] text-primary/80 uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-[60ch] text-sm leading-relaxed text-muted-foreground text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-8 py-12 text-center">
      <h3 className="font-medium tracking-tight">{title}</h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <ShadcnSkeleton className={className} />;
}

export { buttonVariants };
export type { VariantProps };
