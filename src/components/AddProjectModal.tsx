'use client';

import { Calendar, ChevronDown, LayoutGrid, List, X } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { projects as projectsApi, userPreferences } from '@/lib/api';
import type { ViewMode } from '@/hooks/useViewPreference';
import { useTranslations } from 'next-intl';

const NAME_MAX_LENGTH = 120;

const COLOR_PRESETS: { name: string; hex: string }[] = [
  { name: 'Charcoal', hex: '#64748b' },
  { name: 'Red', hex: '#ef4444' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Pink', hex: '#ec4899' },
];

const EMOJI_OPTIONS = ['', '📁', '💼', '🎯', '📌', '⭐', '🚀', '✅', '📝', '🔖'];

interface AddProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onNavigateToProject?: (projectId: number) => void;
}

export default function AddProjectModal({
  open,
  onClose,
  onSuccess,
  onNavigateToProject,
}: AddProjectModalProps) {
  const tView = useTranslations('dashboard.viewSwitcher');
  const tCommon = useTranslations('dashboard.common');
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PRESETS[0].hex);
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const [priority, setPriority] = useState<number>(4);
  const [icon, setIcon] = useState('');
  const [layout, setLayout] = useState<ViewMode>('list');
  const [adding, setAdding] = useState(false);

  if (!open) return null;

  function resetForm() {
    setName('');
    setColor(COLOR_PRESETS[0].hex);
    setPriority(4);
    setIcon('');
    setLayout('list');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    try {
      const res = await projectsApi.create(
        name.trim().slice(0, NAME_MAX_LENGTH),
        color,
        priority,
        icon.trim() || undefined
      );
      try {
        await userPreferences.set(`view_mode:project:${res.data.id}`, layout);
      } catch {
        // ignore preference failure
      }
      resetForm();
      onClose();
      onSuccess();
      onNavigateToProject?.(res.data.id);
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setAdding(false);
    }
  }

  const selectedColorPreset = COLOR_PRESETS.find((p) => p.hex === color) ?? COLOR_PRESETS[0];

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      aria-hidden="true"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-project-title"
        className="flex max-h-[min(90vh,calc(100dvh-8rem))] w-full max-w-md flex-col rounded-xl border border-border bg-background shadow-lg"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <h2 id="add-project-title" className="text-lg font-semibold text-foreground">Add project</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="add-project-name" className="block text-sm font-medium text-foreground">Name</label>
              <span className="text-xs text-muted-foreground" aria-live="polite">
                {name.length}/{NAME_MAX_LENGTH}
              </span>
            </div>
            <input
              id="add-project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, NAME_MAX_LENGTH))}
              maxLength={NAME_MAX_LENGTH}
              placeholder="Project name"
              required
              aria-required="true"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="relative">
            <label id="add-project-color-label" className="block text-sm font-medium text-foreground mb-1">Color</label>
            <button
              type="button"
              onClick={() => setColorDropdownOpen(!colorDropdownOpen)}
              className="cursor-pointer flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-labelledby="add-project-color-label"
              aria-expanded={colorDropdownOpen}
              aria-haspopup="listbox"
            >
              <span
                className="h-4 w-4 rounded-full shrink-0 border border-border"
                style={{ backgroundColor: selectedColorPreset.hex }}
              />
              <span className="flex-1 text-left">{selectedColorPreset.name}</span>
              <ChevronDown className="h-4 w-4" />
            </button>
            {colorDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setColorDropdownOpen(false)}
                />
                <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg p-1 max-h-48 overflow-y-auto">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => {
                        setColor(preset.hex);
                        setColorDropdownOpen(false);
                      }}
                      className="cursor-pointer flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-popover-foreground hover:bg-muted transition-colors"
                    >
                      <span
                        className="h-4 w-4 rounded-full border border-border shrink-0"
                        style={{ backgroundColor: preset.hex }}
                      />
                      {preset.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div>
            <label htmlFor="add-project-priority" className="block text-sm font-medium text-foreground mb-1">Priority</label>
            <select
              id="add-project-priority"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value) || 4)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-required="true"
            >
              <option value={1}>P1</option>
              <option value={2}>P2</option>
              <option value={3}>P3</option>
              <option value={4}>P4</option>
            </select>
          </div>

          <div role="group" aria-labelledby="add-project-emoji-label">
            <span id="add-project-emoji-label" className="block text-sm font-medium text-foreground mb-1">Emoji</span>
            <div className="flex flex-wrap gap-2" role="listbox" aria-label="Choose emoji">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji || 'none'}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  role="option"
                  aria-selected={icon === emoji}
                  className={`cursor-pointer flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    icon === emoji
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background hover:bg-muted text-foreground'
                  }`}
                >
                  {emoji || '—'}
                </button>
              ))}
            </div>
          </div>

          <div role="group" aria-labelledby="add-project-layout-label">
            <span id="add-project-layout-label" className="block text-sm font-medium text-foreground mb-2">Layout</span>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1" role="group">
              <button
                type="button"
                onClick={() => setLayout('list')}
                className={`cursor-pointer flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  layout === 'list'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <List className="h-4 w-4" />
                {tView('list')}
              </button>
              <button
                type="button"
                onClick={() => setLayout('kanban')}
                className={`cursor-pointer flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  layout === 'kanban'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                {tView('kanban')}
              </button>
              <button
                type="button"
                onClick={() => setLayout('calendar')}
                className={`cursor-pointer flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  layout === 'calendar'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Calendar className="h-4 w-4" />
                {tView('calendar')}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              {tCommon('deleteAccountCancel')}
            </button>
            <button
              type="submit"
              disabled={adding || !name.trim()}
              className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {adding ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
