const STORAGE_KEY = 'locked_folder_unlocked';

interface LockedFolderState {
  unlockToken: string;
  timestamp: number;
}

function getState(): LockedFolderState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LockedFolderState;
  } catch {
    return null;
  }
}

export function isLockedFolderUnlocked(): boolean {
  return !!getState();
}

export function setLockedFolderUnlocked(unlockToken: string): void {
  if (typeof window === 'undefined') return;
  const state: LockedFolderState = {
    unlockToken,
    timestamp: Date.now(),
  };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function clearLockedFolderUnlock(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

