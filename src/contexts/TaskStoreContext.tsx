'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import type { Task } from '@/lib/api';

// Single source of truth: tasks by id + ordered ids for current view.
// No refetch after mutations; only rollback on API failure.
type TaskStoreState = {
  tasksById: Record<number, Task>;
  orderedIds: number[];
  viewKey: string;
  loading: boolean;
};

const initialState: TaskStoreState = {
  tasksById: {},
  orderedIds: [],
  viewKey: '',
  loading: false,
};

/** Whether a task belongs to the given view (for addTask prepend). */
function taskMatchesView(task: Task, viewKey: string): boolean {
  if (!viewKey) return false;
  if (viewKey === 'inbox') return task.project_id === null;
  if (viewKey.startsWith('project:')) {
    const id = parseInt(viewKey.slice(8), 10);
    return task.project_id === id;
  }
  if (viewKey === 'today') {
    const todayKey = new Date().toISOString().slice(0, 10);
    return !!(task.due_date && task.due_date.slice(0, 10) === todayKey);
  }
  if (viewKey === 'upcoming') {
    const now = new Date();
    return !!(task.due_date && new Date(task.due_date) > now);
  }
  if (viewKey === 'calendar') return true;
  if (viewKey === 'completed') return !!task.completed;
  return false;
}

type TaskStoreAction =
  | { type: 'SET_VIEW'; viewKey: string }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_TASKS_FROM_FETCH'; tasks: Task[] }
  | { type: 'REPLACE_TASK'; task: Task }
  | { type: 'UPDATE_TASK'; id: number; patch: Partial<Task> }
  | { type: 'REORDER_TASKS'; tasks: Task[] }
  | { type: 'ADD_TASK'; task: Task }
  | { type: 'REMOVE_TASK'; id: number }
  | { type: 'ROLLBACK_TASK'; task: Task };

function taskStoreReducer(state: TaskStoreState, action: TaskStoreAction): TaskStoreState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, viewKey: action.viewKey };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_TASKS_FROM_FETCH': {
      const tasksById = { ...state.tasksById };
      for (const t of action.tasks) {
        tasksById[t.id] = t;
      }
      return {
        ...state,
        tasksById,
        orderedIds: action.tasks.map((t) => t.id),
        loading: false,
      };
    }
    case 'REPLACE_TASK': {
      const task = action.task;
      const tasksById = { ...state.tasksById, [task.id]: task };
      const hasId = state.orderedIds.includes(task.id);
      return {
        ...state,
        tasksById,
        orderedIds: hasId ? state.orderedIds : [task.id, ...state.orderedIds],
      };
    }
    case 'UPDATE_TASK': {
      const existing = state.tasksById[action.id];
      if (!existing) return state;
      const tasksById = {
        ...state.tasksById,
        [action.id]: { ...existing, ...action.patch },
      };
      return { ...state, tasksById };
    }
    case 'REORDER_TASKS': {
      const tasksById = { ...state.tasksById };
      for (const t of action.tasks) {
        tasksById[t.id] = { ...(tasksById[t.id] ?? t), ...t };
      }
      return {
        ...state,
        tasksById,
        orderedIds: action.tasks.map((t) => t.id),
      };
    }
    case 'ADD_TASK': {
      const task = action.task;
      const tasksById = { ...state.tasksById, [task.id]: task };
      if (state.orderedIds.includes(task.id)) {
        return { ...state, tasksById };
      }
      // Only prepend to current view list if task matches this view's filter
      if (!taskMatchesView(task, state.viewKey)) {
        return { ...state, tasksById };
      }
      return {
        ...state,
        tasksById,
        orderedIds: [task.id, ...state.orderedIds],
      };
    }
    case 'REMOVE_TASK': {
      const { [action.id]: _, ...rest } = state.tasksById;
      return {
        ...state,
        tasksById: rest,
        orderedIds: state.orderedIds.filter((id) => id !== action.id),
      };
    }
    case 'ROLLBACK_TASK': {
      const task = action.task;
      return {
        ...state,
        tasksById: { ...state.tasksById, [task.id]: task },
      };
    }
    default:
      return state;
  }
}

type TaskStoreApi = {
  viewKey: string;
  loading: boolean;
  getTasks: () => Task[];
  setViewKey: (key: string) => void;
  /** Load tasks for a view (e.g. on page mount). Fetches and merges into store. No refetch after mutations. */
  loadTasksForView: (key: string, fetchFn: () => Promise<Task[]>) => Promise<void>;
  /** Replace one task (e.g. after modal save or single-task fetch). Does not trigger refetch. */
  replaceTask: (task: Task) => void;
  /** Optimistic update one task. Rollback on API failure with rollbackTask. */
  updateTask: (id: number, patch: Partial<Task>) => void;
  /** Optimistic reorder; call after drag. Rollback on API failure. */
  reorderTasks: (tasks: Task[]) => void;
  /** Add task to current view (e.g. after create). */
  addTask: (task: Task) => void;
  removeTask: (id: number) => void;
  /** Restore task after failed mutation. */
  rollbackTask: (task: Task) => void;
};

const TaskStoreContext = createContext<TaskStoreApi | null>(null);

export function TaskStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(taskStoreReducer, initialState);

  const getTasks = useCallback(() => {
    const list = state.orderedIds
      .map((id) => state.tasksById[id])
      .filter((t): t is Task => t != null);
    if (!state.viewKey) return list;
    return list.filter((t) => taskMatchesView(t, state.viewKey));
  }, [state.orderedIds, state.tasksById, state.viewKey]);

  const setViewKey = useCallback((key: string) => {
    dispatch({ type: 'SET_VIEW', viewKey: key });
  }, []);

  const loadTasksForView = useCallback(async (key: string, fetchFn: () => Promise<Task[]>) => {
    dispatch({ type: 'SET_VIEW', viewKey: key });
    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      const tasks = await fetchFn();
      dispatch({ type: 'SET_TASKS_FROM_FETCH', tasks });
    } catch (e) {
      dispatch({ type: 'SET_LOADING', loading: false });
      throw e;
    }
  }, []);

  const replaceTask = useCallback((task: Task) => {
    dispatch({ type: 'REPLACE_TASK', task });
  }, []);

  const updateTask = useCallback((id: number, patch: Partial<Task>) => {
    dispatch({ type: 'UPDATE_TASK', id, patch });
  }, []);

  const reorderTasks = useCallback((tasks: Task[]) => {
    dispatch({ type: 'REORDER_TASKS', tasks });
  }, []);

  const addTask = useCallback((task: Task) => {
    dispatch({ type: 'ADD_TASK', task });
  }, []);

  const removeTask = useCallback((id: number) => {
    dispatch({ type: 'REMOVE_TASK', id });
  }, []);

  const rollbackTask = useCallback((task: Task) => {
    dispatch({ type: 'ROLLBACK_TASK', task });
  }, []);

  const api = useMemo<TaskStoreApi>(
    () => ({
      viewKey: state.viewKey,
      loading: state.loading,
      getTasks,
      setViewKey,
      loadTasksForView,
      replaceTask,
      updateTask,
      reorderTasks,
      addTask,
      removeTask,
      rollbackTask,
    }),
    [
      state.viewKey,
      state.loading,
      getTasks,
      setViewKey,
      loadTasksForView,
      replaceTask,
      updateTask,
      reorderTasks,
      addTask,
      removeTask,
      rollbackTask,
    ]
  );

  return (
    <TaskStoreContext.Provider value={api}>
      {children}
    </TaskStoreContext.Provider>
  );
}

export function useTaskStore(): TaskStoreApi {
  const ctx = useContext(TaskStoreContext);
  if (!ctx) {
    throw new Error('useTaskStore must be used within TaskStoreProvider');
  }
  return ctx;
}

export function useTaskStoreOptional(): TaskStoreApi | null {
  return useContext(TaskStoreContext);
}
