'use client';

import {
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Circle,
  Flag,
  Lock,
  MessageSquare,
  Paperclip,
  Plus,
  Star,
  X,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import {
  comments as commentsApi,
  projects as projectsApi,
  subtasks as subtasksApi,
  tasks as tasksApi,
  type Comment,
  type Project,
  type Subtask,
  type Task,
} from '@/lib/api';
import { useTaskStoreOptional } from '@/contexts/TaskStoreContext';
import { websocket, type WebSocketEvent } from '@/lib/websocket';
import { useAuth } from '@/contexts/AuthContext';

interface TaskDetailModalProps {
  open: boolean;
  taskId: number | null;
  onClose: () => void;
  onTaskUpdate?: () => void;
}

function normalizeDateInputValue(value: string | null | undefined): string {
  if (!value) return '';
  // Accept both "YYYY-MM-DD" and datetime strings from API; input[type=date] needs YYYY-MM-DD.
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

export default function TaskDetailModal({
  open,
  taskId,
  onClose,
  onTaskUpdate,
}: TaskDetailModalProps) {
  const { user } = useAuth();
  const taskStore = useTaskStoreOptional();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<number>(1);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);

  // Subtask state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);

  // Comment state
  const [newComment, setNewComment] = useState('');

  const priorityLabels: Record<number, string> = {
    1: 'P1',
    2: 'P2',
    3: 'P3',
    4: 'P4',
  };

  const loadTask = useCallback(async ({ withSpinner = false }: { withSpinner?: boolean } = {}) => {
    if (!taskId) return;
    if (withSpinner) {
      setLoading(true);
    }
    try {
      const res = await tasksApi.get(taskId);
      setTask(res.data);
      setTitle(res.data.title);
      setDescription(res.data.description || '');
      setDueDate(normalizeDateInputValue(res.data.due_date));
      setPriority(res.data.priority);
      setSelectedProjectId(res.data.project_id);
      setSubtasks(res.data.subtasks || []);
      setComments(res.data.comments || []);
      setDirty(false);
    } catch (error) {
      console.error('Failed to load task:', error);
    } finally {
      if (withSpinner) {
        setLoading(false);
      }
    }
  }, [taskId]);

  const loadProjects = useCallback(async () => {
    try {
      const res = await projectsApi.list();
      setProjects(res.data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }, []);

  useEffect(() => {
    if (open && taskId) {
      setMounted(true);
      loadTask({ withSpinner: true });
      loadProjects();
    }
  }, [open, taskId, loadTask, loadProjects]);

  useEffect(() => {
    if (!open && !mounted) return;

    if (open) {
      const t = window.setTimeout(() => setVisible(true), 10);
      return () => window.clearTimeout(t);
    }

    setVisible(false);
    const t = window.setTimeout(() => setMounted(false), 180);
    return () => window.clearTimeout(t);
  }, [open, mounted]);

  // Listen to WebSocket events for real-time updates when modal is open
  useEffect(() => {
    if (!open || !taskId) return;

    const handleTaskUpdated = (data: WebSocketEvent['data']) => {
      if ('task' in data && data.task.id === taskId) {
        loadTask();
      }
    };

    const handleSubtaskCreated = () => {
      loadTask();
    };

    const handleSubtaskUpdated = () => {
      loadTask();
    };

    const handleSubtaskDeleted = () => {
      loadTask();
    };

    const handleCommentCreated = () => {
      loadTask();
    };

    const handleCommentUpdated = () => {
      loadTask();
    };

    const handleCommentDeleted = () => {
      loadTask();
    };

    websocket.on('task.updated', handleTaskUpdated);
    websocket.on('subtask.created', handleSubtaskCreated);
    websocket.on('subtask.updated', handleSubtaskUpdated);
    websocket.on('subtask.deleted', handleSubtaskDeleted);
    websocket.on('comment.created', handleCommentCreated);
    websocket.on('comment.updated', handleCommentUpdated);
    websocket.on('comment.deleted', handleCommentDeleted);

    return () => {
      websocket.off('task.updated', handleTaskUpdated);
      websocket.off('subtask.created', handleSubtaskCreated);
      websocket.off('subtask.updated', handleSubtaskUpdated);
      websocket.off('subtask.deleted', handleSubtaskDeleted);
      websocket.off('comment.created', handleCommentCreated);
      websocket.off('comment.updated', handleCommentUpdated);
      websocket.off('comment.deleted', handleCommentDeleted);
    };
  }, [open, taskId, loadTask]);

  const saveTask = useCallback(async () => {
    if (!task || saving) return;
    setSaving(true);
    try {
      const res = await tasksApi.update(task.id, {
        title,
        description: description || null,
        due_date: dueDate || null,
        priority,
        project_id: selectedProjectId,
      });
      taskStore?.replaceTask(res.data);
      await loadTask();
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setSaving(false);
    }
  }, [task, saving, title, description, dueDate, priority, selectedProjectId, loadTask, taskStore]);

  // Debounced auto-save
  useEffect(() => {
    if (!task || !open || !dirty) return;
    const timeout = setTimeout(() => {
      saveTask();
    }, 500);
    return () => clearTimeout(timeout);
  }, [title, description, dueDate, priority, selectedProjectId, dirty, task, open, saveTask]);

  async function handleToggleComplete() {
    if (!task) return;
    try {
      const res = await tasksApi.update(task.id, { completed: !task.completed });
      taskStore?.replaceTask(res.data);
      await loadTask();
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  }

  async function handleAddSubtask() {
    if (!task || !newSubtaskTitle.trim()) return;
    try {
      await subtasksApi.create(task.id, newSubtaskTitle.trim());
      setNewSubtaskTitle('');
      setShowSubtaskInput(false);
      await loadTask();
    } catch (error) {
      console.error('Failed to add subtask:', error);
    }
  }

  async function handleToggleSubtask(subtask: Subtask) {
    if (!task) return;
    try {
      await subtasksApi.update(subtask.id, { completed: !subtask.completed });
      await loadTask();
    } catch (error) {
      console.error('Failed to toggle subtask:', error);
    }
  }

  async function handleDeleteSubtask(subtaskId: number) {
    try {
      await subtasksApi.delete(subtaskId);
      await loadTask();
    } catch (error) {
      console.error('Failed to delete subtask:', error);
    }
  }

  async function handleAddComment() {
    if (!task || !newComment.trim()) return;
    try {
      await commentsApi.create(task.id, newComment.trim());
      setNewComment('');
      await loadTask();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const projectName = selectedProject ? selectedProject.name : 'Inbox';

  if (!mounted || !task) return null;

  return (
    <>
      {/* Overlay */}
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
          aria-labelledby="task-detail-title"
          aria-describedby="task-detail-content"
          className={`flex max-h-[min(90vh,calc(100dvh-8rem))] w-full max-w-4xl flex-col rounded-xl border border-border bg-background shadow-lg transition-transform duration-200 ease-out ${
            visible ? 'translate-y-0 scale-100' : 'translate-y-2 scale-[0.98]'
          }`}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
            <h2 id="task-detail-title" className="sr-only">{task.title}</h2>
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm text-muted-foreground">{projectName}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {loading ? (
            <div className="flex flex-1 items-center justify-center p-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent"></div>
            </div>
          ) : (
            <div id="task-detail-content" className="flex min-h-0 flex-1 overflow-y-auto">
              {/* Left Panel - Main Content */}
              <div className="flex-1 p-6 space-y-6">
                {/* Title */}
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={handleToggleComplete}
                    className="cursor-pointer flex-shrink-0 mt-1 text-muted-foreground hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                    aria-label={task.completed ? 'Mark task as incomplete' : 'Mark task as complete'}
                  >
                    {task.completed ? (
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                    ) : (
                      <Circle className="h-6 w-6" />
                    )}
                  </button>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setDirty(true);
                    }}
                    className="flex-1 border-0 bg-transparent text-xl font-semibold text-foreground focus:outline-none focus:ring-0"
                    placeholder="Task title"
                  />
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Description</span>
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      setDirty(true);
                    }}
                    placeholder="Add description..."
                    rows={4}
                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>

                {/* Subtasks */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium text-muted-foreground">Subtasks</span>
                  </div>
                  <div className="space-y-2">
                    {subtasks.map((subtask) => (
                      <div key={subtask.id} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleSubtask(subtask)}
                          className="cursor-pointer flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
                        >
                          {subtask.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          ) : (
                            <Circle className="h-4 w-4" />
                          )}
                        </button>
                        <input
                          type="text"
                          value={subtask.title}
                          onChange={async (e) => {
                            await subtasksApi.update(subtask.id, { title: e.target.value });
                            await loadTask();
                          }}
                          className={`flex-1 border-0 bg-transparent text-sm text-foreground focus:outline-none focus:ring-0 ${
                            subtask.completed ? 'line-through text-muted-foreground' : ''
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteSubtask(subtask.id)}
                          className="cursor-pointer text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {showSubtaskInput ? (
                      <div className="flex items-center gap-2">
                        <Circle className="h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={newSubtaskTitle}
                          onChange={(e) => setNewSubtaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddSubtask();
                            } else if (e.key === 'Escape') {
                              setShowSubtaskInput(false);
                              setNewSubtaskTitle('');
                            }
                          }}
                          autoFocus
                          placeholder="Subtask title"
                          className="flex-1 border-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
                        />
                        <button
                          type="button"
                          onClick={handleAddSubtask}
                          className="cursor-pointer text-primary hover:text-primary/80"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowSubtaskInput(true)}
                        className="cursor-pointer flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add sub-task</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Comments */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium text-muted-foreground">Comments</span>
                  </div>
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex items-start gap-3">
                        {comment.user?.avatar_url ? (
                          <img
                            src={comment.user.avatar_url}
                            alt={comment.user.name || 'User avatar'}
                            className="flex-shrink-0 h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                            {comment.user?.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-foreground">
                              {comment.user?.name || 'User'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-foreground">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-start gap-3">
                      {user?.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.name || 'User avatar'}
                          className="flex-shrink-0 h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                          {user?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAddComment();
                            }
                          }}
                          placeholder="Comment"
                          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                        />
                        <button
                          type="button"
                          className="cursor-pointer p-2 text-muted-foreground hover:text-foreground"
                          aria-label="Attach file"
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel - Properties */}
              <div className="w-64 border-l border-border p-6 space-y-4">
                {/* Project */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    Project
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                      className="cursor-pointer flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
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
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProjectId(null);
                                setShowProjectDropdown(false);
                                setDirty(true);
                              }}
                              className={`cursor-pointer flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                                selectedProjectId === null
                                  ? 'bg-accent text-accent-foreground'
                                  : 'text-popover-foreground hover:bg-muted'
                              }`}
                            >
                              <span>No project</span>
                            </button>
                            {projects.map((project) => (
                              <button
                                key={project.id}
                                type="button"
                                onClick={() => {
                                  setSelectedProjectId(project.id);
                                  setShowProjectDropdown(false);
                                  setDirty(true);
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
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    Date
                  </label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => {
                        setDueDate(e.target.value);
                        setDirty(true);
                      }}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none"
                    />
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 text-orange-500" />
                      <span>Deadline</span>
                      <Lock className="h-3 w-3 ml-auto" />
                    </div>
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    Priority
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                      className="cursor-pointer flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-2">
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
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    {showPriorityDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowPriorityDropdown(false)}
                        />
                        <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg">
                          <div className="p-1">
                            {[1, 2, 3, 4].map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => {
                                  setPriority(p);
                                  setShowPriorityDropdown(false);
                                  setDirty(true);
                                }}
                                className={`cursor-pointer flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                                  priority === p
                                    ? 'bg-accent text-accent-foreground'
                                    : 'text-popover-foreground hover:bg-muted'
                                }`}
                              >
                                <Flag className="h-4 w-4" />
                                <span>{priorityLabels[p]}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Labels */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    Labels
                  </label>
                  <button
                    type="button"
                    className="cursor-pointer flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add label</span>
                  </button>
                </div>

                {/* Reminders */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    Reminders
                  </label>
                  <button
                    type="button"
                    className="cursor-pointer flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add reminder</span>
                  </button>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    Location
                  </label>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 text-orange-500" />
                    <span>Premium feature</span>
                    <Lock className="h-3 w-3 ml-auto" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
