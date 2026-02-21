'use client';

import { Calendar, ChevronDown, Flag, MoreHorizontal, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { projects as projectsApi, tasks as tasksApi, type Project } from '@/lib/api';
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
  const dateInputRef = useRef<HTMLInputElement>(null);
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
      if (mode !== 'basic') {
        loadProjects();
      }
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
        priority
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
          <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
            <h2 id="add-task-title" className="text-lg font-semibold text-foreground">{tCommon('addTask')}</h2>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto p-6 space-y-4">
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
                className="w-full border-0 bg-transparent text-lg font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="add-task-description" className="sr-only">Description</label>
              <textarea
                id="add-task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                rows={3}
                className="w-full resize-none border-0 bg-transparent text-sm text-muted-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
                aria-label="Description"
              />
            </div>

            {/* Options Row */}
            <div className="flex items-center gap-2">
              {/* Date */}
              <div className="relative">
                <input
                  ref={dateInputRef}
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="absolute opacity-0 pointer-events-none"
                  aria-hidden="true"
                />
                <button
                  type="button"
                  onClick={() => {
                    dateInputRef.current?.showPicker?.() || dateInputRef.current?.click();
                  }}
                  className="cursor-pointer flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label={dueDate ? `Due date: ${new Date(dueDate).toLocaleDateString()}` : 'Choose due date'}
                >
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  <span>{dueDate ? new Date(dueDate).toLocaleDateString() : 'Date'}</span>
                </button>
              </div>

              {/* Priority */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                  className="cursor-pointer flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-expanded={showPriorityDropdown}
                  aria-haspopup="listbox"
                  aria-label={`Priority: ${priorityLabels[priority]}`}
                >
                  <Flag
                    className={`h-4 w-4 ${
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
                  <ChevronDown className="h-4 w-4" />
                </button>
                {showPriorityDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowPriorityDropdown(false)}
                    />
                    <div className="absolute left-0 top-full z-20 mt-1 w-40 rounded-lg border border-border bg-popover shadow-lg">
                      <div className="p-1">
                        {[1, 2, 3, 4].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setPriority(p);
                              setShowPriorityDropdown(false);
                            }}
                            className={`cursor-pointer w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
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
                    className="cursor-pointer flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-expanded={showProjectDropdown}
                    aria-haspopup="listbox"
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                      {selectedProject ? selectedProject.name.charAt(0).toUpperCase() : '·'}
                    </span>
                    <span className="truncate max-w-[8rem]">
                      {selectedProject ? selectedProject.name : 'No project'}
                    </span>
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                  {showProjectDropdown && (
                    <div className="absolute z-10 mt-1 w-56 rounded-lg border border-border bg-popover shadow-lg">
                      <div className="max-h-60 overflow-y-auto py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProjectId(null);
                            setShowProjectDropdown(false);
                          }}
                          className="cursor-pointer flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                        >
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
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
                            className="cursor-pointer flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
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

              {/* Reminders (placeholder) */}
              <button
                type="button"
                className="cursor-pointer flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors opacity-50 cursor-not-allowed"
                disabled
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Reminders</span>
              </button>

              {/* More options (placeholder) */}
              <button
                type="button"
                className="cursor-pointer rounded-lg border border-border bg-background p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors opacity-50 cursor-not-allowed"
                disabled
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>

            {/* Project Selector */}
            <div className="relative">
              <label id="add-task-project-label" className="sr-only">Project</label>
              <button
                type="button"
                onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                className="cursor-pointer flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-labelledby="add-task-project-label"
                aria-expanded={showProjectDropdown}
                aria-haspopup="listbox"
              >
                <div className="flex items-center gap-2">
                  {selectedProject ? (
                    <>
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: selectedProject.color || '#94a3b8',
                        }}
                      />
                      <span>#{selectedProject.name}</span>
                    </>
                  ) : (
                    <span>No project</span>
                  )}
                </div>
                <ChevronDown className="h-4 w-4" />
              </button>
              {showProjectDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowProjectDropdown(false)}
                  />
                  <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg">
                    <div className="p-1 max-h-60 overflow-y-auto">
                      {/* No project option */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProjectId(null);
                          setShowProjectDropdown(false);
                        }}
                        className={`cursor-pointer flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                          selectedProjectId === null
                            ? 'bg-accent text-accent-foreground'
                            : 'text-popover-foreground hover:bg-muted'
                        }`}
                      >
                        <span className="truncate">No project</span>
                      </button>
                      {projects.map((project) => (
                        <button
                          key={project.id}
                          type="button"
                          onClick={() => {
                            setSelectedProjectId(project.id);
                            setShowProjectDropdown(false);
                          }}
                          className={`cursor-pointer flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                            selectedProjectId === project.id
                              ? 'bg-accent text-accent-foreground'
                              : 'text-popover-foreground hover:bg-muted'
                          }`}
                        >
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{
                              backgroundColor: project.color || '#94a3b8',
                            }}
                          />
                          <span className="truncate">{project.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !taskName.trim()}
                className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
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
