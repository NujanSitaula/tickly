'use client';

import { tasks as tasksApi } from '@/lib/api';
import { Calendar } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useCallback, useEffect, useMemo } from 'react';
import TaskList from '@/components/TaskList';
import ViewSwitcher from '@/components/ViewSwitcher';
import { useViewPreference } from '@/hooks/useViewPreference';
import { useAuth } from '@/contexts/AuthContext';
import { useTaskStore } from '@/contexts/TaskStoreContext';

export default function TodayPage() {
  const { loadTasksForView, getTasks, loading } = useTaskStore();
  const [view, setView] = useViewPreference('today');
  const tDashboard = useTranslations('dashboard');
  const locale = useLocale();
  const { user } = useAuth();
  const mode = user?.mode ?? 'advanced';

  const fetchToday = useCallback(async () => {
    const res = await tasksApi.list();
    if (mode === 'basic') {
      const todayKey = new Date().toISOString().slice(0, 10);
      return res.data.filter(
        (t) => t.due_date && t.due_date.slice(0, 10) === todayKey
      );
    }
    return res.data;
  }, [mode]);

  useEffect(() => {
    loadTasksForView('today', fetchToday);
  }, [loadTasksForView, fetchToday]);

  const tasks = getTasks();

  const today = new Date();
  const todayFormatted = today.toLocaleDateString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="h-full">
      <div className="border-b border-border bg-background px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-primary" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-foreground">{tDashboard('today.title')}</h1>
                {loading && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-muted-foreground/40 border-r-transparent" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">{todayFormatted}</p>
            </div>
          </div>
          {mode !== 'basic' && <ViewSwitcher view={view} onViewChange={setView} />}
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        {loading && tasks.length === 0 ? (
          <div className="py-12 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-sm text-muted-foreground">{tDashboard('common.loadingTasks')}</p>
          </div>
        ) : (
          <TaskList tasks={tasks} view={mode === 'basic' ? 'list' : view} />
        )}
      </div>
    </div>
  );
}
