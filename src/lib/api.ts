const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export type User = {
  id: number;
  name: string;
  email: string;
  oauth_provider?: string | null;
  google_id?: string | null;
  has_password?: boolean;
  tier?: string;
  avatar_url?: string | null;
  mode?: 'basic' | 'advanced';
  locked_folder_has_passcode?: boolean;
};
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

// Note content: block-based JSON. Paragraph text may contain HTML when edited with the rich editor.
export type NoteBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'bulletList'; items: string[] }
  | { type: 'todoList'; title?: string; items: { text: string; done: boolean }[] }
  | { type: 'image'; url: string; alt?: string };
export type NoteContent = { blocks: NoteBlock[] };

export type NoteMember = {
  id: number;
  note_id: number;
  user_id: number;
  role: 'view' | 'edit' | 'owner';
  user?: Pick<User, 'id' | 'name' | 'email'>;
};

export type Note = {
  id: number;
  user_id: number;
  title: string;
  content: NoteContent | null;
  order: number;
  locked?: boolean;
  lock_passcode_hash?: string | null;
  share_token?: string | null;
  created_at: string;
  updated_at: string;
  members?: NoteMember[];
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
  updateName: (name: string) =>
    api<{ user: User; message: string }>('/user/name', {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),
  updateMode: (mode: 'basic' | 'advanced') =>
    api<{ user: User; message: string }>('/user/mode', {
      method: 'PATCH',
      body: JSON.stringify({ mode }),
    }),
  deleteAccount: (reason: string) =>
    api<{ message: string }>('/user/delete-account', {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  reactivateAccount: (
    body:
      | { email: string; password?: string; name?: string }
      | { reactivate_token: string }
  ) =>
    api<{ user: User; access_token: string; token_type: string }>('/reactivate-account', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  /** Exchange short-lived OAuth code for access token (no token in URL). */
  exchangeCode: (code: string) =>
    api<{ user: User; access_token: string; token_type: string }>('/auth/exchange-code', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  /** Send password reset link to email. */
  sendPasswordResetLink: (email: string) =>
    api<{ message: string }>('/password/email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  /** Reset password with token from email. */
  resetPassword: (token: string, email: string, password: string, password_confirmation: string) =>
    api<{ message: string }>('/password/reset', {
      method: 'POST',
      body: JSON.stringify({ token, email, password, password_confirmation }),
    }),
  /** Change password for authenticated user (requires current password). */
  changePassword: (currentPassword: string, password: string, passwordConfirmation: string) =>
    api<{ message: string }>('/user/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      }),
    }),
  /** Set password for Google OAuth users who don't have a password yet. */
  setPassword: (password: string, passwordConfirmation: string) =>
    api<{ message: string }>('/user/set-password', {
      method: 'POST',
      body: JSON.stringify({
        password,
        password_confirmation: passwordConfirmation,
      }),
    }),
  /** Create a connect intent URL for linking Google to current user. */
  googleConnectIntent: () =>
    api<{ url: string }>('/user/oauth/google/connect-intent', {
      method: 'POST',
    }),
  /** Disconnect Google from current user (requires password set). */
  googleDisconnect: () =>
    api<{ message: string; code?: string }>('/user/oauth/google/disconnect', {
      method: 'POST',
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
  create: (
    project_id: number | null | undefined,
    title: string,
    due_date?: string,
    priority?: number,
    status?: string,
    description?: string | null
  ) =>
    api<{ data: Task }>('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        project_id: project_id ?? null,
        title,
        description: description ?? null,
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

export const notes = {
  list: () => api<{ data: Note[] }>('/notes'),
  create: (title?: string, content?: NoteContent) =>
    api<{ data: Note }>('/notes', {
      method: 'POST',
      body: JSON.stringify({ title: title ?? 'Untitled note', content: content ?? { blocks: [] } }),
    }),
  get: (id: number) => api<{ data: Note }>(`/notes/${id}`),
  update: (id: number, body: Partial<Pick<Note, 'title' | 'content' | 'locked'>>) =>
    api<{ data: Note }>(`/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: (id: number) => api<void>(`/notes/${id}`, { method: 'DELETE' }),
  reorder: (items: { id: number; order: number }[]) =>
    api<{ message: string }>('/notes/reorder', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  upload: async (noteId: number, file: File): Promise<{ url: string; path: string }> => {
    const token = getToken();
    const headers: HeadersInit = { Accept: 'application/json' };
    if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_URL}/notes/${noteId}/upload`, {
      method: 'POST',
      headers,
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error((data as { message?: string }).message ?? res.statusText ?? 'Upload failed') as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    return data as { url: string; path: string };
  },
  members: {
    list: (noteId: number) => api<{ data: NoteMember[] }>(`/notes/${noteId}/members`),
    add: (noteId: number, email: string, role: 'view' | 'edit') =>
      api<{ data: NoteMember }>(`/notes/${noteId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      }),
    update: (noteId: number, memberId: number, role: 'view' | 'edit') =>
      api<{ data: NoteMember }>(`/notes/${noteId}/members/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    remove: (noteId: number, memberId: number) =>
      api<void>(`/notes/${noteId}/members/${memberId}`, { method: 'DELETE' }),
  },
  share: {
    getToken: (noteId: number) => api<{ data: { token: string } }>(`/notes/${noteId}/share-token`),
    getByToken: (token: string) => api<{ data: Note }>(`/notes/share/${token}`),
  },
  lock: {
    lock: (noteId: number, passcode: string) =>
      api<{ message?: string; data?: Note }>(`/notes/${noteId}/lock`, {
        method: 'POST',
        body: JSON.stringify({ passcode }),
      }),
    unlock: (noteId: number, passcode: string) =>
      api<{ message?: string; unlock_token: string }>(`/notes/${noteId}/unlock`, {
        method: 'POST',
        body: JSON.stringify({ passcode }),
      }),
  },
  blocks: {
    lock: (noteId: number, blockId: string) =>
      api<{ message: string; block_id: string }>(`/notes/${noteId}/blocks/${blockId}/lock`, {
        method: 'POST',
      }),
    unlock: (noteId: number, blockId: string) =>
      api<{ message: string; block_id: string }>(`/notes/${noteId}/blocks/${blockId}/unlock`, {
        method: 'POST',
      }),
  },
};

export const lockedFolder = {
  lock: (passcode: string) =>
    api<{ message: string; unlock_token: string }>('/locked-folder/lock', {
      method: 'POST',
      body: JSON.stringify({ passcode }),
    }),
  unlock: (passcode: string) =>
    api<{ message: string; unlock_token: string }>('/locked-folder/unlock', {
      method: 'POST',
      body: JSON.stringify({ passcode }),
    }),
};
