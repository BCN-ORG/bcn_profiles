'use client';

import { cn } from '@/lib/utils';

export function OnboardingSteps({
  current,
  total = 4,
}: {
  current: number;
  total?: number;
}) {
  return (
    <div className="mb-8 flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => i + 1).map((step) => (
        <div key={step} className="flex flex-1 items-center gap-2">
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
              step <= current
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {step}
          </span>
          {step < total ? (
            <span
              className={cn(
                'h-0.5 flex-1 rounded-full',
                step < current ? 'bg-primary' : 'bg-border',
              )}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
