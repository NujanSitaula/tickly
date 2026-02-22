'use client';

import { notes as notesApi, type Note } from '@/lib/api';
import { websocket } from '@/lib/websocket';
import { FileText, Folder, FolderLock, Users, Plus, GripVertical } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { auth as authApi } from '@/lib/api';
import UnlockFolderModal from '@/components/UnlockFolderModal';
import LockFolderModal from '@/components/LockFolderModal';
import { isLockedFolderUnlocked } from '@/utils/lockedFolder';
import ToastContainer, { type Toast } from '@/components/Toast';
import { NotesContentSkeleton } from '@/components/Skeleton';
import {
  DndContext,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  type DragCancelEvent,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

function getNoteExcerpt(note: Note): string {
  const content = note.content;
  if (!content || !Array.isArray(content.blocks)) return '';

  for (const block of content.blocks) {
    if (!block) continue;

    if (block.type === 'paragraph') {
      // Strip any HTML tags from rich text
      const plain = (block.text ?? '').replace(/<[^>]+>/g, '').trim();
      if (plain) {
        return plain.length > 90 ? `${plain.slice(0, 87)}…` : plain;
      }
    }

    if (block.type === 'bulletList' && Array.isArray(block.items) && block.items.length > 0) {
      const first = String(block.items[0] ?? '').trim();
      if (first) {
        return first.length > 90 ? `${first.slice(0, 87)}…` : first;
      }
    }

    if (block.type === 'todoList' && Array.isArray(block.items) && block.items.length > 0) {
      const first = String(block.items[0]?.text ?? '').trim();
      if (first) {
        return first.length > 90 ? `${first.slice(0, 87)}…` : first;
      }
    }
  }

  return '';
}

type NotesTab = 'all' | 'locked' | 'shared';

interface FolderTabProps {
  id: string;
  tab: NotesTab;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: (tab: NotesTab) => void;
  justDroppedOnId: string | null;
  justDroppedOnRef: React.MutableRefObject<string | null>;
}

function FolderTab({ id, tab, label, icon, active, onClick, justDroppedOnId, justDroppedOnRef }: FolderTabProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { type: 'folder', tab },
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent click if we just dropped on this folder (check both state and ref for immediate check)
    if (justDroppedOnRef.current === id || justDroppedOnId === id) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // Prevent onClick if we just dropped on this folder (check both state and ref for immediate check)
    if (justDroppedOnRef.current === id || justDroppedOnId === id) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick(tab);
  };

  return (
    <button
      type="button"
      ref={setNodeRef}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      className={`relative flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-medium shadow-sm transition-colors cursor-pointer ${
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-background text-muted-foreground hover:bg-muted'
      } ${isOver ? 'ring-2 ring-primary/40 border-primary/60 bg-primary/5' : ''}`}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

interface DraggableNoteProps {
  note: Note;
  children: React.ReactNode;
}

function DraggableNote({ note, children }: DraggableNoteProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `note-${note.id}`,
    data: { type: 'note', noteId: note.id },
  });

  const style: React.CSSProperties = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="relative group"
      {...attributes}
    >
      <div
        {...listeners}
        data-drag-handle
        className="absolute left-2 top-4 cursor-grab active:cursor-grabbing p-1.5 text-muted-foreground hover:text-foreground transition-colors z-30 touch-none select-none"
        style={{ touchAction: 'none' }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div className={isDragging ? 'pointer-events-none' : ''}>
        {children}
      </div>
    </li>
  );
}

export default function NotesListPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<NotesTab>('all');
  const [lockedFolderModal, setLockedFolderModal] = useState<'set' | 'unlock' | null>(null);
  const [isDraggingNote, setIsDraggingNote] = useState(false);
  const [justDroppedOnId, setJustDroppedOnId] = useState<string | null>(null);
  const justDroppedOnRef = useRef<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const router = useRouter();
  const t = useTranslations('dashboard.notes');
  const { user, setUser } = useAuth();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await notesApi.list();
      setNotes(res.data);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Subscribe to real-time note events
  useEffect(() => {
    if (!user) return;

    const handleNoteCreated = (data: { note: Note }) => {
      setNotes((prev) => {
        // Avoid duplicates
        if (prev.some((n) => n.id === data.note.id)) return prev;
        return [data.note, ...prev];
      });
    };

    const handleNoteUpdated = (data: { note: Note }) => {
      setNotes((prev) =>
        prev.map((n) => (n.id === data.note.id ? { ...data.note } : n))
      );
    };

    const handleNoteDeleted = (data: { note_id: number }) => {
      setNotes((prev) => prev.filter((n) => n.id !== data.note_id));
    };

    const handleNoteSharedUpdated = (data: { note: Note }) => {
      setNotes((prev) =>
        prev.map((n) => (n.id === data.note.id ? { ...data.note } : n))
      );
    };

    websocket.on('note.created', handleNoteCreated);
    websocket.on('note.updated', handleNoteUpdated);
    websocket.on('note.deleted', handleNoteDeleted);
    websocket.on('note.shared_updated', handleNoteSharedUpdated);

    return () => {
      websocket.off('note.created', handleNoteCreated);
      websocket.off('note.updated', handleNoteUpdated);
      websocket.off('note.deleted', handleNoteDeleted);
      websocket.off('note.shared_updated', handleNoteSharedUpdated);
    };
  }, [user]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      if (event.active.data.current?.type === 'note') {
        setIsDraggingNote(true);
      }
    },
    []
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      
      if (isDraggingNote) {
        setIsDraggingNote(false);
      }

      // Track which folder was dropped on to prevent onClick from firing
      if (over && (over.id === 'folder-locked' || over.id === 'folder-all' || over.id === 'folder-shared')) {
        const droppedFolderId = over.id as string;
        justDroppedOnRef.current = droppedFolderId;
        setJustDroppedOnId(droppedFolderId);
        // Clear the flag after a longer delay to ensure click events are blocked
        setTimeout(() => {
          justDroppedOnRef.current = null;
          setJustDroppedOnId(null);
        }, 500);
      } else {
        // Clear immediately if not dropped on a folder
        justDroppedOnRef.current = null;
        setJustDroppedOnId(null);
      }

      if (!over || !active.data.current) return;
      if (active.data.current.type !== 'note') return;

      const noteId = active.data.current.noteId as number;
      const note = notes.find((n) => n.id === noteId);
      if (!note || !user) return;

      if (over.id === 'folder-locked') {
        // Only owners can move notes, and shared notes cannot be locked
        const isOwner = note.user_id === user.id;
        const hasOtherMembers = note.members?.some((m) => m.user_id !== user.id) ?? false;
        if (!isOwner || note.locked) return;
        if (hasOtherMembers) {
          // Show toast notification
          const toastId = `toast-${Date.now()}`;
          setToasts((prev) => [
            ...prev,
            {
              id: toastId,
              message: t('sharedNoteCannotLock'),
              type: 'warning',
              duration: 4000,
            },
          ]);
          return;
        }
        try {
          await notesApi.update(noteId, { locked: true });
          await loadNotes();
        } catch (error) {
          console.error('Failed to move note to locked folder:', error);
        }
      } else if (over.id === 'folder-all') {
        if (note.user_id !== user.id || !note.locked) return;
        try {
          await notesApi.update(noteId, { locked: false });
          await loadNotes();
        } catch (error) {
          console.error('Failed to move note out of locked folder:', error);
        }
      }
    },
    [notes, user, loadNotes, isDraggingNote]
  );

  const handleDragCancel = useCallback((event: DragCancelEvent) => {
    if (isDraggingNote) {
      setIsDraggingNote(false);
    }
  }, [isDraggingNote]);

  async function handleNewNote() {
    try {
      setCreating(true);
      const res = await notesApi.create();
      // Use share token for URL; ?edit=1 opens the note in edit mode with first block ready
      if (res.data.share_token) {
        router.push(`/notes/${res.data.share_token}?edit=1`);
      } else {
        router.push(`/notes/${res.data.id}?edit=1`);
      }
    } catch (error) {
      console.error('Failed to create note:', error);
    } finally {
      setCreating(false);
    }
  }

  const filteredNotes = useMemo(() => {
    if (!user) return notes;
    if (activeTab === 'locked') {
      // Only show locked notes if folder is unlocked
      if (!isLockedFolderUnlocked()) {
        return [];
      }
      return notes.filter((note) => note.locked && note.user_id === user.id);
    }
    if (activeTab === 'shared') {
      return notes.filter(
        (note) => note.user_id !== user.id && note.members?.some((m) => m.user_id === user.id)
      );
    }
    // My notes: owned by current user and not locked
    return notes.filter((note) => note.user_id === user.id && !note.locked);
  }, [notes, activeTab, user]);

  const handleTabChange = (tab: NotesTab) => {
    // Ignore tab clicks while dragging a note so dropping on a folder
    // doesn't automatically switch views.
    if (isDraggingNote) return;
    if (tab === 'locked' && !isLockedFolderUnlocked()) {
      // First time: set passcode; already set: enter passcode to unlock
      setLockedFolderModal(user?.locked_folder_has_passcode ? 'unlock' : 'set');
      // Don't change tab until folder is unlocked
      return;
    }
    setActiveTab(tab);
  };

  return (
    <div className="h-full">
      <div className="border-b border-border bg-background px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
          </div>
          <button
            type="button"
            onClick={handleNewNote}
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {creating ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {t('newNote')}
          </button>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          {/* Folder-style tabs for My notes / Locked / Shared */}
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <FolderTab
              id="folder-all"
              tab="all"
              label={t('myNotes') ?? 'My notes'}
              icon={<Folder className="h-4 w-4" />}
              active={activeTab === 'all'}
              onClick={handleTabChange}
              justDroppedOnId={justDroppedOnId}
              justDroppedOnRef={justDroppedOnRef}
            />
            <FolderTab
              id="folder-shared"
              tab="shared"
              label={t('sharedFolder')}
              icon={<Users className="h-4 w-4" />}
              active={activeTab === 'shared'}
              onClick={handleTabChange}
              justDroppedOnId={justDroppedOnId}
              justDroppedOnRef={justDroppedOnRef}
            />
            <FolderTab
              id="folder-locked"
              tab="locked"
              label={t('lockedFolder')}
              icon={<FolderLock className="h-4 w-4" />}
              active={activeTab === 'locked'}
              onClick={handleTabChange}
              justDroppedOnId={justDroppedOnId}
              justDroppedOnRef={justDroppedOnRef}
            />
          </div>

          {loading && notes.length === 0 ? (
            <NotesContentSkeleton />
          ) : filteredNotes.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                {activeTab === 'locked'
                  ? t('lockedFolderDescription')
                  : activeTab === 'shared'
                  ? t('sharedFolderDescription')
                  : t('empty')}
              </p>
              <button
                type="button"
                onClick={handleNewNote}
                disabled={creating}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                {t('newNote')}
              </button>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredNotes.map((note) => {
                // Always use share_token if available, otherwise fallback to ID (which will redirect)
                const noteUrl = note.share_token ? `/notes/${note.share_token}` : `/notes/${note.id}`;
                const excerpt = getNoteExcerpt(note);
                return (
                  <DraggableNote key={note.id} note={note}>
                    <Link
                      href={noteUrl}
                      className="block rounded-xl border border-border bg-card p-4 pl-10 transition-colors hover:border-primary/50 hover:bg-card/80"
                      draggable={false}
                      onDragStart={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onPointerDown={(e) => {
                        // Prevent Link interaction if starting drag from handle
                        const target = e.target as HTMLElement;
                        if (target.closest('[data-drag-handle]')) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      onClick={(e) => {
                        // Prevent navigation if clicking on the drag handle area
                        const target = e.target as HTMLElement;
                        if (target.closest('[data-drag-handle]')) {
                          e.preventDefault();
                          e.stopPropagation();
                          return false;
                        }
                      }}
                    >
                      <h2 className="font-bold text-foreground truncate">{note.title || t('untitled')}</h2>
                      {excerpt && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {excerpt}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {note.members && note.members.length > 1
                          ? t('sharedWith', { count: note.members.length - 1 })
                          : t('updated', { date: new Date(note.updated_at).toLocaleDateString() })}
                      </p>
                    </Link>
                  </DraggableNote>
                );
              })}
            </ul>
          )}
        </DndContext>
      </div>

      <UnlockFolderModal
        open={lockedFolderModal === 'unlock'}
        onClose={() => setLockedFolderModal(null)}
        onSuccess={() => {
          setLockedFolderModal(null);
          setActiveTab('locked');
        }}
      />

      <LockFolderModal
        open={lockedFolderModal === 'set'}
        onClose={() => {
          setLockedFolderModal(null);
          setActiveTab('locked');
        }}
        onSuccess={async () => {
          const res = await authApi.user();
          setUser(res.user);
        }}
      />

      <ToastContainer
        toasts={toasts}
        onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
