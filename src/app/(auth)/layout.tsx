'use client';

import { useTranslations } from 'next-intl';
import FocusIndicatorsLoader from '@/components/FocusIndicatorsLoader';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('auth');

  return (
    <>
      <FocusIndicatorsLoader />
      <div className="flex min-h-screen bg-background">
      <main id="main-content" className="flex flex-1 flex-col items-center justify-center px-4 py-12 lg:px-8" tabIndex={-1}>
        <div className="w-full max-w-md">{children}</div>
      </main>

      <aside className="hidden flex-1 flex-col items-center justify-center bg-muted/30 px-8 py-12 lg:flex" aria-label={t('takeTicklyWithYou')}>
        <div className="w-full max-w-md space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">{t('takeTicklyWithYou')}</h2>
          <p className="text-muted-foreground">
            {t('mobileAppDescription')}
          </p>
          <section className="flex items-center gap-4 rounded-lg border border-border bg-card p-6" aria-labelledby="mobile-app-heading">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10" aria-hidden="true">
              <svg
                className="h-8 w-8 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
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
              <h3 id="mobile-app-heading" className="font-medium text-foreground">{t('mobileApp')}</h3>
              <p className="text-sm text-muted-foreground">{t('comingSoon')}</p>
            </div>
          </section>
        </div>
      </aside>
      </div>
    </>
  );
}
