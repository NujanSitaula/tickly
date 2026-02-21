'use client';

import { useAuth } from '@/contexts/AuthContext';
import { auth as authApi } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setToken, setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(errorParam);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
      return;
    }

    if (!code) {
      setError('No authorization code received');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
      return;
    }

    // Exchange code for token (token never appears in URL)
    authApi
      .exchangeCode(code)
      .then((data) => {
        setToken(data.access_token);
        setUser(data.user);
        router.push('/');
        router.refresh();
      })
      .catch((err) => {
        console.error('Error exchanging code:', err);
        setError('Failed to authenticate');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      });
  }, [searchParams, setToken, setUser, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive">{error}</p>
          <p className="mt-2 text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        <p className="mt-4 text-sm text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
