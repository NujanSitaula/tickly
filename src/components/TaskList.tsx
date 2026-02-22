'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { comments as commentsApi, tasks as tasksApi, type Comment, type Task } from '@/lib/api';
import type { ViewMode } from '@/hooks/useViewPreference';
import { useTaskStoreOptional } from '@/contexts/TaskStoreContext';
import { websocket, type WebSocketEvent } from '@/lib/websocket';
import ListView from './ListView';
import KanbanView from './KanbanView';
import CalendarView from './CalendarView';

interface TaskListProps {
  tasks: Task[];
  projectId?: number;
  /** Optional: no longer used for refetch; mutations update the store. Kept for backwards compatibility. */
  onTaskUpdate?: () => void;
  view: ViewMode;
}

export default function TaskList({ tasks, projectId, onTaskUpdate, view }: TaskListProps) {
  const taskStore = useTaskStoreOptional();
  const [commentsByTaskId, setCommentsByTaskId] = useState<Record<number, Comment[]>>({});
  const commentsRef = useRef(commentsByTaskId);
  const refreshTimer = useRef<number | null>(null);

  useEffect(() => {
    commentsRef.current = commentsByTaskId;
  }, [commentsByTaskId]);

  const requestRefresh = useCallback(() => {
    if (refreshTimer.current != null || !onTaskUpdate) return;
    refreshTimer.current = window.setTimeout(() => {
      refreshTimer.current = null;
      onTaskUpdate();
    }, 120);
  }, [onTaskUpdate]);

  const refreshCommentsForTask = useCallback(async (taskId: number) => {
    try {
      const res = await commentsApi.list(taskId);
      setCommentsByTaskId((prev) => ({ ...prev, [taskId]: res.data }));
    } catch {
      // ignore
    }
  }, []);

  const tasksWithComments = useMemo(() => {
    return tasks.map((task) => {
      const fromApi = task.comments;
      const fromCache = commentsByTaskId[task.id];
      return {
        ...task,
        comments: fromApi ?? fromCache ?? [],
      };
    });
  }, [tasks, commentsByTaskId]);

  // Load comments only when missing (avoid refetching on reorder)
  useEffect(() => {
    if (tasks.length === 0) return;

    let cancelled = false;

    const missing = tasks.filter((t) => {
      if (t.comments != null) return false;
      return commentsRef.current[t.id] == null;
    });

    if (missing.length === 0) return;

    (async () => {
      const results = await Promise.allSettled(
        missing.map(async (task) => {
          const res = await commentsApi.list(task.id);
          return [task.id, res.data] as const;
        })
      );

      if (cancelled) return;

      setCommentsByTaskId((prev) => {
        const next = { ...prev };
        for (const r of results) {
          if (r.status === 'fulfilled') {
            next[r.value[0]] = r.value[1];
          }
        }
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [tasks]);

  // Realtime: on task.updated fetch single task and update store; on comment events refresh comments only
  useEffect(() => {
    const taskUpdatedHandler = async (data: WebSocketEvent['data']) => {
      if (!taskStore || !('task_id' in data) || typeof data.task_id !== 'number') return;
      try {
        const res = await tasksApi.get(data.task_id);
        taskStore.replaceTask(res.data);
      } catch {
        // ignore
      }
    };
    const commentOrSubtaskHandler = (data: WebSocketEvent['data']) => {
      if ('task_id' in data && typeof data.task_id === 'number') {
        if ('comment' in data || 'comment_id' in data) {
          refreshCommentsForTask(data.task_id);
        }
      }
    };

    websocket.on('task.updated', taskUpdatedHandler);
    websocket.on('subtask.created', commentOrSubtaskHandler);
    websocket.on('subtask.updated', commentOrSubtaskHandler);
    websocket.on('subtask.deleted', commentOrSubtaskHandler);
    websocket.on('comment.created', commentOrSubtaskHandler);
    websocket.on('comment.updated', commentOrSubtaskHandler);
    websocket.on('comment.deleted', commentOrSubtaskHandler);

    return () => {
      websocket.off('task.updated', taskUpdatedHandler);
      websocket.off('subtask.created', commentOrSubtaskHandler);
      websocket.off('subtask.updated', commentOrSubtaskHandler);
      websocket.off('subtask.deleted', commentOrSubtaskHandler);
      websocket.off('comment.created', commentOrSubtaskHandler);
      websocket.off('comment.updated', commentOrSubtaskHandler);
      websocket.off('comment.deleted', commentOrSubtaskHandler);

      if (refreshTimer.current != null) {
        window.clearTimeout(refreshTimer.current);
        refreshTimer.current = null;
      }
    };
  }, [taskStore, refreshCommentsForTask]);

  // Render the appropriate view component
  if (view === 'kanban') {
    return <KanbanView tasks={tasksWithComments} projectId={projectId} onTaskUpdate={onTaskUpdate} />;
  }

  if (view === 'calendar') {
    return <CalendarView tasks={tasksWithComments} projectId={projectId} onTaskUpdate={onTaskUpdate} />;
  }

  return <ListView tasks={tasksWithComments} projectId={projectId} onTaskUpdate={onTaskUpdate} />;
}
