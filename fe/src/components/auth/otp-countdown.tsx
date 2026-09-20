'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/primitives';

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export function OtpCountdown({
  sentAt,
  onResend,
}: {
  sentAt: number | null;
  onResend: () => Promise<void>;
}) {
  const t = useTranslations('otpTimer');
  const [now, setNow] = useState(() => Date.now());
  const [resending, setResending] = useState(false);

  useEffect(() => {
    setNow(Date.now());
    if (!sentAt) return;

    const expiresAt = sentAt + OTP_TTL_MS;
    const timer = window.setInterval(() => {
      const next = Date.now();
      setNow(next);
      if (next >= expiresAt) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sentAt]);

  if (!sentAt) return null;

  const remaining = Math.max(0, Math.ceil((sentAt + OTP_TTL_MS - now) / 1000));
  const resendRemaining = Math.max(
    0,
    Math.ceil((sentAt + RESEND_COOLDOWN_MS - now) / 1000),
  );
  const status =
    remaining > 0
      ? t('expiresIn', { time: formatTime(remaining) })
      : t('expired');

  async function resend() {
    setResending(true);
    try {
      await onResend();
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <p
        role="timer"
        aria-label={status}
        className="text-center text-sm text-muted-foreground tabular-nums"
      >
        {status}
      </p>
      <Button
        type="button"
        variant="ghost"
        className="h-11 w-full"
        disabled={resending || resendRemaining > 0}
        onClick={() => void resend()}
      >
        {resending
          ? t('sending')
          : resendRemaining > 0
            ? t('resendIn', { time: formatTime(resendRemaining) })
            : t('resend')}
      </Button>
    </div>
  );
}
