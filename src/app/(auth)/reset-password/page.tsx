'use client';

import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, Suspense } from 'react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { auth } from '@/lib/api';

function ResetPasswordContent() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== passwordConfirmation) {
      setError('Passwords do not match');
      return;
    }

    if (!token || !email) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }

    setLoading(true);
    try {
      await auth.resetPassword(token, email, password, passwordConfirmation);
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  if (!token || !email) {
    return (
      <div className="w-full space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span className="text-xl font-semibold text-foreground">Tickly</span>
          </Link>
          <LanguageSwitcher placement="bottom" />
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Invalid or expired reset link. Please request a new password reset.
          </div>
          <Link
            href="/forgot-password"
            className="cursor-pointer inline-flex items-center gap-2 text-sm text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
          >
            <ArrowLeft className="h-4 w-4" />
            Request new reset link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span className="text-xl font-semibold text-foreground">Tickly</span>
          </Link>
          <LanguageSwitcher placement="bottom" />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">Password reset successful</h1>
            <p className="text-muted-foreground">Your password has been reset. Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <span className="text-xl font-semibold text-foreground">Tickly</span>
        </Link>
        <LanguageSwitcher placement="bottom" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Create new password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your new password below. Make sure it's at least 8 characters long.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="reset-password" className="block text-sm font-medium text-foreground">
            New password
          </label>
          <div className="relative">
            <input
              id="reset-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Enter new password"
              autoFocus
              className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="reset-password-confirmation" className="block text-sm font-medium text-foreground">
            Confirm new password
          </label>
          <div className="relative">
            <input
              id="reset-password-confirmation"
              type={showPasswordConfirmation ? 'text' : 'password'}
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
              minLength={8}
              placeholder="Confirm new password"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
              className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
              aria-label={showPasswordConfirmation ? 'Hide password' : 'Show password'}
            >
              {showPasswordConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !password || !passwordConfirmation}
          className="cursor-pointer w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Resetting password...' : 'Reset password'}
        </button>
      </form>

      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
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
      <ResetPasswordContent />
    </Suspense>
  );
}
