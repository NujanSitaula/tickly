'use client';

import { useMemo, useEffect, useState } from 'react';
import { tasks as tasksApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import TaskList from '@/components/TaskList';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useTaskStore } from '@/contexts/TaskStoreContext';

type CalendarTab = 'today' | 'upcoming' | 'completed';

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthDays(anchor: Date) {
  const start = startOfMonth(anchor);
  const firstDayIndex = start.getDay();
  const days: Date[] = [];
  for (let i = firstDayIndex - 1; i >= 0; i -= 1) {
    days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() - i - 1));
  }
  const current = new Date(start);
  while (current.getMonth() === start.getMonth()) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  while (days.length < 42) {
    const last = days[days.length - 1];
    days.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
  }
  return days;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const mode = user?.mode ?? 'advanced';
  const { loadTasksForView, getTasks, loading } = useTaskStore();
  const [tab, setTab] = useState<CalendarTab>('today');
  const [monthAnchor, setMonthAnchor] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    loadTasksForView('calendar', () => tasksApi.list().then((r) => r.data));
  }, [loadTasksForView]);

  const tasks = getTasks();

  const tasksByDate = useMemo(() => {
    const map: Record<string, typeof tasks> = {};
    tasks.forEach((task) => {
      if (!task.due_date) return;
      const key = task.due_date.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(task);
    });
    return map;
  }, [tasks]);

  const todayKey = new Date().toISOString().slice(0, 10);

  const filteredTasks = useMemo(() => {
    if (tab === 'completed') {
      return tasks.filter((t) => t.completed);
    }
    if (tab === 'upcoming') {
      const now = new Date();
      return tasks.filter(
        (t) => t.due_date && !t.completed && new Date(t.due_date) > now
      );
    }
    return tasks.filter(
      (t) => t.due_date && t.due_date.slice(0, 10) === todayKey && !t.completed
    );
  }, [tasks, tab, todayKey]);

  const dayTasks = useMemo(() => {
    return tasksByDate[selectedDate] ?? [];
  }, [tasksByDate, selectedDate]);

  const days = getMonthDays(monthAnchor);
  const monthLabel = monthAnchor.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="h-full">
      <div className="border-b border-border bg-background px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Calendar</h1>
              <p className="text-sm text-muted-foreground">
                See your tasks on a single calendar. Basic mode shows inbox tasks; Advanced shows all.
              </p>
            </div>
          </div>
          <div className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5 text-xs font-medium text-muted-foreground">
            {(['today', 'upcoming', 'completed'] as CalendarTab[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`cursor-pointer rounded-md px-3 py-1 transition-colors ${
                  tab === value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'hover:bg-background/60'
                }`}
              >
                {value === 'today' && 'Today'}
                {value === 'upcoming' && 'Upcoming'}
                {value === 'completed' && 'Completed'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6 space-y-6">
        <section className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setMonthAnchor(
                    new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1)
                  )
                }
                className="cursor-pointer rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
              >
                ‹
              </button>
              <h2 className="text-sm font-medium text-foreground">{monthLabel}</h2>
              <button
                type="button"
                onClick={() =>
                  setMonthAnchor(
                    new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1)
                  )
                }
                className="cursor-pointer rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
              >
                ›
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setMonthAnchor(now);
                setSelectedDate(now.toISOString().slice(0, 10));
              }}
              className="cursor-pointer rounded-md px-3 py-1 text-xs font-medium border border-border bg-background text-foreground hover:bg-muted"
            >
              Today
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="px-2 py-1 text-center">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-xs">
            {days.map((day) => {
              const key = day.toISOString().slice(0, 10);
              const inMonth = day.getMonth() === monthAnchor.getMonth();
              const count = (tasksByDate[key] ?? []).length;
              const isSelected = selectedDate === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(key)}
                  className={`cursor-pointer flex h-10 flex-col items-center justify-center rounded-md border text-xs transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : inMonth
                      ? 'border-transparent bg-background text-foreground hover:border-border hover:bg-muted'
                      : 'border-transparent bg-background text-muted-foreground/60'
                  }`}
                >
                  <span>{day.getDate()}</span>
                  {count > 0 && (
                    <span
                      className={`mt-0.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] ${
                        isSelected
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-medium text-foreground">
            Tasks on {new Date(selectedDate).toLocaleDateString()}
          </h2>
          {loading && dayTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading tasks…</p>
          ) : dayTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks on this day.</p>
          ) : (
            <TaskList tasks={dayTasks} view="list" />
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-medium text-foreground">
            {tab === 'today' && "Today's tasks"}
            {tab === 'upcoming' && 'Upcoming tasks'}
            {tab === 'completed' && 'Completed tasks'}
          </h2>
          {loading && filteredTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading tasks…</p>
          ) : filteredTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks yet in this view.</p>
          ) : (
            <TaskList tasks={filteredTasks} view="list" />
          )}
        </section>
      </div>
    </div>
  );
}
