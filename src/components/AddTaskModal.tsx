'use client';

import { ChevronDown, Flag, MoreHorizontal, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { projects as projectsApi, tasks as tasksApi, type Project } from '@/lib/api';
import DatePickerPopover from '@/components/DatePickerPopover';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';

interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
  defaultProjectId?: number;
  onTaskAdded?: (task?: import('@/lib/api').Task) => void;
}

export default function AddTaskModal({
  open,
  onClose,
  defaultProjectId,
  onTaskAdded,
}: AddTaskModalProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<number>(4);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null | undefined>(defaultProjectId ?? null);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const tCommon = useTranslations('dashboard.common');
  const { user } = useAuth();
  const mode = user?.mode ?? 'advanced';

  const priorityLabels: Record<number, string> = {
    1: 'Priority 1',
    2: 'Priority 2',
    3: 'Priority 3',
    4: 'Priority 4',
  };

  useEffect(() => {
    if (open) {
      setMounted(true);
      loadProjects();
      // Reset form - default to no project (null) for quick add to inbox
      setTaskName('');
      setDescription('');
      setDueDate('');
      setPriority(4);
      setSelectedProjectId(mode === 'basic' ? null : defaultProjectId ?? null);
    }
  }, [open, defaultProjectId, mode]);

  useEffect(() => {
    if (!open && !mounted) return;

    if (open) {
      // Next tick so transitions apply
      const t = window.setTimeout(() => setVisible(true), 10);
      return () => window.clearTimeout(t);
    }

    // Closing animation then unmount
    setVisible(false);
    const t = window.setTimeout(() => setMounted(false), 180);
    return () => window.clearTimeout(t);
  }, [open, mounted]);

  async function loadProjects() {
    try {
      const res = await projectsApi.list();
      setProjects(res.data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!taskName.trim()) return;

    setLoading(true);
    try {
      const res = await tasksApi.create(
        selectedProjectId ?? null,
        taskName.trim(),
        dueDate || undefined,
        priority,
        undefined,
        description.trim() || null
      );
      onTaskAdded?.(res.data);
      onClose();
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }

  const selectedProject = selectedProjectId ? projects.find((p) => p.id === selectedProjectId) : null;

  if (!mounted) return null;

  return (
    <>
      {/* Overlay - click to close, not focusable so focus stays in dialog */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 ease-out ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        onKeyDown={handleKeyDown}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ease-out ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        role="presentation"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-task-title"
          className={`flex max-h-[min(90vh,calc(100dvh-8rem))] w-full max-w-lg flex-col rounded-xl border border-border bg-background shadow-lg transition-transform duration-200 ease-out ${
            visible ? 'translate-y-0 scale-100' : 'translate-y-2 scale-[0.98]'
          }`}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
            <h2 id="add-task-title" className="text-base font-semibold text-foreground">{tCommon('addTask')}</h2>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
            {/* Task Name */}
            <div>
              <label htmlFor="add-task-name" className="sr-only">
                Task name
              </label>
              <input
                id="add-task-name"
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Task name"
                autoFocus
                required
                aria-required="true"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="add-task-description" className="sr-only">Description</label>
              <textarea
                id="add-task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add description..."
                rows={3}
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
                aria-label="Description"
              />
            </div>

            {/* Options Row */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Date */}
              <DatePickerPopover
                value={dueDate}
                onChange={setDueDate}
                placeholder="Date"
                compact
              />

              {/* Priority */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                  className="cursor-pointer flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
                  aria-expanded={showPriorityDropdown}
                  aria-haspopup="listbox"
                  aria-label={`Priority: ${priorityLabels[priority]}`}
                >
                  <Flag
                    className={`h-3.5 w-3.5 shrink-0 ${
                      priority === 1
                        ? 'text-red-500'
                        : priority === 2
                          ? 'text-orange-500'
                          : priority === 3
                            ? 'text-amber-400'
                            : 'text-muted-foreground'
                    }`}
                  />
                  <span>{priorityLabels[priority]}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                </button>
                {showPriorityDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowPriorityDropdown(false)}
                    />
                    <div className="absolute left-0 top-full z-20 mt-1 w-36 rounded-lg border border-border bg-popover shadow-lg">
                      <div className="p-1">
                        {[1, 2, 3, 4].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setPriority(p);
                              setShowPriorityDropdown(false);
                            }}
                            className={`cursor-pointer w-full rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
                              priority === p
                                ? 'bg-accent text-accent-foreground'
                                : 'text-popover-foreground hover:bg-muted'
                            }`}
                          >
                            {priorityLabels[p]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Project selector (Advanced mode only) */}
              {mode !== 'basic' && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                    className="cursor-pointer flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
                    aria-expanded={showProjectDropdown}
                    aria-haspopup="listbox"
                  >
                    <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                      {selectedProject ? selectedProject.name.charAt(0).toUpperCase() : '·'}
                    </span>
                    <span className="truncate max-w-[7rem]">
                      {selectedProject ? selectedProject.name : 'No project'}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  {showProjectDropdown && (
                    <div className="absolute z-10 mt-1 w-52 rounded-lg border border-border bg-popover shadow-lg">
                      <div className="max-h-48 overflow-y-auto py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProjectId(null);
                            setShowProjectDropdown(false);
                          }}
                          className="cursor-pointer flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm text-foreground hover:bg-muted rounded-md"
                        >
                          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                            ·
                          </span>
                          <span>No project</span>
                        </button>
                        {projects.map((project) => (
                          <button
                            key={project.id}
                            type="button"
                            onClick={() => {
                              setSelectedProjectId(project.id);
                              setShowProjectDropdown(false);
                            }}
                            className="cursor-pointer flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm text-foreground hover:bg-muted rounded-md"
                          >
                            <span
                              className="inline-flex h-2 w-2 rounded-full"
                              style={{ backgroundColor: project.color || '#94a3b8' }}
                            />
                            <span className="truncate">{project.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Project (basic mode: single row; advanced has it in options above) */}
            {mode === 'basic' && (
              <div className="relative">
                <label id="add-task-project-label" className="sr-only">Project</label>
                <button
                  type="button"
                  onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                  className="cursor-pointer flex w-full items-center justify-between rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
                  aria-labelledby="add-task-project-label"
                  aria-expanded={showProjectDropdown}
                  aria-haspopup="listbox"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {selectedProject ? (
                      <>
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: selectedProject.color || '#94a3b8' }}
                        />
                        <span className="truncate">#{selectedProject.name}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">No project</span>
                    )}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
                {showProjectDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowProjectDropdown(false)} />
                    <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg">
                      <div className="p-1 max-h-48 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => { setSelectedProjectId(null); setShowProjectDropdown(false); }}
                          className={`cursor-pointer flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
                            selectedProjectId === null ? 'bg-accent text-accent-foreground' : 'text-popover-foreground hover:bg-muted'
                          }`}
                        >
                          No project
                        </button>
                        {projects.map((project) => (
                          <button
                            key={project.id}
                            type="button"
                            onClick={() => { setSelectedProjectId(project.id); setShowProjectDropdown(false); }}
                            className={`cursor-pointer flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
                              selectedProjectId === project.id ? 'bg-accent text-accent-foreground' : 'text-popover-foreground hover:bg-muted'
                            }`}
                          >
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: project.color || '#94a3b8' }} />
                            <span className="truncate">{project.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !taskName.trim()}
                className="cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? tCommon('adding') : tCommon('addTask')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
