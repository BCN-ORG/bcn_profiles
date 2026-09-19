import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/primitives';
import OauthErrorPage from './error-client';

export default function OauthErrorRoute() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen flex-col items-center justify-center gap-4">
          <Skeleton className="size-8 rounded-full" />
        </main>
      }
    >
      <OauthErrorPage />
    </Suspense>
  );
}
