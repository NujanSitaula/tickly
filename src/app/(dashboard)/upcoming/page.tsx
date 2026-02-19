'use client';

import { LayoutGrid } from 'lucide-react';
import TaskList from '@/components/TaskList';
import ViewSwitcher from '@/components/ViewSwitcher';
import { tasks as tasksApi, type Task } from '@/lib/api';
import { useViewPreference } from '@/hooks/useViewPreference';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function UpcomingPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedOnce = useRef(false);
  const [view, setView] = useViewPreference('upcoming');
  const tDashboard = useTranslations('dashboard');

  const loadTasks = useCallback(async () => {
    setRefreshing(true);
    if (!hasLoadedOnce.current) {
      setLoading(true);
    }
    try {
      const res = await tasksApi.list();
      // Filter for upcoming tasks (with due_date in future)
      const now = new Date();
      setTasks(res.data.filter((t) => t.due_date && new Date(t.due_date) > now));
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

  // Listen for task added event from modal
  useEffect(() => {
    function handleTaskAdded(e: Event) {
      const customEvent = e as CustomEvent<import('@/lib/api').Task | undefined>;
      const newTask = customEvent.detail;
      
      // If we have the task data and it matches our filter (has future due_date), add it optimistically
      if (newTask && newTask.due_date) {
        const now = new Date();
        const taskDueDate = new Date(newTask.due_date);
        if (taskDueDate > now) {
          setTasks((prev) => [newTask, ...prev]);
          return;
        }
      }
      // Fallback to refetch
      loadTasks();
    }
    window.addEventListener('taskAdded', handleTaskAdded);
    return () => window.removeEventListener('taskAdded', handleTaskAdded);
  }, [loadTasks]);

  return (
    <div className="h-full">
      <div className="border-b border-border bg-background px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <LayoutGrid className="h-6 w-6 text-primary" />
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">{tDashboard('upcoming.title')}</h1>
              {refreshing && !loading && (
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
          <TaskList tasks={tasks} onTaskUpdate={loadTasks} view={view} />
        )}
      </div>
    </div>
  );
}
