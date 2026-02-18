'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { tasks as tasksApi, type Task } from '@/lib/api';
import TaskCard from './TaskCard';
import TaskDetailModal from './TaskDetailModal';
import { useTranslations } from 'next-intl';

interface CalendarViewProps {
  tasks: Task[];
  projectId?: number;
  onTaskUpdate: () => void;
}

export default function CalendarView({ tasks, projectId, onTaskUpdate }: CalendarViewProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);
  const tCommon = useTranslations('dashboard.common');

  const toLocalDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim() || !projectId) return;
    setAddingTask(true);
    try {
      await tasksApi.create(projectId, newTaskTitle.trim());
      setNewTaskTitle('');
      setShowAddInput(false);
      onTaskUpdate();
    } catch (error) {
      console.error('Failed to add task:', error);
    } finally {
      setAddingTask(false);
    }
  }

  async function handleToggleTask(task: Task) {
    try {
      await tasksApi.update(task.id, { completed: !task.completed });
      onTaskUpdate();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  }

  function getTasksForDate(date: Date): Task[] {
    const dateStr = toLocalDateKey(date);
    return tasks.filter((task) => {
      if (!task.due_date) return false;
      const raw = task.due_date;
      const taskDate = raw.length >= 10 ? raw.slice(0, 10) : toLocalDateKey(new Date(raw));
      return taskDate === dateStr;
    });
  }

  function getTasksWithoutDate(): Task[] {
    return tasks.filter((task) => !task.due_date);
  }

  function getDaysInMonth(date: Date): Date[] {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: Date[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(new Date(year, month, -i));
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }

  function goToPreviousMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  }

  function goToNextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  const days = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const today = new Date();
  const todayStr = toLocalDateKey(today);
  const tasksWithoutDate = getTasksWithoutDate();

  return (
    <>
      <div className="space-y-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              ←
            </button>
            <h2 className="text-lg font-semibold text-foreground">{monthName}</h2>
            <button
              type="button"
              onClick={goToNextMonth}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              →
            </button>
            <button
              type="button"
              onClick={goToToday}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Today
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 bg-muted/50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day, index) => {
              const dayStr = toLocalDateKey(day);
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isToday = dayStr === todayStr;
              const dayTasks = isCurrentMonth ? getTasksForDate(day) : [];

              return (
                <div
                  key={index}
                  className={`min-h-[100px] border-r border-b border-border p-2 ${
                    !isCurrentMonth ? 'bg-muted/20' : ''
                  } ${isToday ? 'bg-primary/5' : ''}`}
                >
                  <div
                    className={`text-sm font-medium mb-1 ${
                      isToday
                        ? 'text-primary'
                        : isCurrentMonth
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {day.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className="cursor-pointer rounded px-1.5 py-0.5 text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors truncate"
                      >
                        {task.title}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-muted-foreground px-1.5">
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tasks Without Date */}
        {tasksWithoutDate.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">No Date</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tasksWithoutDate.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => setSelectedTaskId(task.id)}
                  onToggle={() => handleToggleTask(task)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Add Task */}
        {projectId && (
          <div className="border-2 border-dashed border-border rounded-lg p-4">
            {showAddInput ? (
              <form onSubmit={handleAddTask} className="space-y-2">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onBlur={() => {
                    if (!newTaskTitle.trim()) {
                      setShowAddInput(false);
                    }
                  }}
                  autoFocus
                  placeholder="Task name"
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={addingTask || !newTaskTitle.trim()}
                    className="flex-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    {tCommon('addTask')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddInput(false);
                      setNewTaskTitle('');
                    }}
                    className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddInput(true)}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>{tCommon('addTask')}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        open={selectedTaskId !== null}
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdate={onTaskUpdate}
      />
    </>
  );
}
