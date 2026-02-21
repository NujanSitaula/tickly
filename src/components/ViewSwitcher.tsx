'use client';

import { Calendar, LayoutGrid, List } from 'lucide-react';
import type { ViewMode } from '@/hooks/useViewPreference';
import { useTranslations } from 'next-intl';

interface ViewSwitcherProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export default function ViewSwitcher({ view, onViewChange }: ViewSwitcherProps) {
  const tView = useTranslations('dashboard.viewSwitcher');
  return (
    <div
      className="flex items-center gap-1 rounded-lg border border-border bg-background p-1"
      role="group"
      aria-label="View mode"
    >
      <button
        type="button"
        onClick={() => onViewChange('list')}
        className={`cursor-pointer flex max-sm:[&_span]:hidden items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          view === 'list'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
        aria-label={tView('list')}
        aria-pressed={view === 'list'}
      >
        <List className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{tView('list')}</span>
      </button>
      <button
        type="button"
        onClick={() => onViewChange('kanban')}
        className={`cursor-pointer flex max-sm:[&_span]:hidden items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          view === 'kanban'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
        aria-label={tView('kanban')}
        aria-pressed={view === 'kanban'}
      >
        <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{tView('kanban')}</span>
      </button>
      <button
        type="button"
        onClick={() => onViewChange('calendar')}
        className={`cursor-pointer flex max-sm:[&_span]:hidden items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          view === 'calendar'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
        aria-label={tView('calendar')}
        aria-pressed={view === 'calendar'}
      >
        <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{tView('calendar')}</span>
      </button>
    </div>
  );
}
