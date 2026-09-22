export const ONBOARDING_VERSION = 1;

export function needsOnboarding(user: {
  metadata?: {
    onboardingVersion?: number;
    mustChangePassword?: boolean;
  } | null;
}): boolean {
  if (user.metadata?.mustChangePassword === true) return true;
  const version = user.metadata?.onboardingVersion;
  return !(typeof version === 'number' && version >= ONBOARDING_VERSION);
}

export function isAdmin(user: { role?: string } | null | undefined): boolean {
  return String(user?.role ?? '').toUpperCase() === 'ADMIN';
}

export function isOnboardingExemptPath(pathname: string): boolean {
  return pathname.startsWith('/welcome') || pathname.startsWith('/admin');
}
