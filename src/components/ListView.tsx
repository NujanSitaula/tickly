'use client';

import { Circle, Plus } from 'lucide-react';
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type CollisionDetection,
  DndContext,
  DragCancelEvent,
  DragEndEvent,
  DragOverlay,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  type UniqueIdentifier,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { tasks as tasksApi, type Task } from '@/lib/api';
import TaskItem from './TaskItem';
import TaskDetailModal from './TaskDetailModal';
import { useTranslations } from 'next-intl';

interface ListViewProps {
  tasks: Task[];
  projectId?: number;
  onTaskUpdate: () => void;
}

function SortableTaskRow({
  task,
  onClick,
  onToggle,
  onUpdate,
  showDivider,
}: {
  task: Task;
  onClick: () => void;
  onToggle: () => void;
  onUpdate: () => void;
  showDivider: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`touch-none ${isDragging ? 'opacity-40' : ''}`}
    >
      <TaskItem
        task={task}
        onClick={onClick}
        onToggle={onToggle}
        onUpdate={onUpdate}
        showDivider={showDivider}
        dragHandleProps={{
          ...attributes,
          ...listeners,
        }}
      />
    </div>
  );
}

function StatusDropZone({
  id,
  children,
}: {
  id: 'todo' | 'in_progress' | 'done';
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[56px] ${isOver ? 'bg-muted/20' : ''}`}
    >
      {children}
    </div>
  );
}

export default function ListView({ tasks, projectId, onTaskUpdate }: ListViewProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [columns, setColumns] = useState<Record<'todo' | 'in_progress' | 'done', Task[]>>({
    todo: [],
    in_progress: [],
    done: [],
  });
  const tCommon = useTranslations('dashboard.common');

  const columnsRef = useRef(columns);
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const clonedColumns = useRef<typeof columns | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim() || !projectId) return;
    setAddingTask(true);
    try {
      await tasksApi.create(projectId, newTaskTitle.trim());
      setNewTaskTitle('');
      setShowAddInput(false);
      onTaskUpdate();
    } catch (error) {
      console.error('Failed to add task:', error);
    } finally {
      setAddingTask(false);
    }
  }

  async function handleToggleTask(task: Task) {
    try {
      const isDone = task.completed || task.status === 'done';
      const nextDone = !isDone;
      await tasksApi.update(task.id, { completed: nextDone, status: nextDone ? 'done' : 'todo' });
      onTaskUpdate();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  }

  useEffect(() => {
    const sorted = [...tasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const next = {
      todo: [] as Task[],
      in_progress: [] as Task[],
      done: [] as Task[],
    };

    for (const task of sorted) {
      const status = (task.status as 'todo' | 'in_progress' | 'done') || 'todo';
      next[status].push(task);
    }

    setColumns(next);
  }, [tasks]);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const allTasks = useMemo(() => [...columns.todo, ...columns.in_progress, ...columns.done], [columns]);

  const activeTask = useMemo(() => {
    if (activeTaskId == null) return null;
    return allTasks.find((t) => t.id === activeTaskId) ?? null;
  }, [activeTaskId, allTasks]);

  const STATUS_VALUES = ['todo', 'in_progress', 'done'] as const;
  const isStatus = (id: UniqueIdentifier): id is (typeof STATUS_VALUES)[number] =>
    STATUS_VALUES.includes(id as any);

  const findContainer = useCallback(
    (cols: typeof columns, id: UniqueIdentifier) => {
      if (isStatus(id)) return id;
      for (const s of STATUS_VALUES) {
        if (cols[s].some((t) => t.id === id)) return s;
      }
      return null;
    },
    []
  );

  const collisionDetectionStrategy: CollisionDetection = useCallback((args) => {
    const activeId = args.active.id;
    if (isStatus(activeId)) return closestCenter(args);

    const pointerIntersections = pointerWithin(args);
    const intersections = pointerIntersections.length ? pointerIntersections : rectIntersection(args);
    const overId = getFirstCollision(intersections, 'id');

    if (overId != null) {
      const overContainer = findContainer(columnsRef.current, overId);

      if (overContainer && isStatus(overId)) {
        const itemIds: UniqueIdentifier[] = columnsRef.current[overContainer].map((t) => t.id as UniqueIdentifier);
        if (itemIds.length > 0) {
          const closest = closestCenter({
            ...args,
            droppableContainers: args.droppableContainers.filter((c) => itemIds.includes(c.id)),
          });
          if (closest.length > 0) {
            lastOverId.current = closest[0]!.id;
            return closest;
          }
        }
      }

      lastOverId.current = overId;
      return intersections;
    }

    return lastOverId.current ? ([{ id: lastOverId.current }] as any) : [];
  }, [findContainer]);

  function handleDragStart(event: DragStartEvent) {
    setActiveTaskId(event.active.id as number);
    clonedColumns.current = {
      todo: [...columnsRef.current.todo],
      in_progress: [...columnsRef.current.in_progress],
      done: [...columnsRef.current.done],
    };
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    setColumns((prev) => {
      const activeContainer = findContainer(prev, activeId);
      const overContainer = findContainer(prev, overId);
      if (!activeContainer || !overContainer) return prev;

      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];

      const activeIndex = activeItems.findIndex((t) => t.id === activeId);
      if (activeIndex === -1) return prev;

      const overIndex = isStatus(overId) ? overItems.length : Math.max(0, overItems.findIndex((t) => t.id === overId));

      if (activeContainer === overContainer) {
        if (!isStatus(overId)) {
          if (activeIndex !== overIndex && overIndex !== -1) {
            return { ...prev, [overContainer]: arrayMove(overItems, activeIndex, overIndex) };
          }
        }
        return prev;
      }

      const nextActive = [...activeItems];
      const [moved] = nextActive.splice(activeIndex, 1);
      const nextOver = [...overItems];
      const insertIndex = overIndex === -1 ? nextOver.length : overIndex;
      nextOver.splice(insertIndex, 0, { ...moved, status: overContainer, completed: overContainer === 'done' });

      return { ...prev, [activeContainer]: nextActive, [overContainer]: nextOver };
    });
  }

  function handleDragCancel(_event: DragCancelEvent) {
    setActiveTaskId(null);
    if (clonedColumns.current) setColumns(clonedColumns.current);
    clonedColumns.current = null;
    lastOverId.current = null;
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { over } = event;
    setActiveTaskId(null);
    if (!over) {
      handleDragCancel({} as DragCancelEvent);
      return;
    }

    clonedColumns.current = null;
    lastOverId.current = null;

    const final = columnsRef.current;
    const ordered = [...final.todo, ...final.in_progress, ...final.done].map((t, idx) => {
      const status = (t.status as 'todo' | 'in_progress' | 'done') || 'todo';
      return { ...t, status, completed: status === 'done', order: idx };
    });

    const items = ordered.map((t) => ({
      id: t.id,
      status: (t.status as string) || 'todo',
      order: t.order ?? 0,
    }));

    try {
      await tasksApi.reorder(items);
      window.setTimeout(() => startTransition(() => onTaskUpdate()), 250);
    } catch (error) {
      console.error('Failed to persist task reorder:', error);
      onTaskUpdate();
    }
  }

  const sections = useMemo(
    () => [
      { key: 'todo' as const, label: 'To Do', tasks: columns.todo },
      { key: 'in_progress' as const, label: 'In Progress', tasks: columns.in_progress },
      { key: 'done' as const, label: 'Done', tasks: columns.done },
    ],
    [columns]
  );

  return (
    <>
      <div className="space-y-0">
        {/* Add Task Input */}
        {projectId && (
          <div className="px-4 py-2 border-b border-border">
            {showAddInput ? (
              <form onSubmit={handleAddTask} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddInput(false);
                    setNewTaskTitle('');
                  }}
                  className="cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  <Circle className="h-5 w-5" />
                </button>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onBlur={() => {
                    if (!newTaskTitle.trim()) {
                      setShowAddInput(false);
                    }
                  }}
                  autoFocus
                  placeholder="Task name"
                  className="flex-1 border-0 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 text-lg"
                />
                <button
                  type="submit"
                  disabled={addingTask || !newTaskTitle.trim()}
                  className="cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  Add
                </button>
              </form>
            ) : (
              <button
                data-add-task
                onClick={() => setShowAddInput(true)}
                className="cursor-pointer flex w-full items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span>{tCommon('addTask')}</span>
              </button>
            )}
          </div>
        )}

        {/* Sections by status */}
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionStrategy}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="space-y-6">
            {sections.map((section) => (
              <div key={section.key}>
                <div className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground border-b border-border">
                  {section.label} ({section.tasks.length})
                </div>
                <StatusDropZone id={section.key}>
                  <SortableContext items={section.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    {section.tasks.map((task, idx) => (
                      <SortableTaskRow
                        key={task.id}
                        task={task}
                        onClick={() => setSelectedTaskId(task.id)}
                        onToggle={() => handleToggleTask(task)}
                        onUpdate={onTaskUpdate}
                        showDivider={idx !== section.tasks.length - 1}
                      />
                    ))}
                  </SortableContext>
                </StatusDropZone>
              </div>
            ))}
          </div>

          <DragOverlay>
            {activeTask ? (
              <div className="rounded-lg shadow-2xl ring-1 ring-primary/20 bg-background">
                <TaskItem
                  task={activeTask}
                  onClick={() => {}}
                  onToggle={() => {}}
                  onUpdate={onTaskUpdate}
                  showDivider={false}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {tasks.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">
              {projectId ? 'No tasks yet. Add one above!' : 'No tasks yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        open={selectedTaskId !== null}
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdate={onTaskUpdate}
      />
    </>
  );
}
