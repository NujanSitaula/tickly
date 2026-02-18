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
    <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
      <button
        type="button"
        onClick={() => onViewChange('list')}
        className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          view === 'list'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
        aria-label={tView('list')}
      >
        <List className="h-4 w-4" />
        <span>{tView('list')}</span>
      </button>
      <button
        type="button"
        onClick={() => onViewChange('kanban')}
        className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          view === 'kanban'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
        aria-label={tView('kanban')}
      >
        <LayoutGrid className="h-4 w-4" />
        <span>{tView('kanban')}</span>
      </button>
      <button
        type="button"
        onClick={() => onViewChange('calendar')}
        className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          view === 'calendar'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
        aria-label={tView('calendar')}
      >
        <Calendar className="h-4 w-4" />
        <span>{tView('calendar')}</span>
      </button>
    </div>
  );
}
