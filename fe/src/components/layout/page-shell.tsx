import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-6 animate-enter md:gap-8', className)}>
      {children}
    </div>
  );
}

export function PageSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('grid gap-4 md:gap-5', className)}>{children}</section>
  );
}

export function SurfacePanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/70 bg-muted/25 p-4 md:p-5',
        className,
      )}
    >
      {children}
    </div>
  );
}
