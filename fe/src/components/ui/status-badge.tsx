'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  isKnownStatusCode,
  normalizeStatusCode,
  statusTone,
} from '@/lib/status-labels';

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const t = useTranslations('status');
  const code = normalizeStatusCode(status);
  const label = isKnownStatusCode(code) ? t(code) : status;
  const tone = statusTone(code);

  return (
    <Badge
      variant={tone === 'negative' ? 'destructive' : tone === 'positive' ? 'default' : 'secondary'}
      className={cn(
        'rounded-full font-normal',
        tone === 'positive' &&
          'border-success/25 bg-success/10 text-success hover:bg-success/10',
        className,
      )}
    >
      {label}
    </Badge>
  );
}
