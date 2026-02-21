'use client';

import { ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { auth } from '@/lib/api';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await auth.sendPasswordResetLink(email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
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
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">Check your email</h1>
            <p className="text-muted-foreground">
              We've sent a password reset link to <strong className="text-foreground">{email}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              If you don't see the email, check your spam folder or try again.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="cursor-pointer w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Back to login
            </button>
            <button
              type="button"
              onClick={() => {
                setSuccess(false);
                setEmail('');
              }}
              className="cursor-pointer w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Send another email
            </button>
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
        <h1 className="text-2xl font-semibold text-foreground">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="forgot-email" className="block text-sm font-medium text-foreground">
            Email address
          </label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            autoFocus
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="cursor-pointer w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending...' : 'Send reset link'}
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
