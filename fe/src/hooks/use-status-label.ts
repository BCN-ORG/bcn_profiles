'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  isKnownStatusCode,
  normalizeStatusCode,
} from '@/lib/status-labels';

export function useStatusLabel() {
  const t = useTranslations('status');

  return useCallback(
    (code?: string | null) => {
      if (!code) return '—';
      const key = normalizeStatusCode(code);
      if (isKnownStatusCode(key)) return t(key);
      return code;
    },
    [t],
  );
}
