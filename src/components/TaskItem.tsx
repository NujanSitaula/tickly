'use client';

import {
  Calendar,
  CheckCircle2,
  Circle,
  Folder,
  GripVertical,
  MessageSquare,
  MoreHorizontal,
  Pencil,
} from 'lucide-react';
import type React from 'react';
import { type Task } from '@/lib/api';

interface TaskItemProps {
  task: Task;
  onClick: () => void;
  onToggle: () => void;
  onUpdate?: () => void;
  showDivider?: boolean;
  dragHandleProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
}

export default function TaskItem({
  task,
  onClick,
  onToggle,
  onUpdate,
  showDivider = true,
  dragHandleProps,
}: TaskItemProps) {
  const isDone = task.completed || task.status === 'done';
  const isOverdue =
    task.due_date && new Date(task.due_date) < new Date() && !isDone;
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
      className={`group flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors ${priorityAccent} ${
        showDivider ? 'border-b border-border' : ''
      }`}
    >
      {/* Drag Handle */}
      <button
        type="button"
        className={`flex-shrink-0 text-muted-foreground transition-opacity cursor-grab active:cursor-grabbing ${
          dragHandleProps ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        aria-label="Drag to reorder"
        onClick={(e) => e.stopPropagation()}
        {...dragHandleProps}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Checkbox */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="cursor-pointer flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
        aria-label={isDone ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {isDone ? (
          <CheckCircle2 className="h-5 w-5 text-primary" />
        ) : (
          <Circle className="h-5 w-5" />
        )}
      </button>

      {/* Task Content - button for keyboard and screen reader */}
      <button
        type="button"
        onClick={onClick}
        className="flex-1 min-w-0 text-left cursor-pointer rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        aria-label={`Open task: ${task.title}`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`flex-1 text-foreground ${
              isDone ? 'line-through text-muted-foreground' : ''
            }`}
          >
            {task.title}
          </span>
        </div>

        {descriptionExcerpt && (
          <span
            className={`mt-0.5 block truncate text-sm ${
              isDone ? 'text-muted-foreground/70' : 'text-muted-foreground'
            }`}
            title={descriptionExcerpt}
          >
            {descriptionExcerpt}
          </span>
        )}

        {task.due_date && (
          <div className="flex items-center gap-1.5 mt-1">
            <Calendar className={`h-3.5 w-3.5 ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`} aria-hidden="true" />
            <span className={`text-xs ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
              {formatDate(task.due_date)}
            </span>
          </div>
        )}
      </button>

      {/* Action Icons */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="cursor-pointer p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Edit task"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="cursor-pointer p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Move to project"
        >
          <Folder className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="cursor-pointer relative p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Comments"
        >
          <MessageSquare className="h-4 w-4" />
          {commentCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] font-medium text-white bg-primary rounded-full">
              {commentCount}
            </span>
          )}
        </button>
        <button
          type="button"
          className="cursor-pointer p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="More options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
