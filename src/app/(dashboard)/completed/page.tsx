'use client';

import { Calendar, CheckCircle2, Search } from 'lucide-react';
import TaskItem from '@/components/TaskItem';
import TaskDetailModal from '@/components/TaskDetailModal';
import { tasks as tasksApi, type Task } from '@/lib/api';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function CompletedPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedOnce = useRef(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [dateFilter, setDateFilter] = useState<string>('');
  const tDashboard = useTranslations('dashboard');

  const loadTasks = useCallback(async () => {
    setRefreshing(true);
    if (!hasLoadedOnce.current) {
      setLoading(true);
    }
    try {
      const res = await tasksApi.list({ completed: true });
      setTasks(res.data);
      hasLoadedOnce.current = true;
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const groupedTasks = useMemo(() => {
    const byDate: Record<string, Task[]> = {};

    for (const task of tasks) {
      const completedAt = task.completed_at ?? null;
      if (!completedAt) continue;

      const dateKey = completedAt.slice(0, 10);
      if (!byDate[dateKey]) {
        byDate[dateKey] = [];
      }
      byDate[dateKey].push(task);
    }

    // Sort tasks in each group by completed_at desc, fallback to order
    Object.keys(byDate).forEach((key) => {
      byDate[key].sort((a, b) => {
        const aTime = a.completed_at ? Date.parse(a.completed_at) : 0;
        const bTime = b.completed_at ? Date.parse(b.completed_at) : 0;
        if (aTime !== bTime) return bTime - aTime;
        return (a.order ?? 0) - (b.order ?? 0);
      });
    });

    // Sort dates descending (newest first)
    const sortedKeys = Object.keys(byDate).sort((a, b) => (a < b ? 1 : -1));

    return { byDate, sortedKeys };
  }, [tasks]);

  const visibleDateKeys = useMemo(() => {
    if (!dateFilter) return groupedTasks.sortedKeys;
    return groupedTasks.sortedKeys.filter((key) => key === dateFilter);
  }, [groupedTasks.sortedKeys, dateFilter]);

  const formatDateHeading = (dateString: string) => {
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    if (dateString === todayKey) {
      return tDashboard('common.today');
    }
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Listen for task added event from modal (completed tasks won't appear here, but refresh anyway)
  useEffect(() => {
    function handleTaskAdded() {
      // New tasks aren't completed, so just refresh to be safe
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
            <CheckCircle2 className="h-6 w-6 text-primary" />
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">{tDashboard('completed.title')}</h1>
              {refreshing && !loading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-muted-foreground/40 border-r-transparent" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-40 bg-transparent text-sm outline-none"
                />
                {dateFilter && (
                  <button
                    type="button"
                    onClick={() => setDateFilter('')}
                    className="ml-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {tDashboard('common.clear')}
                  </button>
                )}
              </div>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <Search className="h-3.5 w-3.5 text-muted-foreground/60" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        {loading && tasks.length === 0 ? (
          <div className="py-12 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-sm text-muted-foreground">{tDashboard('common.loadingTasks')}</p>
          </div>
        ) : (
          <>
            {visibleDateKeys.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {dateFilter ? tDashboard('completed.noTasksForDate') : tDashboard('completed.noTasks')}
              </div>
            )}

            {visibleDateKeys.map((dateKey) => {
              const dateTasks = groupedTasks.byDate[dateKey] ?? [];
              if (dateTasks.length === 0) return null;

              return (
                <section key={dateKey} className="mb-8">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>{formatDateHeading(dateKey)}</span>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-border bg-card">
                    {dateTasks.map((task, index) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onClick={() => setSelectedTaskId(task.id)}
                        onToggle={async () => {
                          // Marking as incomplete removes it from Completed
                          try {
                            await tasksApi.update(task.id, { completed: !task.completed });
                            await loadTasks();
                          } catch (error) {
                            console.error('Failed to toggle task:', error);
                          }
                        }}
                        onUpdate={loadTasks}
                        showDivider={index !== dateTasks.length - 1}
                      />
                    ))}
                  </div>
                </section>
              );
            })}

            <TaskDetailModal
              open={selectedTaskId != null}
              taskId={selectedTaskId}
              onClose={() => setSelectedTaskId(null)}
              onTaskUpdate={loadTasks}
            />
          </>
        )}
      </div>
    </div>
  );
}
