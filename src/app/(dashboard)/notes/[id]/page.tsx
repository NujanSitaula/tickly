'use client';

import NoteAccessRequest from '@/components/NoteAccessRequest';
import NoteEditor, { type NoteEditorHandle } from '@/components/NoteEditor';
import ShareNoteModal from '@/components/ShareNoteModal';
import NoteView from '@/components/NoteView';
import { useAuth } from '@/contexts/AuthContext';
import { notes as notesApi, type Note, type NoteContent } from '@/lib/api';
import { websocket } from '@/lib/websocket';
import { useNoteYjs } from '@/hooks/useNoteYjs';
import { Archive, ArrowLeft, CheckCircle, Eye, Flag, Loader2, Lock, MoreVertical, Pencil, Share2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function NotePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const param = typeof params.id === 'string' ? params.id : '';
  const isNumericId = /^\d+$/.test(param);
  const numericId = isNumericId ? parseInt(param, 10) : NaN;
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [ownerInfo, setOwnerInfo] = useState<{ email?: string; name?: string } | null>(null);
  const [editorViewers, setEditorViewers] = useState<Array<{ userId: number; userName: string; avatarUrl?: string | null }>>([]);
  const [contentSaving, setContentSaving] = useState(false);
  const titleInputFocusedRef = useRef(false);
  const noteEditorRef = useRef<NoteEditorHandle>(null);
  const titleSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleLatestRef = useRef(title);
  const menuRef = useRef<HTMLDivElement>(null);

  const TITLE_SYNC_DEBOUNCE_MS = 400;
  titleLatestRef.current = title;
  const t = useTranslations('dashboard.notes');

  useEffect(() => {
    if (!isEditing) setContentSaving(false);
  }, [isEditing]);

  // Shared Yjs source per noteId: one Y.Doc for both view and edit; fetch once, apply only when doc empty
  const yjs = useNoteYjs({
    noteId: note?.id ?? 0,
    initialTitle: note?.title ?? '',
    user: user ?? null,
    enabled: !!note && note.id > 0,
  });
  const otherViewers = isEditing ? editorViewers : yjs.otherViewers;

  // Avoid showing duplicated title from Yjs merge (view mode only displays; we don't write)
  const displayTitle = (() => {
    const raw = (yjs.title && yjs.title.trim()) ? yjs.title : (note?.title ?? '');
    if (raw.length >= 2 && raw.length % 2 === 0) {
      const half = raw.length / 2;
      if (raw.slice(0, half) === raw.slice(half)) return raw.slice(0, half);
    }
    return raw;
  })();

  const canEdit =
    note &&
    user &&
    (note.user_id === user.id ||
      note.members?.some((m) => m.user_id === user?.id && (m.role === 'edit' || m.role === 'owner')));
  const canManageMembers = note && user && note.user_id === user.id;

  const loadNote = useCallback(async () => {
    if (!param) return;
    
    try {
      setLoading(true);
      setAccessDenied(false);
      setOwnerInfo(null);
      
      let res;
      if (isNumericId) {
        // If numeric ID, load note and redirect to token URL
        res = await notesApi.get(numericId);
        // Ensure note has a share token
        if (!res.data.share_token) {
          // If no token, try to get one
          try {
            const tokenRes = await notesApi.share.getToken(numericId);
            res.data.share_token = tokenRes.data.token;
          } catch (tokenError) {
            console.error('Failed to get share token:', tokenError);
          }
        }
        if (res.data.share_token && res.data.share_token !== param) {
          // Redirect to token URL
          router.replace(`/notes/${res.data.share_token}`);
          return;
        }
      } else {
        // If token, load by token
        res = await notesApi.share.getByToken(param);
      }
      
      setNote(res.data);
      setTitle(res.data.title);
    } catch (error: unknown) {
      console.error('Failed to load note:', error);
      const err = error as Error & { status?: number; data?: { owner?: { email?: string; name?: string }; note_id?: number } };
      if (err.status === 403) {
        setAccessDenied(true);
        setOwnerInfo(err.data?.owner || null);
      } else if (err.status === 404) {
        setNote(null);
      } else {
        setNote(null);
      }
    } finally {
      setLoading(false);
    }
  }, [param, isNumericId, numericId, router]);

  useEffect(() => {
    loadNote();
  }, [loadNote]);

  // Subscribe to real-time note events
  useEffect(() => {
    if (!note || !user) return;

    const handleNoteUpdated = (data: { note: Note }) => {
      // Only update if it's the current note
      if (data.note.id === note.id) {
        // Live-update title when viewing (in edit mode title is synced via Yjs)
        if (!isEditing && data.note.title !== undefined) {
          setTitle(data.note.title);
        }
        setNote((prev) => {
          if (!prev) return null;
          if (!isEditing) {
            return { ...data.note };
          }
          return {
            ...prev,
            ...data.note,
            title: prev.title !== title ? prev.title : data.note.title,
          };
        });
      }
    };

    const handleNoteDeleted = (data: { note_id: number }) => {
      if (data.note_id === note.id) {
        router.push('/notes');
      }
    };

    const handleNoteSharedUpdated = (data: { note: Note }) => {
      if (data.note.id === note.id) {
        setNote((prev) => (prev ? { ...prev, members: data.note.members } : null));
      }
    };

    websocket.on('note.updated', handleNoteUpdated);
    websocket.on('note.deleted', handleNoteDeleted);
    websocket.on('note.shared_updated', handleNoteSharedUpdated);

    return () => {
      websocket.off('note.updated', handleNoteUpdated);
      websocket.off('note.deleted', handleNoteDeleted);
      websocket.off('note.shared_updated', handleNoteSharedUpdated);
    };
  }, [note, user, isEditing, title, router]);

  const handleSaveContent = useCallback(
    async (content: NoteContent) => {
      if (!note) return;
      try {
        await notesApi.update(note.id, { content });
        setNote((prev) => (prev ? { ...prev, content } : null));
      } catch (error) {
        console.error('Failed to save note:', error);
      }
    },
    [note]
  );

  const handleTitleBlur = useCallback(async () => {
    if (!note || title === note.title || !canEdit) return;
    try {
      setSavingTitle(true);
      await notesApi.update(note.id, { title });
      setNote((prev) => (prev ? { ...prev, title } : null));
    } catch (error) {
      console.error('Failed to save title:', error);
    } finally {
      setSavingTitle(false);
    }
  }, [note, title, canEdit]);

  const handleUploadImage = useCallback(async (noteId: number, file: File): Promise<string> => {
    const res = await notesApi.upload(noteId, file);
    return res.url;
  }, []);

  const handleViewNote = useCallback(() => {
    setIsEditing(false);
    loadNote();
  }, [loadNote]);

  const handleDeleteNote = useCallback(async () => {
    if (!note || deleteConfirmTitle !== note.title) return;
    try {
      await notesApi.delete(note.id);
      router.push('/notes');
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  }, [note, deleteConfirmTitle, router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  if (accessDenied) {
    return (
      <NoteAccessRequest
        noteId={Number.isNaN(numericId) ? 0 : numericId}
        ownerEmail={ownerInfo?.email}
        ownerName={ownerInfo?.name}
      />
    );
  }


  if (loading || !note) {
    return (
      <div className="flex h-full items-center justify-center">
        {loading ? (
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">{t('loading')}</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-muted-foreground">{t('notFound')}</p>
            <Link href="/notes" className="mt-2 inline-block text-primary hover:underline">
              {t('backToNotes')}
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <div className="shrink-0 border-b border-border bg-background px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Link
                href="/notes"
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={t('backToNotes')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              {isEditing && canEdit ? (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTitle(v);
                    titleLatestRef.current = v;
                    if (titleSyncTimeoutRef.current) clearTimeout(titleSyncTimeoutRef.current);
                    titleSyncTimeoutRef.current = setTimeout(() => {
                      noteEditorRef.current?.setYjsTitle(titleLatestRef.current);
                      titleSyncTimeoutRef.current = null;
                    }, TITLE_SYNC_DEBOUNCE_MS);
                  }}
                  onFocus={() => { titleInputFocusedRef.current = true; }}
                  onBlur={() => {
                    titleInputFocusedRef.current = false;
                    if (titleSyncTimeoutRef.current) {
                      clearTimeout(titleSyncTimeoutRef.current);
                      titleSyncTimeoutRef.current = null;
                    }
                    noteEditorRef.current?.setYjsTitle(title);
                    void handleTitleBlur();
                  }}
                  className="min-w-0 flex-1 border-0 bg-transparent text-xl font-semibold text-foreground focus:outline-none focus:ring-0"
                  placeholder={t('untitled')}
                />
              ) : (
                <h1 className="min-w-0 truncate text-xl font-semibold text-foreground">
                  {displayTitle || t('untitled')}
                </h1>
              )}
              {isEditing && canEdit && (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center" aria-hidden>
                  {contentSaving ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Saving content" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-500" aria-label="Content saved" />
                  )}
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {otherViewers.length > 0 && (
                <div className="flex -space-x-2">
                  {otherViewers.map((viewer, index) => (
                    <div
                      key={viewer.userId}
                      className="group relative h-8 w-8 shrink-0 overflow-hidden rounded-full border-2 border-background bg-muted ring-1 ring-border animate-avatar-pop"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {viewer.avatarUrl ? (
                        <img
                          src={viewer.avatarUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">
                          {(viewer.userName || '?').slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <span className="absolute bottom-full left-1/2 z-20 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity pointer-events-none group-hover:opacity-100">
                        {viewer.userName}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {otherViewers.length > 0 && <span className="h-5 w-px bg-border" aria-hidden />}
              {canManageMembers && !note.locked && (
                <button
                  type="button"
                  onClick={() => setShareModalOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Share2 className="h-4 w-4" />
                  {t('manageMembers')}
                </button>
              )}
              {canEdit && (
                isEditing ? (
                  <button
                    type="button"
                    onClick={handleViewNote}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Eye className="h-4 w-4" />
                    {t('viewNote')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setTitle(note?.title ?? ''); setIsEditing(true); }}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Pencil className="h-4 w-4" />
                    {t('editNote')}
                  </button>
                )
              )}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    menuOpen ? 'bg-muted text-foreground' : ''
                  }`}
                  aria-label="More options"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-border bg-muted/95 backdrop-blur-sm shadow-lg ring-1 ring-border">
                    <div className="py-1">
                      {canEdit && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpen(false);
                              // TODO: Implement archive
                            }}
                            className="flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted/80 transition-colors"
                          >
                            <Archive className="h-4 w-4" />
                            Archive
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          // TODO: Implement report
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted/80 transition-colors"
                      >
                        <Flag className="h-4 w-4" />
                        Report
                      </button>
                      {canManageMembers && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            setDeleteConfirmOpen(true);
                          }}
                          className="flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-sm text-destructive hover:bg-muted/80 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete note
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
      </div>

      <div className="mx-auto max-w-3xl w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {isEditing ? (
          <NoteEditor
            ref={noteEditorRef}
            noteId={note.id}
            yDoc={yjs.yDoc}
            provider={yjs.provider}
            stateLoaded={yjs.stateLoaded}
            yjsStateNotFound={yjs.yjsStateNotFound}
            initialContent={note.content ?? null}
            initialTitle={note.title ?? ''}
            onSave={handleSaveContent}
            onTitleChange={setTitle}
            readOnly={!canEdit}
            onUploadImage={canEdit ? handleUploadImage : undefined}
            onPresenceChange={setEditorViewers}
            onContentSavingChange={setContentSaving}
            isTitleInputFocused={() => titleInputFocusedRef.current}
            getCurrentTitle={() => title}
          />
        ) : yjs.loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <NoteView
            content={yjs.content}
            emptyMessage={t('noContent')}
            onContentChange={canEdit ? handleSaveContent : undefined}
            editingBlocks={yjs.editingBlocks}
          />
        )}
      </div>
      {note && (
        <div className="border-t border-border">
          <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground/70">
              <div className="flex items-center gap-1.5">
                <span>{t('created')}:</span>
                <span>
                  {new Date(note.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              {note.created_at !== note.updated_at && (
                <div className="flex items-center gap-1.5">
                  <span>{t('lastUpdated')}:</span>
                  <span>
                    {new Date(note.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ShareNoteModal
        noteId={note.id}
        noteTitle={note.title}
        shareToken={note.share_token}
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        currentUserId={user?.id ?? 0}
        isOwner={canManageMembers ?? false}
        onMembersChange={loadNote}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground mb-2">Delete note</h2>
            <p className="text-sm text-muted-foreground mb-4">
              This action cannot be undone. To confirm, type the note title{' '}
              <span className="font-mono text-foreground">{note.title || t('untitled')}</span> below.
            </p>
            <input
              type="text"
              value={deleteConfirmTitle}
              onChange={(e) => setDeleteConfirmTitle(e.target.value)}
              placeholder={note.title || t('untitled')}
              className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setDeleteConfirmTitle('');
                }}
                className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  handleDeleteNote();
                  setDeleteConfirmTitle('');
                }}
                disabled={deleteConfirmTitle !== note.title}
                className="cursor-pointer rounded-lg bg-destructive px-4 py-2 text-sm text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
