'use client';

import { Calendar, CheckCircle2, Circle, MessageSquare } from 'lucide-react';
import { type Task } from '@/lib/api';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onToggle: () => void;
}

export default function TaskCard({ task, onClick, onToggle }: TaskCardProps) {
  const isDone = task.completed || task.status === 'done';
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isDone;
  const priority = task.priority ?? 4;

  const priorityAccent =
    priority === 1
      ? 'border-l-2 border-l-red-500'
      : priority === 2
        ? 'border-l-2 border-l-orange-500'
        : priority === 3
          ? 'border-l-2 border-l-amber-400'
          : '';

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    return `${day} ${month}`;
  };

  const commentCount = task.comments?.length || 0;
  const descriptionExcerpt = (task.description ?? '').trim();

  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm hover:shadow-md transition-all hover:border-primary/50 ${priorityAccent}`}
    >
      {/* Checkbox and Title */}
      <div className="flex items-start gap-2 mb-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="flex-shrink-0 mt-0.5 text-muted-foreground hover:text-primary transition-colors"
          aria-label={isDone ? 'Mark as incomplete' : 'Mark as complete'}
        >
          {isDone ? (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          ) : (
            <Circle className="h-4 w-4" />
          )}
        </button>
        <span
          className={`flex-1 text-sm font-medium ${
            isDone ? 'line-through text-muted-foreground' : 'text-card-foreground'
          }`}
        >
          {task.title}
        </span>
      </div>

      {/* Description */}
      {descriptionExcerpt && (
        <p
          className={`mb-2 text-xs line-clamp-2 ${
            isDone ? 'text-muted-foreground/70' : 'text-muted-foreground'
          }`}
        >
          {descriptionExcerpt}
        </p>
      )}

      {/* Footer: Due Date and Comments */}
      <div className="flex items-center justify-between gap-2 mt-2">
        {task.due_date && (
          <div className="flex items-center gap-1">
            <Calendar className={`h-3 w-3 ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`} />
            <span className={`text-xs ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
              {formatDate(task.due_date)}
            </span>
          </div>
        )}
        {commentCount > 0 && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            <span className="text-xs">{commentCount}</span>
          </div>
        )}
        {task.project && (
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: task.project.color || '#94a3b8' }}
            title={task.project.name}
          />
        )}
      </div>
    </div>
  );
}
