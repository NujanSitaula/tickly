'use client';

import { Search as SearchIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function SearchPage() {
  const tDashboard = useTranslations('dashboard');
  const tAuth = useTranslations('auth');

  return (
    <div className="h-full">
      <div className="border-b border-border bg-background px-8 py-6">
        <div className="flex items-center gap-3">
          <SearchIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">{tDashboard('search.title')}</h1>
        </div>
      </div>

      <div className="flex h-[calc(100%-80px)] items-center justify-center px-8 py-10">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <SearchIcon className="h-6 w-6" />
          </div>
          <div className="mb-3 inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {tAuth('comingSoon')}
          </div>
          <h2 className="text-lg font-semibold text-foreground">{tDashboard('search.comingSoonTitle')}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {tDashboard('search.comingSoonDescription')}
          </p>
        </div>
      </div>
    </div>
  );
}
