'use client';

import { lockedFolder } from '@/lib/api';
import { setLockedFolderUnlocked } from '@/utils/lockedFolder';
import { Lock, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

interface LockFolderModalProps {
  open: boolean;
  onClose: () => void;
}

export default function LockFolderModal({ open, onClose }: LockFolderModalProps) {
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const t = useTranslations('dashboard.notes');

  useEffect(() => {
    if (!open) {
      setPasscode('');
      setConfirmPasscode('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (passcode.length !== 6 || !/^\d{6}$/.test(passcode)) {
        setError(t('passcodeInvalid'));
        return;
      }

      if (passcode !== confirmPasscode) {
        setError(t('passcodeMismatch'));
        return;
      }

      try {
        setLoading(true);
        const res = await lockedFolder.lock(passcode);
        setLockedFolderUnlocked(res.unlock_token);
        onClose();
      } catch (err: unknown) {
        const error = err as Error & { status?: number; data?: { message?: string } };
        setError(error.data?.message || t('lockFailed'));
      } finally {
        setLoading(false);
      }
    },
    [passcode, confirmPasscode, t, onClose]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-muted p-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">{t('lockFolder')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <p className="text-sm text-muted-foreground">{t('lockedFolderPasscodeHint')}</p>

          <div>
            <label htmlFor="folder-passcode" className="mb-2 block text-sm font-medium text-foreground">
              {t('setPasscode')}
            </label>
            <input
              id="folder-passcode"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={passcode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setPasscode(val);
                setError(null);
              }}
              placeholder={t('passcodePlaceholder')}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-center text-2xl tracking-widest text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="folder-passcode-confirm" className="mb-2 block text-sm font-medium text-foreground">
              {t('confirmPasscode')}
            </label>
            <input
              id="folder-passcode-confirm"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirmPasscode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setConfirmPasscode(val);
                setError(null);
              }}
              placeholder={t('passcodePlaceholder')}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-center text-2xl tracking-widest text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 cursor-pointer rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || passcode.length !== 6 || confirmPasscode.length !== 6}
              className="flex-1 cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? '...' : t('lockFolder')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

