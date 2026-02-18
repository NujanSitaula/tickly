'use client';

import { Inbox as InboxIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import TaskList from '@/components/TaskList';
import ViewSwitcher from '@/components/ViewSwitcher';
import { tasks as tasksApi, type Task } from '@/lib/api';
import { useViewPreference } from '@/hooks/useViewPreference';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function InboxPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedOnce = useRef(false);
  const [view, setView] = useViewPreference('inbox');
  const tDashboard = useTranslations('dashboard');
  // loading state from useViewPreference is available but not used here

  const loadTasks = useCallback(async () => {
    setRefreshing(true);
    if (!hasLoadedOnce.current) {
      setLoading(true);
    }
    try {
      // Fetch tasks without a project (project_id = null)
      const res = await tasksApi.list({ project_id: 'null' });
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

  // Listen for task added event from modal
  useEffect(() => {
    function handleTaskAdded() {
      loadTasks();
    }
    window.addEventListener('taskAdded', handleTaskAdded);
    return () => window.removeEventListener('taskAdded', handleTaskAdded);
  }, [loadTasks]);

  return (
    <div className="h-full">
      <div className="border-b border-border bg-background px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <InboxIcon className="h-6 w-6 text-primary" />
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">{tDashboard('inbox.title')}</h1>
              {refreshing && !loading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-muted-foreground/40 border-r-transparent" />
              )}
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
