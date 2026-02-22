import { useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { yjsToNoteContent } from '@/lib/yjs-document';
import type { NoteContent } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const DEBOUNCE_MS = 2000; // Save 2 seconds after last update

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
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      // POST to backend (Blob for fetch BodyInit compatibility)
      const response = await fetch(`${API_URL}/notes/${noteId}/yjs-state`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
        },
        body: new Blob([new Uint8Array(binaryState)]),
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
      onSaveComplete?.();
    } catch (error) {
      console.error('Autosave error:', error);
      onSaveError?.(error instanceof Error ? error : new Error(String(error)));
    } finally {
      savingRef.current = false;
    }
  };

  // Update-driven debounced save (no fixed interval)
  useEffect(() => {
    if (!enabled || !yDoc) return;

    const handleUpdate = () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        if (!savingRef.current) {
          saveState();
        }
      }, DEBOUNCE_MS);
    };

    yDoc.on('update', handleUpdate);

    return () => {
      yDoc.off('update', handleUpdate);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [enabled, yDoc]);

  // Save on window beforeunload
  useEffect(() => {
    if (!enabled || !yDoc) return;

    const handleBeforeUnload = () => {
      if (!savingRef.current) {
        // Use sendBeacon for reliable save on page unload
        const token = getToken();
        if (token) {
          const binaryState = Y.encodeStateAsUpdate(yDoc);
          navigator.sendBeacon(
            `${API_URL}/notes/${noteId}/yjs-state`,
            new Blob([new Uint8Array(binaryState)], { type: 'application/octet-stream' })
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
