'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

function isReactivateError(err: unknown): err is Error & { status?: number; data?: { code?: string } } {
  const e = err as Error & { status?: number; data?: { code?: string } };
  return e?.status === 409 && e?.data?.code === 'reactivate_available';
}

export default function RegisterPage() {
  const t = useTranslations('auth');
  const { register, reactivateAccount } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password_confirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReactivate, setShowReactivate] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== password_confirmation) {
      setError(t('passwordsDontMatch'));
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password, password_confirmation);
      router.push('/');
      router.refresh();
    } catch (err) {
      if (isReactivateError(err)) {
        setShowReactivate(true);
      } else {
        setError(err instanceof Error ? err.message : t('registrationFailed'));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleReactivateConfirm() {
    setError('');
    setReactivating(true);
    try {
      await reactivateAccount({ email, password, name });
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('registrationFailed'));
    } finally {
      setReactivating(false);
    }
  }

  function handleReactivateCancel() {
    setShowReactivate(false);
  }

  function handleGoogleLogin() {
    window.location.href = `${API_URL}/auth/google`;
  }

  if (showReactivate) {
    return (
      <div className="w-full space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-foreground">Tickly</span>
          </Link>
          <LanguageSwitcher placement="bottom" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t('createAccount')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('getStarted')}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-6 space-y-4">
          <p className="text-sm text-foreground">{t('reactivateMessage')}</p>
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleReactivateCancel}
              className="cursor-pointer flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              {t('reactivateCancel')}
            </button>
            <button
              type="button"
              onClick={handleReactivateConfirm}
              disabled={reactivating}
              className="cursor-pointer flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reactivating ? t('creatingAccount') : t('reactivateConfirm')}
            </button>
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          {t('alreadyHaveAccount')}{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">{t('signIn')}</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      {/* Logo/Branding */}
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
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

      {/* Welcome Heading */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t('createAccount')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('getStarted')}
        </p>
      </div>

      {/* Google Sign-In Button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="cursor-pointer flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {t('continueWithGoogle')}
      </button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{t('or')}</span>
        </div>
      </div>

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium text-foreground">
            {t('name')}
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder={t('name')}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            {t('email')}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-foreground">
            {t('password')}
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder={t('password')}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password_confirmation" className="block text-sm font-medium text-foreground">
            {t('confirmPassword')}
          </label>
          <div className="relative">
            <input
              id="password_confirmation"
              type={showPasswordConfirmation ? 'text' : 'password'}
              value={password_confirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
              minLength={8}
              placeholder={t('confirmPassword')}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
              className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
              aria-label={showPasswordConfirmation ? 'Hide password' : 'Show password'}
            >
              {showPasswordConfirmation ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="cursor-pointer w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('creatingAccount') : t('signUp')}
        </button>
      </form>

      {/* Terms and Privacy */}
      <p className="text-xs text-muted-foreground">
        {t('byContinuing')}{' '}
        <Link href="/terms" className="text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded">
          {t('termsOfService')}
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded">
          {t('privacyPolicy')}
        </Link>
        .
      </p>

      {/* Sign In Link */}
      <p className="text-center text-sm text-muted-foreground">
        {t('alreadyHaveAccount')}{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t('signIn')}
        </Link>
      </p>
    </div>
  );
}
