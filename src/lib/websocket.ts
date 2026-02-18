/**
 * WebSocket client for real-time updates
 * 
 * Currently uses custom events. To enable Pusher:
 * 1. Install: npm install pusher-js laravel-echo
 * 2. Configure Pusher credentials in .env
 * 3. Uncomment and configure the Pusher setup below
 */

import type { Comment, Subtask, Task } from './api';

// Custom event types
export type WebSocketEvent =
  | { type: 'task.updated'; data: { task: Task } }
  | { type: 'subtask.created'; data: { subtask: Subtask; task_id: number } }
  | { type: 'subtask.updated'; data: { subtask: Subtask; task_id: number } }
  | { type: 'subtask.deleted'; data: { subtask_id: number; task_id: number } }
  | { type: 'comment.created'; data: { comment: Comment; task_id: number } }
  | { type: 'comment.updated'; data: { comment: Comment; task_id: number } }
  | { type: 'comment.deleted'; data: { comment_id: number; task_id: number } };

type EventCallback = (data: WebSocketEvent['data']) => void;

class WebSocketClient {
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private initialized = false;

  init(userId: number) {
    if (this.initialized) return;
    this.initialized = true;

    // TODO: Uncomment when Pusher is configured
    /*
    import Pusher from 'pusher-js';
    import Echo from 'laravel-echo';

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_APP_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER!,
      authEndpoint: `${process.env.NEXT_PUBLIC_API_URL}/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('tickly_token')}`,
        },
      },
    });

    const echo = new Echo({
      broadcaster: 'pusher',
      key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER!,
      authEndpoint: `${process.env.NEXT_PUBLIC_API_URL}/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('tickly_token')}`,
        },
      },
    });

    const channel = echo.private(`user.${userId}`);

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
      });
    */

    // For now, listen to window events (can be triggered by polling or other mechanisms)
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
  }

  on(event: WebSocketEvent['type'], callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: WebSocketEvent['type'], callback: EventCallback) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: WebSocketEvent['type'], data: WebSocketEvent['data']) {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }

  disconnect() {
    this.listeners.clear();
    this.initialized = false;
  }
}

export const websocket = new WebSocketClient();
