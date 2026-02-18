'use client';

import { useState, useEffect, useCallback } from 'react';
import { userPreferences } from '@/lib/api';

export type ViewMode = 'list' | 'kanban' | 'calendar';

export function useViewPreference(pageKey: string): [ViewMode, (view: ViewMode) => void, boolean] {
  const [view, setViewState] = useState<ViewMode>('list');
  const [loading, setLoading] = useState(true);

  const preferenceKey = `view_mode:${pageKey}`;

  useEffect(() => {
    async function loadPreference() {
      try {
        const res = await userPreferences.get(preferenceKey);
        if (res.data && ['list', 'kanban', 'calendar'].includes(res.data.value)) {
          setViewState(res.data.value as ViewMode);
        }
      } catch (error) {
        // Error loading preference - use default 'list'
        console.error('Failed to load view preference:', error);
      } finally {
        setLoading(false);
      }
    }

    loadPreference();
  }, [preferenceKey]);

  const setView = useCallback(
    async (newView: ViewMode) => {
      setViewState(newView);
      try {
        await userPreferences.set(preferenceKey, newView);
      } catch (error) {
        console.error('Failed to save view preference:', error);
        // Revert on error
        setViewState('list');
      }
    },
    [preferenceKey]
  );

  return [view, setView, loading];
}
