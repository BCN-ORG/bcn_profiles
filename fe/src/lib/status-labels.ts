/** API / enum codes shown in the UI — tone only; labels live in messages `status`. */
const POSITIVE = new Set([
  'ACTIVE',
  'VERIFIED',
  'ALLOW',
  'ELIGIBLE',
  'LINKED',
  'TWO_FA_ON',
  'CURRENT',
]);

const NEGATIVE = new Set([
  'BLOCKED',
  'DENY',
  'NOT_MEMBER',
  'DISABLED',
  'NOT_LINKED',
  'NOT_ELIGIBLE',
  'TWO_FA_OFF',
]);

export const STATUS_CODES = [
  'ACTIVE',
  'PENDING',
  'BLOCKED',
  'DISABLED',
  'VERIFIED',
  'NOT_MEMBER',
  'UNKNOWN',
  'ALLOW',
  'DENY',
  'LINKED',
  'NOT_LINKED',
  'ELIGIBLE',
  'NOT_ELIGIBLE',
  'TWO_FA_ON',
  'TWO_FA_OFF',
  'CURRENT',
  'USER',
  'ADMIN',
  'MEMBER',
  'ANY_TRUSTED_GROUP',
  'SSO',
  'APP',
  'AAL1',
  'AAL2',
  'GOOGLE',
  'GITHUB',
  'DISCORD',
  'ZALO',
  'QUIZ',
] as const;

export type StatusCode = (typeof STATUS_CODES)[number];

export function normalizeStatusCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '_');
}

export function isKnownStatusCode(code: string): code is StatusCode {
  return (STATUS_CODES as readonly string[]).includes(code);
}

export function statusTone(
  code: string,
): 'positive' | 'negative' | 'neutral' {
  const normalized = normalizeStatusCode(code);
  if (POSITIVE.has(normalized)) return 'positive';
  if (NEGATIVE.has(normalized)) return 'negative';
  return 'neutral';
}
