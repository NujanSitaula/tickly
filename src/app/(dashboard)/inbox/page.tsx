'use client';

import { Inbox as InboxIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import TaskList from '@/components/TaskList';
import ViewSwitcher from '@/components/ViewSwitcher';
import { tasks as tasksApi } from '@/lib/api';
import { useViewPreference } from '@/hooks/useViewPreference';
import { useCallback, useEffect } from 'react';
import { useTaskStore } from '@/contexts/TaskStoreContext';

export default function InboxPage() {
  const { loadTasksForView, getTasks, loading } = useTaskStore();
  const [view, setView] = useViewPreference('inbox');
  const tDashboard = useTranslations('dashboard');

  useEffect(() => {
    loadTasksForView('inbox', () =>
      tasksApi.list({ project_id: 'null' }).then((r) => r.data)
    );
  }, [loadTasksForView]);

  const tasks = getTasks();

  return (
    <div className="h-full">
      <div className="border-b border-border bg-background px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <InboxIcon className="h-6 w-6 text-primary" />
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">{tDashboard('inbox.title')}</h1>
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
          <div className="py-12 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-sm text-muted-foreground">{tDashboard('common.loadingTasks')}</p>
          </div>
        ) : (
          <TaskList tasks={tasks} view={view} />
        )}
      </div>
    </div>
  );
}
