/**
 * WebSocket client for real-time updates using Pusher
 */

import type { Comment, Note, Subtask, Task } from './api';

// Custom event types
export type WebSocketEvent =
  | { type: 'task.updated'; data: { task: Task } }
  | { type: 'subtask.created'; data: { subtask: Subtask; task_id: number } }
  | { type: 'subtask.updated'; data: { subtask: Subtask; task_id: number } }
  | { type: 'subtask.deleted'; data: { subtask_id: number; task_id: number } }
  | { type: 'comment.created'; data: { comment: Comment; task_id: number } }
  | { type: 'comment.updated'; data: { comment: Comment; task_id: number } }
  | { type: 'comment.deleted'; data: { comment_id: number; task_id: number } }
  | { type: 'note.created'; data: { note: Note } }
  | { type: 'note.updated'; data: { note: Note } }
  | { type: 'note.deleted'; data: { note_id: number } }
  | { type: 'note.shared_updated'; data: { note: Note } }
  | { type: 'note.block_locked'; data: { note_id: number; block_id: string; user_id: number } }
  | { type: 'note.block_unlocked'; data: { note_id: number; block_id: string; user_id: number } };

type EventCallback = (data: any) => void;

class WebSocketClient {
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private initialized = false;
  private echoInstance: any = null;

  init(userId: number) {
    if (this.initialized) return;
    this.initialized = true;

    // Check if Pusher credentials are configured
    // In Next.js, NEXT_PUBLIC_ env vars are embedded at build time
    // For dev server, restart is needed after .env.local changes
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_APP_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (pusherKey && pusherCluster && apiUrl && typeof window !== 'undefined') {
      // Use Pusher if credentials are available
      Promise.all([
        import('pusher-js'),
        import('laravel-echo'),
      ])
        .then(([PusherModule, EchoModule]) => {
          const Pusher = PusherModule.default;
          const Echo = EchoModule.default;

          const pusher = new Pusher(pusherKey, {
            cluster: pusherCluster,
            authEndpoint: `${apiUrl}/broadcasting/auth`,
            auth: {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('tickly_token')}`,
              },
            },
            enabledTransports: ['ws', 'wss'],
            forceTLS: true,
          });

          const token = localStorage.getItem('tickly_token');

          const echo = new Echo({
            broadcaster: 'pusher',
            key: pusherKey,
            cluster: pusherCluster,
            authEndpoint: `${apiUrl}/broadcasting/auth`,
            auth: {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          });

          this.echoInstance = echo;
          const channel = echo.private(`user.${userId}`);

          // Listen for subscription errors
          channel.error((error: any) => {
            console.error('Channel subscription error:', error);
          });

          channel
            .listen('.task.updated', (data: { task: Task }) => {
              this.emit('task.updated', data);
            })
            .listen('.subtask.created', (data: { subtask: Subtask; task_id: number }) => {
              this.emit('subtask.created', data);
            })
            .listen('.subtask.updated', (data: { subtask: Subtask; task_id: number }) => {
              this.emit('subtask.updated', data);
            })
            .listen('.subtask.deleted', (data: { subtask_id: number; task_id: number }) => {
              this.emit('subtask.deleted', data);
            })
            .listen('.comment.created', (data: { comment: Comment; task_id: number }) => {
              this.emit('comment.created', data);
            })
            .listen('.comment.updated', (data: { comment: Comment; task_id: number }) => {
              this.emit('comment.updated', data);
            })
            .listen('.comment.deleted', (data: { comment_id: number; task_id: number }) => {
              this.emit('comment.deleted', data);
            })
            .listen('.note.created', (data: { note: Note }) => {
              this.emit('note.created', data);
            })
            .listen('.note.updated', (data: { note: Note }) => {
              this.emit('note.updated', data);
            })
            .listen('.note.deleted', (data: { note_id: number }) => {
              this.emit('note.deleted', data);
            })
            .listen('.note.shared_updated', (data: { note: Note }) => {
              this.emit('note.shared_updated', data);
            })
            .listen('.note.block_locked', (data: { note_id: number; block_id: string; user_id: number }) => {
              this.emit('note.block_locked', data);
            })
            .listen('.note.block_unlocked', (data: { note_id: number; block_id: string; user_id: number }) => {
              this.emit('note.block_unlocked', data);
            });
        })
        .catch((error) => {
          console.error('Failed to initialize Pusher:', error);
          console.warn('Falling back to window events');
          this.setupWindowEventListeners();
        });
    } else {
      // Fallback: use window events if Pusher is not configured
      this.setupWindowEventListeners();
    }
  }

  private setupWindowEventListeners() {
    // Fallback: listen to window events (can be triggered by polling or other mechanisms)
    if (typeof window === 'undefined') return;

    window.addEventListener('websocket:task.updated', ((e: CustomEvent) => {
      this.emit('task.updated', e.detail);
    }) as EventListener);

    window.addEventListener('websocket:subtask.created', ((e: CustomEvent) => {
      this.emit('subtask.created', e.detail);
    }) as EventListener);

    window.addEventListener('websocket:subtask.updated', ((e: CustomEvent) => {
      this.emit('subtask.updated', e.detail);
    }) as EventListener);

    window.addEventListener('websocket:subtask.deleted', ((e: CustomEvent) => {
      this.emit('subtask.deleted', e.detail);
    }) as EventListener);

    window.addEventListener('websocket:comment.created', ((e: CustomEvent) => {
      this.emit('comment.created', e.detail);
    }) as EventListener);

    window.addEventListener('websocket:comment.updated', ((e: CustomEvent) => {
      this.emit('comment.updated', e.detail);
    }) as EventListener);

    window.addEventListener('websocket:comment.deleted', ((e: CustomEvent) => {
      this.emit('comment.deleted', e.detail);
    }) as EventListener);

    window.addEventListener('websocket:note.created', ((e: CustomEvent) => {
      this.emit('note.created', e.detail);
    }) as EventListener);

    window.addEventListener('websocket:note.updated', ((e: CustomEvent) => {
      this.emit('note.updated', e.detail);
    }) as EventListener);

    window.addEventListener('websocket:note.deleted', ((e: CustomEvent) => {
      this.emit('note.deleted', e.detail);
    }) as EventListener);

    window.addEventListener('websocket:note.shared_updated', ((e: CustomEvent) => {
      this.emit('note.shared_updated', e.detail);
    }) as EventListener);

    window.addEventListener('websocket:note.block_locked', ((e: CustomEvent) => {
      this.emit('note.block_locked', e.detail);
    }) as EventListener);

    window.addEventListener('websocket:note.block_unlocked', ((e: CustomEvent) => {
      this.emit('note.block_unlocked', e.detail);
    }) as EventListener);
  }

  on(event: 'note.updated', callback: (data: { note: Note }) => void): void;
  on(event: 'note.deleted', callback: (data: { note_id: number }) => void): void;
  on(event: 'note.shared_updated', callback: (data: { note: Note }) => void): void;
  on(event: 'note.created', callback: (data: { note: Note }) => void): void;
  on(event: 'note.block_locked', callback: (data: { note_id: number; block_id: string; user_id: number }) => void): void;
  on(event: 'note.block_unlocked', callback: (data: { note_id: number; block_id: string; user_id: number }) => void): void;
  on(event: 'task.updated', callback: (data: { task: Task }) => void): void;
  on(event: 'subtask.created', callback: (data: { subtask: Subtask; task_id: number }) => void): void;
  on(event: 'subtask.updated', callback: (data: { subtask: Subtask; task_id: number }) => void): void;
  on(event: 'subtask.deleted', callback: (data: { subtask_id: number; task_id: number }) => void): void;
  on(event: 'comment.created', callback: (data: { comment: Comment; task_id: number }) => void): void;
  on(event: 'comment.updated', callback: (data: { comment: Comment; task_id: number }) => void): void;
  on(event: 'comment.deleted', callback: (data: { comment_id: number; task_id: number }) => void): void;
  on(event: WebSocketEvent['type'], callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: 'note.updated', callback: (data: { note: Note }) => void): void;
  off(event: 'note.deleted', callback: (data: { note_id: number }) => void): void;
  off(event: 'note.shared_updated', callback: (data: { note: Note }) => void): void;
  off(event: 'note.created', callback: (data: { note: Note }) => void): void;
  off(event: 'note.block_locked', callback: (data: { note_id: number; block_id: string; user_id: number }) => void): void;
  off(event: 'note.block_unlocked', callback: (data: { note_id: number; block_id: string; user_id: number }) => void): void;
  off(event: 'task.updated', callback: (data: { task: Task }) => void): void;
  off(event: 'subtask.created', callback: (data: { subtask: Subtask; task_id: number }) => void): void;
  off(event: 'subtask.updated', callback: (data: { subtask: Subtask; task_id: number }) => void): void;
  off(event: 'subtask.deleted', callback: (data: { subtask_id: number; task_id: number }) => void): void;
  off(event: 'comment.created', callback: (data: { comment: Comment; task_id: number }) => void): void;
  off(event: 'comment.updated', callback: (data: { comment: Comment; task_id: number }) => void): void;
  off(event: 'comment.deleted', callback: (data: { comment_id: number; task_id: number }) => void): void;
  off(event: WebSocketEvent['type'], callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: WebSocketEvent['type'], data: WebSocketEvent['data']) {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }

  disconnect() {
    if (this.echoInstance) {
      this.echoInstance.disconnect();
      this.echoInstance = null;
    }
    this.listeners.clear();
    this.initialized = false;
  }
}

export const websocket = new WebSocketClient();
