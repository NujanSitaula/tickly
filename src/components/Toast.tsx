'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';

export interface Toast {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastProps) {
  useEffect(() => {
    const duration = toast.duration ?? 3000;
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const bgColor =
    toast.type === 'error'
      ? 'bg-destructive'
      : toast.type === 'success'
      ? 'bg-green-600'
      : toast.type === 'warning'
      ? 'bg-yellow-600'
      : 'bg-primary';

  return (
    <div
      className={`${bgColor} text-primary-foreground rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 min-w-[300px] max-w-md animate-in slide-in-from-top-5 fade-in-0`}
    >
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        className="cursor-pointer shrink-0 rounded-md p-1 hover:bg-black/20 transition-colors"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}
