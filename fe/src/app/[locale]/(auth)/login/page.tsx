import { Suspense } from 'react';
import LoginPage from './login-client';
import { Skeleton } from '@/components/ui/primitives';

export default function LoginRoute() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen flex-col items-center justify-center gap-4">
          <Skeleton className="size-8 rounded-full" />
        </main>
      }
    >
      <LoginPage />
    </Suspense>
  );
}
