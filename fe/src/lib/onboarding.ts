export const ONBOARDING_VERSION = 1;

export function needsOnboarding(user: {
  metadata?: { onboardingVersion?: number } | null;
}): boolean {
  const version = user.metadata?.onboardingVersion;
  return !(typeof version === 'number' && version >= ONBOARDING_VERSION);
}
