'use client';

import { notes as notesApi, type NoteMember } from '@/lib/api';
import { Check, Copy, Link2, Mail, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

interface ShareNoteModalProps {
  noteId: number;
  noteTitle: string;
  shareToken?: string | null;
  open: boolean;
  onClose: () => void;
  currentUserId: number;
  isOwner: boolean;
  onMembersChange?: () => void;
}

export default function ShareNoteModal({
  noteId,
  noteTitle,
  shareToken: initialShareToken,
  open,
  onClose,
  currentUserId,
  isOwner,
  onMembersChange,
}: ShareNoteModalProps) {
  const [activeTab, setActiveTab] = useState<'link' | 'email'>('link');
  const [members, setMembers] = useState<NoteMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'view' | 'edit'>('edit');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(initialShareToken || null);
  const [loadingToken, setLoadingToken] = useState(false);
  const t = useTranslations('dashboard.notes');

  const shareLink = typeof window !== 'undefined' && shareToken
    ? `${window.location.origin}/notes/${shareToken}`
    : '';

  const loadShareToken = useCallback(async () => {
    if (!open || !noteId) return;
    if (initialShareToken) {
      setShareToken(initialShareToken);
      return;
    }
    try {
      setLoadingToken(true);
      const res = await notesApi.share.getToken(noteId);
      setShareToken(res.data.token);
    } catch (error) {
      console.error('Failed to load share token:', error);
    } finally {
      setLoadingToken(false);
    }
  }, [noteId, open, initialShareToken]);

  const loadMembers = useCallback(async () => {
    if (!open || !noteId) return;
    try {
      setLoading(true);
      const res = await notesApi.members.list(noteId);
      setMembers(res.data);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  }, [noteId, open]);

  useEffect(() => {
    if (open) {
      loadShareToken();
      loadMembers();
    }
  }, [open, loadShareToken, loadMembers]);

  useEffect(() => {
    if (!open) {
      setInviteEmail('');
      setInviteError(null);
      setLinkCopied(false);
      setShareToken(null);
    }
  }, [open]);

  const handleCopyLink = useCallback(async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  }, [shareLink]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteError(null);
    try {
      setInviting(true);
      await notesApi.members.add(noteId, inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      await loadMembers();
      onMembersChange?.();
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? 'Failed to invite';
      setInviteError(message);
    } finally {
      setInviting(false);
    }
  }

  async function handleUpdateRole(memberId: number, role: 'view' | 'edit') {
    try {
      await notesApi.members.update(noteId, memberId, role);
      await loadMembers();
      onMembersChange?.();
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  }

  async function handleRemove(memberId: number) {
    try {
      await notesApi.members.remove(noteId, memberId);
      await loadMembers();
      onMembersChange?.();
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold text-foreground">{t('shareNote')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'link'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Link2 className="h-4 w-4" />
            Link
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'email'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mail className="h-4 w-4" />
            Email
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4">
          {activeTab === 'link' ? (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm text-muted-foreground">
                  Share this link with others. Anyone with the link can view this note.
                </p>
                {loadingToken ? (
                  <div className="flex items-center justify-center py-4">
                    <p className="text-sm text-muted-foreground">Generating share link...</p>
                  </div>
                ) : shareLink ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareLink}
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      disabled={!shareLink}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {linkCopied ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                    Failed to generate share link. Please try again.
                  </div>
                )}
              </div>

              {/* Members list */}
              {members.length > 0 && (
                <div className="border-t border-border pt-4">
                  <h3 className="mb-2 text-sm font-medium text-foreground">{t('members')}</h3>
                  <ul className="space-y-2">
                    {members.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{m.user?.name ?? 'Unknown'}</p>
                          <p className="truncate text-xs text-muted-foreground">{m.user?.email}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {m.role === 'owner' ? (
                            <span className="text-xs text-muted-foreground">{t('owner')}</span>
                          ) : isOwner ? (
                            <>
                              <select
                                value={m.role}
                                onChange={(e) => handleUpdateRole(m.id, e.target.value as 'view' | 'edit')}
                                className="cursor-pointer rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                              >
                                <option value="view">{t('view')}</option>
                                <option value="edit">{t('edit')}</option>
                              </select>
                              {m.user_id !== currentUserId && (
                                <button
                                  type="button"
                                  onClick={() => handleRemove(m.id)}
                                  className="cursor-pointer text-xs text-destructive hover:underline"
                                >
                                  {t('removeMember')}
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {m.role === 'edit' ? t('edit') : t('view')}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Members list */}
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <ul className="space-y-2">
                  {members.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{m.user?.name ?? 'Unknown'}</p>
                        <p className="truncate text-xs text-muted-foreground">{m.user?.email}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {m.role === 'owner' ? (
                          <span className="text-xs text-muted-foreground">{t('owner')}</span>
                        ) : isOwner ? (
                          <>
                            <select
                              value={m.role}
                              onChange={(e) => handleUpdateRole(m.id, e.target.value as 'view' | 'edit')}
                              className="cursor-pointer rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                            >
                              <option value="view">{t('view')}</option>
                              <option value="edit">{t('edit')}</option>
                            </select>
                            {m.user_id !== currentUserId && (
                              <button
                                type="button"
                                onClick={() => handleRemove(m.id)}
                                className="cursor-pointer text-xs text-destructive hover:underline"
                              >
                                {t('removeMember')}
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {m.role === 'edit' ? t('edit') : t('view')}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Email invite form */}
              {isOwner && (
                <form onSubmit={handleInvite} className="space-y-2 border-t border-border pt-4">
                  <h3 className="text-sm font-medium text-foreground">{t('inviteByEmail')}</h3>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder={t('emailPlaceholder')}
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'view' | 'edit')}
                      className="cursor-pointer rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    >
                      <option value="view">{t('roleView')}</option>
                      <option value="edit">{t('roleEdit')}</option>
                    </select>
                    <button
                      type="submit"
                      disabled={inviting || !inviteEmail.trim()}
                      className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {inviting ? '…' : t('invite')}
                    </button>
                  </div>
                  {inviteError && <p className="text-xs text-destructive">{inviteError}</p>}
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
