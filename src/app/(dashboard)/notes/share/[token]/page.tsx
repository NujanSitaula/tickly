'use client';

import NoteAccessRequest from '@/components/NoteAccessRequest';
import { notes as notesApi } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function ShareTokenPage() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params.token === 'string' ? params.token : '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [noteId, setNoteId] = useState<number | null>(null);
  const [ownerInfo, setOwnerInfo] = useState<{ email?: string; name?: string } | null>(null);
  const t = useTranslations('dashboard.notes');

  useEffect(() => {
    if (!token) {
      setError('Invalid share link');
      setLoading(false);
      return;
    }

    async function loadNoteByToken() {
      try {
        setLoading(true);
        setAccessDenied(false);
        const res = await notesApi.share.getByToken(token);
        // Redirect to the token URL (same token, but using the main route)
        router.replace(`/notes/${token}`);
      } catch (err: unknown) {
        console.error('Failed to load note by token:', err);
        const error = err as Error & { status?: number; data?: { note_id?: number; owner?: { email?: string; name?: string } } };
        if (error.status === 403) {
          setAccessDenied(true);
          setNoteId(error.data?.note_id || null);
          setOwnerInfo(error.data?.owner || null);
        } else {
          setError('Note not found or link expired');
        }
        setLoading(false);
      }
    }

    loadNoteByToken();
  }, [token, router]);

  if (accessDenied && noteId) {
    return <NoteAccessRequest noteId={noteId} ownerEmail={ownerInfo?.email} ownerName={ownerInfo?.name} />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading note...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-lg font-semibold text-foreground">{error}</p>
          <button
            onClick={() => router.push('/notes')}
            className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t('backToNotes')}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
