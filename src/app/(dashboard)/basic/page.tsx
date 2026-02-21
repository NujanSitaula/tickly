'use client';

import { useEffect, useState } from 'react';
import { tasks as tasksApi, type Task } from '@/lib/api';

export default function BasicDashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function loadTasks() {
    try {
      setLoading(true);
      const res = await tasksApi.list();
      setTasks(res.data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      setError(null);
      const res = await tasksApi.create(null, newTitle.trim());
      setTasks((prev) => [...prev, res.data]);
      setNewTitle('');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to add task');
    }
  }

  async function toggleCompleted(task: Task) {
    try {
      const res = await tasksApi.update(task.id, {
        completed: !task.completed,
      });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? res.data : t)));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to update task');
    }
  }

  return (
    <div className="h-full">
      <div className="border-b border-border bg-background px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Basic mode</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            A simple to-do list focused on tasks only. Switch to Advanced mode in Settings for projects, Kanban, and more.
          </p>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <section className="rounded-xl border border-border bg-card p-4">
        <form onSubmit={handleAddTask} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add a task…"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          />
          <button
            type="submit"
            className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Add
          </button>
        </form>

        {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading tasks…</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks yet. Add your first one above.</p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleCompleted(task)}
                    className="h-4 w-4 rounded border-border text-primary focus-visible:ring-ring"
                  />
                  <span className={task.completed ? 'line-through text-muted-foreground' : ''}>{task.title}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

