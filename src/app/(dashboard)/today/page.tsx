'use client';

import { tasks as tasksApi, type Task } from '@/lib/api';
import { Calendar } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import TaskList from '@/components/TaskList';
import ViewSwitcher from '@/components/ViewSwitcher';
import { useViewPreference } from '@/hooks/useViewPreference';

export default function TodayPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedOnce = useRef(false);
  const [view, setView] = useViewPreference('today');
  const tDashboard = useTranslations('dashboard');
  const locale = useLocale();

  const loadTasks = useCallback(async () => {
    setRefreshing(true);
    if (!hasLoadedOnce.current) {
      setLoading(true);
    }
    try {
      // Load today's tasks (filter by due_date when backend supports it)
      const res = await tasksApi.list();
      setTasks(res.data);
      hasLoadedOnce.current = true;
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const today = new Date();
  const todayFormatted = today.toLocaleDateString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="h-full">
      <div className="border-b border-border bg-background px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-primary" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-foreground">{tDashboard('today.title')}</h1>
                {refreshing && !loading && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-muted-foreground/40 border-r-transparent" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">{todayFormatted}</p>
            </div>
          </div>
          <ViewSwitcher view={view} onViewChange={setView} />
        </div>
      </div>

      <div className="px-8 py-6">
        {loading && tasks.length === 0 ? (
          <div className="py-12 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-sm text-muted-foreground">{tDashboard('common.loadingTasks')}</p>
          </div>
        ) : (
          <TaskList tasks={tasks} onTaskUpdate={loadTasks} view={view} />
        )}
      </div>
    </div>
  );
}
