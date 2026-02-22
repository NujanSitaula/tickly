'use client';

import { CheckCircle2 } from 'lucide-react';
import TaskItem from '@/components/TaskItem';
import DatePickerPopover from '@/components/DatePickerPopover';
import TaskDetailModal from '@/components/TaskDetailModal';
import { tasks as tasksApi } from '@/lib/api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useTaskStore } from '@/contexts/TaskStoreContext';
import type { Task } from '@/lib/api';

export default function CompletedPage() {
  const { loadTasksForView, getTasks, loading, updateTask, rollbackTask } = useTaskStore();
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [dateFilter, setDateFilter] = useState<string>('');
  const tDashboard = useTranslations('dashboard');

  const fetchCompleted = useCallback(
    () => tasksApi.list({ completed: true }).then((r) => r.data),
    []
  );

  useEffect(() => {
    loadTasksForView('completed', fetchCompleted);
  }, [loadTasksForView, fetchCompleted]);

  const tasks = getTasks();

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

    Object.keys(byDate).forEach((key) => {
      byDate[key].sort((a, b) => {
        const aTime = a.completed_at ? Date.parse(a.completed_at) : 0;
        const bTime = b.completed_at ? Date.parse(b.completed_at) : 0;
        if (aTime !== bTime) return bTime - aTime;
        return (a.order ?? 0) - (b.order ?? 0);
      });
    });

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

  const handleToggle = useCallback(
    async (task: Task) => {
      const previous = { ...task };
      updateTask(task.id, { completed: false });
      try {
        await tasksApi.update(task.id, { completed: false });
      } catch (error) {
        console.error('Failed to toggle task:', error);
        rollbackTask(previous);
      }
    },
    [updateTask, rollbackTask]
  );

  return (
    <div className="h-full">
      <div className="border-b border-border bg-background px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">{tDashboard('completed.title')}</h1>
              {loading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-muted-foreground/40 border-r-transparent" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DatePickerPopover
              value={dateFilter}
              onChange={setDateFilter}
              onClear={() => setDateFilter('')}
              placeholder={tDashboard('common.filterByDate') || 'Filter by date'}
              inputStyle
            />
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
                        onToggle={() => handleToggle(task)}
                        onUpdate={() => {}}
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
              onTaskUpdate={undefined}
            />
          </>
        )}
      </div>
    </div>
  );
}
