'use client';

import { LayoutGrid } from 'lucide-react';
import TaskList from '@/components/TaskList';
import { TaskListSkeleton } from '@/components/Skeleton';
import ViewSwitcher from '@/components/ViewSwitcher';
import { tasks as tasksApi } from '@/lib/api';
import { useViewPreference } from '@/hooks/useViewPreference';
import { useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useTaskStore } from '@/contexts/TaskStoreContext';

export default function UpcomingPage() {
  const { loadTasksForView, getTasks, loading } = useTaskStore();
  const [view, setView] = useViewPreference('upcoming');
  const tDashboard = useTranslations('dashboard');

  const fetchUpcoming = useCallback(async () => {
    const res = await tasksApi.list();
    const now = new Date();
    return res.data.filter((t) => t.due_date && new Date(t.due_date) > now);
  }, []);

  useEffect(() => {
    loadTasksForView('upcoming', fetchUpcoming);
  }, [loadTasksForView, fetchUpcoming]);

  const tasks = getTasks();

  return (
    <div className="h-full">
      <div className="border-b border-border bg-background px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <LayoutGrid className="h-6 w-6 text-primary" />
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">{tDashboard('upcoming.title')}</h1>
              {loading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-muted-foreground/40 border-r-transparent" />
              )}
            </div>
          </div>
          <ViewSwitcher view={view} onViewChange={setView} />
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        {loading && tasks.length === 0 ? (
          <TaskListSkeleton />
        ) : (
          <TaskList tasks={tasks} view={view} />
        )}
      </div>
    </div>
  );
}
