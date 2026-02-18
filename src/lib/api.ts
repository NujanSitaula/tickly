const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export type User = { id: number; name: string; email: string };
export type Project = {
  id: number;
  name: string;
  color: string | null;
  order: number;
  priority?: number;
  icon?: string | null;
  tasks_count?: number;
};
export type Subtask = {
  id: number;
  task_id: number;
  title: string;
  completed: boolean;
  order: number;
};
export type Comment = {
  id: number;
  task_id: number;
  user_id: number;
  content: string;
  created_at: string;
  user?: User;
};
export type Task = {
  id: number;
  project_id: number | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: number;
  completed: boolean;
  completed_at?: string | null;
  status: string | null;
  order: number;
  project?: { id: number; name: string; color: string | null };
  subtasks?: Subtask[];
  comments?: Comment[];
};

export type UserPreference = {
  id: number;
  user_id: number;
  key: string;
  value: string;
};

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tickly_token');
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as { message?: string }).message ?? res.statusText ?? 'Request failed') as Error & { status?: number; data?: unknown };
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data as T;
}

export const auth = {
  register: (name: string, email: string, password: string, password_confirmation: string) =>
    api<{ user: User; access_token: string; token_type: string }>('/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, password_confirmation }),
    }),
  login: (email: string, password: string) =>
    api<{ user: User; access_token: string; token_type: string }>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => api<{ message: string }>('/logout', { method: 'POST' }),
  user: () => api<{ user: User }>('/user'),
  deleteAccount: (reason: string) =>
    api<{ message: string }>('/user/delete-account', {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  reactivateAccount: (body: { email: string; password?: string; name?: string }) =>
    api<{ user: User; access_token: string; token_type: string }>('/reactivate-account', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

export const projects = {
  list: () => api<{ data: Project[] }>('/projects'),
  create: (name: string, color?: string, priority?: number, icon?: string) =>
    api<{ data: Project }>('/projects', {
      method: 'POST',
      body: JSON.stringify({
        name,
        color: color ?? null,
        priority: priority ?? 4,
        icon: icon ?? null,
      }),
    }),
  get: (id: number) => api<{ data: Project }>(`/projects/${id}`),
  update: (id: number, body: Partial<Pick<Project, 'name' | 'color' | 'order' | 'priority' | 'icon'>>) =>
    api<{ data: Project }>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: (id: number) => api<void>(`/projects/${id}`, { method: 'DELETE' }),
};

export const tasks = {
  list: (params?: { project_id?: number | 'null'; due_date?: string; completed?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.project_id !== undefined) {
      if (params.project_id === 'null') {
        q.set('project_id', 'null');
      } else if (params.project_id != null) {
        q.set('project_id', String(params.project_id));
      }
    }
    if (params?.due_date) q.set('due_date', params.due_date);
    if (params?.completed != null) q.set('completed', String(params.completed));
    const query = q.toString();
    return api<{ data: Task[] }>(`/tasks${query ? `?${query}` : ''}`);
  },
  create: (project_id: number | null | undefined, title: string, due_date?: string, priority?: number, status?: string) =>
    api<{ data: Task }>('/tasks', {
      method: 'POST',
      // Default to P4 (lowest) when not provided
      body: JSON.stringify({
        project_id: project_id ?? null,
        title,
        due_date: due_date ?? null,
        priority: priority ?? 4,
        status: status ?? 'todo',
      }),
    }),
  get: (id: number) => api<{ data: Task }>(`/tasks/${id}`),
  update: (id: number, body: Partial<Pick<Task, 'title' | 'description' | 'due_date' | 'priority' | 'completed' | 'status' | 'order' | 'project_id'>>) =>
    api<{ data: Task }>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  reorder: (items: { id: number; status: string; order: number }[]) =>
    api<void>('/tasks/reorder', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  delete: (id: number) => api<void>(`/tasks/${id}`, { method: 'DELETE' }),
};

export const subtasks = {
  list: (taskId: number) => api<{ data: Subtask[] }>(`/tasks/${taskId}/subtasks`),
  create: (taskId: number, title: string) =>
    api<{ data: Subtask }>(`/tasks/${taskId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  update: (id: number, body: Partial<Pick<Subtask, 'title' | 'completed' | 'order'>>) =>
    api<{ data: Subtask }>(`/subtasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: (id: number) => api<void>(`/subtasks/${id}`, { method: 'DELETE' }),
};

export const comments = {
  list: (taskId: number) => api<{ data: Comment[] }>(`/tasks/${taskId}/comments`),
  create: (taskId: number, content: string) =>
    api<{ data: Comment }>(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  update: (id: number, content: string) =>
    api<{ data: Comment }>(`/comments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    }),
  delete: (id: number) => api<void>(`/comments/${id}`, { method: 'DELETE' }),
};

export const userPreferences = {
  get: (key: string) => api<{ data: UserPreference | null }>(`/user/preferences/${key}`),
  set: (key: string, value: string) =>
    api<{ data: UserPreference }>(`/user/preferences/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    }),
  delete: (key: string) => api<void>(`/user/preferences/${key}`, { method: 'DELETE' }),
};
