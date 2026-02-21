'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface NoteAccessRequestProps {
  noteId: number;
  ownerEmail?: string;
  ownerName?: string;
}

export default function NoteAccessRequest({ noteId, ownerEmail, ownerName }: NoteAccessRequestProps) {
  const { user } = useAuth();
  const t = useTranslations('dashboard.notes');

  const handleRequestAccess = () => {
    if (!user?.email || !ownerEmail) return;
    
    const subject = encodeURIComponent(`Access Request for Note #${noteId}`);
    const body = encodeURIComponent(
      `Hi${ownerName ? ` ${ownerName}` : ''},\n\n` +
      `I would like to request access to view this note.\n\n` +
      `My email: ${user.email}\n` +
      `Note ID: ${noteId}\n\n` +
      `Please add me as a member with view or edit permissions.\n\n` +
      `Thank you!`
    );
    
    window.location.href = `mailto:${ownerEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-lg">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-muted p-4">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">
              {t('accessDenied')}
            </h1>
            <p className="text-muted-foreground">
              {t('accessDeniedMessage')}
            </p>
          </div>

          {user?.email && (
            <div className="w-full space-y-4 rounded-lg border border-border bg-background p-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-medium text-foreground">{t('yourEmail')}</p>
                  <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              {ownerEmail && (
                <div className="border-t border-border pt-4">
                  <p className="mb-3 text-sm text-muted-foreground">
                    {t('requestAccessMessage')}
                  </p>
                  <button
                    onClick={handleRequestAccess}
                    className="w-full cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {t('requestAccess')}
                  </button>
                </div>
              )}
            </div>
          )}

          <Link
            href="/notes"
            className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backToNotes')}
          </Link>
        </div>
      </div>
    </div>
  );
}
