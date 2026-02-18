'use client';

import { useTranslations } from 'next-intl';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('auth');

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Column - Auth Form */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 lg:px-8">
        <div className="w-full max-w-md">{children}</div>
      </div>

      {/* Right Column - Marketing/Illustration */}
      <div className="hidden flex-1 flex-col items-center justify-center bg-muted/30 px-8 py-12 lg:flex">
        <div className="w-full max-w-md space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">{t('takeTicklyWithYou')}</h2>
          <p className="text-muted-foreground">
            {t('mobileAppDescription')}
          </p>
          <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
              <svg
                className="h-8 w-8 text-primary"
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
            <div className="flex-1">
              <h3 className="font-medium text-foreground">{t('mobileApp')}</h3>
              <p className="text-sm text-muted-foreground">{t('comingSoon')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
