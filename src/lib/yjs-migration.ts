import * as Y from 'yjs';
import { noteContentToYjs } from './yjs-document';
import type { NoteContent } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tickly_token');
}

/**
 * Migrate existing JSON content to Yjs format and save to backend
 */
export async function migrateContentToYjs(
  noteId: number,
  content: NoteContent | null
): Promise<void> {
  if (!content || content.blocks.length === 0) {
    // No content to migrate
    return;
  }

  try {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    // Create a temporary Yjs document
    const yDoc = new Y.Doc();
    
    // Convert content to Yjs format
    noteContentToYjs(yDoc, content);

    // Encode to binary
    const binaryState = Y.encodeStateAsUpdate(yDoc);

    // Save to backend
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
      throw new Error(errorData.message || `Migration failed: ${response.statusText}`);
    }

    console.log(`Migrated content for note ${noteId} to Yjs format`);
  } catch (error) {
    console.error('Failed to migrate content to Yjs:', error);
    // Don't throw - migration failure shouldn't break the app
    // The content will be migrated on next load attempt
  }
}

/**
 * Check if Yjs state exists for a note
 */
export async function hasYjsState(noteId: number): Promise<boolean> {
  try {
    const token = getToken();
    if (!token) {
      return false;
    }

    const response = await fetch(`${API_URL}/notes/${noteId}/yjs-state`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) return true;
    if (response.status === 404) return false;
    // For 5xx/other errors, treat state as existing/unknown to avoid destructive re-migration.
    console.warn('Could not verify Yjs state due to API error, skipping migration:', response.status);
    return true;
  } catch (error) {
    console.error('Failed to check Yjs state:', error);
    // Network errors should not trigger migration, because that can overwrite remote state.
    return true;
  }
}

/**
 * Migrate content if Yjs state doesn't exist but content does
 */
export async function migrateIfNeeded(
  noteId: number,
  content: NoteContent | null
): Promise<boolean> {
  // Check if Yjs state already exists
  const hasState = await hasYjsState(noteId);
  
  if (hasState) {
    // Already migrated
    return false;
  }

  // Check if we have content to migrate
  if (!content || content.blocks.length === 0) {
    // No content to migrate
    return false;
  }

  // Migrate content
  await migrateContentToYjs(noteId, content);
  return true;
}
