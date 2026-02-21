const STORAGE_KEY = 'unlocked_notes';

interface UnlockedNote {
  unlockToken: string;
  timestamp: number;
}

/**
 * Get all unlocked notes from sessionStorage
 */
function getUnlockedNotes(): Record<string, UnlockedNote> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Save unlocked notes to sessionStorage
 */
function saveUnlockedNotes(notes: Record<string, UnlockedNote>): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if a note is unlocked in the current session
 */
export function isNoteUnlocked(noteId: number): boolean {
  const unlocked = getUnlockedNotes();
  return !!unlocked[noteId.toString()];
}

/**
 * Mark a note as unlocked in the current session
 */
export function setNoteUnlocked(noteId: number, unlockToken: string): void {
  const unlocked = getUnlockedNotes();
  unlocked[noteId.toString()] = {
    unlockToken,
    timestamp: Date.now(),
  };
  saveUnlockedNotes(unlocked);
}

/**
 * Clear unlock state for a specific note
 */
export function clearNoteUnlock(noteId: number): void {
  const unlocked = getUnlockedNotes();
  delete unlocked[noteId.toString()];
  saveUnlockedNotes(unlocked);
}

/**
 * Clear all unlock states (useful on logout)
 */
export function clearAllUnlocks(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
