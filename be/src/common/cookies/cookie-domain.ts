import type { Request } from 'express';

export function resolveCookieDomain(req: Request): string | undefined {
  const forwarded = String(req.headers['x-forwarded-host'] ?? '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  const host = (forwarded || String(req.headers.host ?? ''))
    .toLowerCase()
    .split(':')[0];

  if (host === 'bcn.id.vn' || host.endsWith('.bcn.id.vn')) {
    return '.bcn.id.vn';
  }
  if (host === 'uside.id.vn' || host.endsWith('.uside.id.vn')) {
    return '.uside.id.vn';
  }
  if (host === 'uside.studio' || host.endsWith('.uside.studio')) {
    return '.uside.studio';
  }

  return undefined;
}
