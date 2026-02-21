import { useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { yjsToNoteContent } from '@/lib/yjs-document';
import type { NoteContent } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const AUTOSAVE_INTERVAL_MS = 3000; // Save every 3 seconds
const IDLE_SAVE_DELAY_MS = 2000; // Save 2 seconds after last change

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tickly_token');
}

interface UseYjsAutosaveOptions {
  yDoc: Y.Doc | null;
  noteId: number;
  enabled?: boolean;
  onSaveStart?: () => void;
  onSaveComplete?: () => void;
  onSaveError?: (error: Error) => void;
  syncContentToJson?: boolean; // If true, also update the JSON content field for backward compatibility
}

/**
 * Hook for autosaving Yjs document state
 */
export function useYjsAutosave({
  yDoc,
  noteId,
  enabled = true,
  onSaveStart,
  onSaveComplete,
  onSaveError,
  syncContentToJson = false,
}: UseYjsAutosaveOptions): {
  saving: boolean;
  lastSaved: Date | null;
} {
  const savingRef = useRef(false);
  const lastSavedRef = useRef<Date | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasChangesRef = useRef(false);

  const saveState = async () => {
    if (!yDoc || savingRef.current) return;

    savingRef.current = true;
    onSaveStart?.();

    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      // Encode Yjs document state to binary
      const binaryState = Y.encodeStateAsUpdate(yDoc);

      // POST to backend
      const response = await fetch(`${API_URL}/notes/${noteId}/yjs-state`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
        },
        body: binaryState,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to save: ${response.statusText}`);
      }

      // Optionally sync content back to JSON field for backward compatibility
      if (syncContentToJson) {
        try {
          const content: NoteContent = yjsToNoteContent(yDoc);
          await fetch(`${API_URL}/notes/${noteId}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content }),
          });
        } catch (jsonSyncError) {
          // Log but don't fail the save if JSON sync fails
          console.warn('Failed to sync content to JSON field:', jsonSyncError);
        }
      }

      lastSavedRef.current = new Date();
      hasChangesRef.current = false;
      onSaveComplete?.();
    } catch (error) {
      console.error('Autosave error:', error);
      onSaveError?.(error instanceof Error ? error : new Error(String(error)));
    } finally {
      savingRef.current = false;
    }
  };

  // Periodic save
  useEffect(() => {
    if (!enabled || !yDoc) return;

    const intervalId = setInterval(() => {
      if (hasChangesRef.current && !savingRef.current) {
        saveState();
      }
    }, AUTOSAVE_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, yDoc, noteId]);

  // Idle save (save after no changes for a period)
  useEffect(() => {
    if (!enabled || !yDoc) return;

    const handleUpdate = () => {
      hasChangesRef.current = true;

      // Clear existing idle timeout
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }

      // Set new idle timeout
      idleTimeoutRef.current = setTimeout(() => {
        if (hasChangesRef.current && !savingRef.current) {
          saveState();
        }
      }, IDLE_SAVE_DELAY_MS);
    };

    // Listen to Yjs document updates
    yDoc.on('update', handleUpdate);

    return () => {
      yDoc.off('update', handleUpdate);
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, [enabled, yDoc]);

  // Save on window beforeunload
  useEffect(() => {
    if (!enabled || !yDoc) return;

    const handleBeforeUnload = () => {
      if (hasChangesRef.current && !savingRef.current) {
        // Use sendBeacon for reliable save on page unload
        const token = getToken();
        if (token) {
          const binaryState = Y.encodeStateAsUpdate(yDoc);
          navigator.sendBeacon(
            `${API_URL}/notes/${noteId}/yjs-state`,
            new Blob([binaryState], { type: 'application/octet-stream' })
          );
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, yDoc, noteId]);

  return {
    saving: savingRef.current,
    lastSaved: lastSavedRef.current,
  };
}
