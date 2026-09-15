import { Suspense } from 'react';
import LoginPage from './login-client';

export default function LoginRoute() {
  return (
    <Suspense fallback={<main className="center-screen"><div className="loader" /></main>}>
      <LoginPage />
    </Suspense>
  );
}
