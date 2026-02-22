'use client';

import { Plus } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  type CollisionDetection,
  DndContext,
  DragCancelEvent,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
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
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { tasks as tasksApi, type Task } from '@/lib/api';
import { useTaskStoreOptional } from '@/contexts/TaskStoreContext';
import TaskCard from './TaskCard';
import TaskDetailModal from './TaskDetailModal';
import { useTranslations } from 'next-intl';

interface KanbanViewProps {
  tasks: Task[];
  projectId?: number;
  /** Optional: mutations update the store; no refetch. */
  onTaskUpdate?: () => void;
}

type Status = 'todo' | 'in_progress' | 'done';

const STATUSES: { value: Status; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

type ColumnMap = Record<Status, Task[]>;

const STATUS_VALUES: Status[] = STATUSES.map((s) => s.value);

function isStatus(id: UniqueIdentifier): id is Status {
  return STATUS_VALUES.includes(id as Status);
}

function buildColumns(tasks: Task[]): ColumnMap {
  const initial: ColumnMap = {
    todo: [],
    in_progress: [],
    done: [],
  };

  for (const task of tasks) {
    const status: Status = (task.status as Status) || 'todo';
    initial[status].push(task);
  }

  (Object.keys(initial) as Status[]).forEach((status) => {
    initial[status].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  });

  return initial;
}

function findContainerInColumns(cols: ColumnMap, id: UniqueIdentifier): Status | null {
  if (isStatus(id)) return id;
  for (const status of STATUS_VALUES) {
    if (cols[status].some((t) => t.id === id)) return status;
  }
  return null;
}

interface KanbanSortableCardProps {
  task: Task;
  status: Status;
  onClick: () => void;
  onToggle: () => void;
}

function KanbanSortableCard({ task, status, onClick, onToggle }: KanbanSortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'task', status },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing transition-shadow ${
        isDragging ? 'shadow-lg ring-1 ring-primary/20 rounded-lg' : 'hover:shadow-sm'
      }`}
    >
      <TaskCard task={task} onClick={onClick} onToggle={onToggle} />
    </div>
  );
}

function KanbanColumnDropZone({
  status,
  children,
}: {
  status: Status;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({
    id: status,
    data: { type: 'column', status },
  });

  return (
    <div
      ref={setNodeRef}
      className="space-y-2 min-h-[200px] rounded-lg border border-dashed border-border/60 bg-muted/10 p-2"
    >
      {children}
    </div>
  );
}

export default function KanbanView({ tasks, projectId, onTaskUpdate }: KanbanViewProps) {
  const taskStore = useTaskStoreOptional();
  const [draggingColumns, setDraggingColumns] = useState<ColumnMap | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);
  const tCommon = useTranslations('dashboard.common');

  const columnsFromStore = useMemo(() => buildColumns(tasks), [tasks]);
  const columns = draggingColumns ?? columnsFromStore;

  const columnsRef = useRef(columns);
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const clonedColumns = useRef<ColumnMap | null>(null);

  columnsRef.current = columns;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const allColumnTasks = useMemo(
    () => [...columns.todo, ...columns.in_progress, ...columns.done],
    [columns]
  );

  const activeTask = useMemo(() => {
    if (activeTaskId == null) return null;
    return allColumnTasks.find((task) => task.id === activeTaskId) ?? null;
  }, [allColumnTasks, activeTaskId]);

  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      const activeId = args.active.id;
      if (isStatus(activeId)) {
        return closestCenter(args);
      }

      const pointerIntersections = pointerWithin(args);
      const intersections = pointerIntersections.length ? pointerIntersections : rectIntersection(args);
      const overId = getFirstCollision(intersections, 'id');

      if (overId != null) {
        const overContainer = findContainerInColumns(columnsRef.current, overId);

        // If we're over a column, try to resolve to the closest item inside that column
        if (overContainer && isStatus(overId)) {
          const itemIds: UniqueIdentifier[] = columnsRef.current[overContainer].map(
            (t) => t.id as UniqueIdentifier
          );
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
    },
    []
  );

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim() || !projectId) return;
    setAddingTask(true);
    try {
      const res = await tasksApi.create(projectId, newTaskTitle.trim(), undefined, undefined, 'todo');
      setNewTaskTitle('');
      setShowAddInput(false);
      taskStore?.addTask(res.data);
    } catch (error) {
      console.error('Failed to add task:', error);
    } finally {
      setAddingTask(false);
    }
  }

  async function handleToggleTask(task: Task) {
    const previous = { ...task };
    const isDone = task.completed || task.status === 'done';
    const nextDone = !isDone;
    taskStore?.updateTask(task.id, {
      completed: nextDone,
      status: nextDone ? 'done' : 'todo',
    });
    try {
      await tasksApi.update(task.id, {
        completed: nextDone,
        status: nextDone ? 'done' : 'todo',
      });
    } catch (error) {
      console.error('Failed to update task:', error);
      taskStore?.rollbackTask(previous);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as number;
    setActiveTaskId(id);
    setDraggingColumns({
      todo: [...columnsRef.current.todo],
      in_progress: [...columnsRef.current.in_progress],
      done: [...columnsRef.current.done],
    });
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

    setDraggingColumns((prev) => {
      if (!prev) return prev;
      const activeContainer = findContainerInColumns(prev, activeId);
      const overContainer = findContainerInColumns(prev, overId);

      if (!activeContainer || !overContainer) return prev;

      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];

      const activeIndex = activeItems.findIndex((t) => t.id === activeId);
      if (activeIndex === -1) return prev;

      let overIndex = isStatus(overId)
        ? overItems.length
        : Math.max(0, overItems.findIndex((t) => t.id === overId));

      if (activeContainer === overContainer) {
        if (!isStatus(overId)) {
          if (activeIndex !== overIndex && overIndex !== -1) {
            return {
              ...prev,
              [overContainer]: arrayMove(overItems, activeIndex, overIndex),
            };
          }
        }
        return prev;
      }

      const nextActive = [...activeItems];
      const [moved] = nextActive.splice(activeIndex, 1);

      const nextOver = [...overItems];
      // When dragging into a different column and hovering a card,
      // insert *after* that card by default to avoid always jumping on top
      // when the column has only one task.
      const insertIndex =
        overIndex === -1
          ? nextOver.length
          : !isStatus(overId)
            ? overIndex + 1
            : overIndex;
      nextOver.splice(insertIndex, 0, {
        ...moved,
        status: overContainer,
        completed: overContainer === 'done',
      });

      return {
        ...prev,
        [activeContainer]: nextActive,
        [overContainer]: nextOver,
      };
    });
  }

  function handleDragCancel(_event: DragCancelEvent) {
    setActiveTaskId(null);
    setDraggingColumns(null);
    clonedColumns.current = null;
    lastOverId.current = null;
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { over } = event;
    setActiveTaskId(null);

    if (!over) {
      setDraggingColumns(null);
      clonedColumns.current = null;
      lastOverId.current = null;
      return;
    }

    clonedColumns.current = null;
    lastOverId.current = null;

    const finalColumns = columnsRef.current;
    const newTasks: Task[] = [...finalColumns.todo, ...finalColumns.in_progress, ...finalColumns.done].map(
      (task, index) => {
        const status = (task.status as Status) || 'todo';
        return {
          ...task,
          status,
          completed: status === 'done',
          order: index,
        };
      }
    );

    const previousTasks = taskStore ? taskStore.getTasks() : [];
    taskStore?.reorderTasks(newTasks);
    setDraggingColumns(null);

    const items = newTasks.map((task) => ({
      id: task.id,
      status: (task.status as string) || 'todo',
      order: task.order ?? 0,
    }));

    try {
      await tasksApi.reorder(items);
    } catch (error) {
      console.error('Failed to persist task reorder:', error);
      if (previousTasks.length > 0) taskStore?.reorderTasks(previousTasks);
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map((status) => {
            const statusTasks = columns[status.value];
            return (
              <div key={status.value} className="min-w-[280px] w-80 flex-shrink-0">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    {status.label} ({statusTasks.length})
                  </h3>
                </div>
                <KanbanColumnDropZone status={status.value}>
                  <SortableContext
                    items={statusTasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {statusTasks.map((task) => (
                      <KanbanSortableCard
                        key={task.id}
                        task={task}
                        status={status.value}
                        onClick={() => setSelectedTaskId(task.id)}
                        onToggle={() => handleToggleTask(task)}
                      />
                    ))}
                  </SortableContext>

                  {status.value === 'todo' && projectId && (
                    <div className="border-2 border-dashed border-border rounded-lg p-3 mt-2 bg-background/80">
                      {showAddInput ? (
                        <form onSubmit={handleAddTask} className="space-y-2">
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
                            className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none"
                          />
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={addingTask || !newTaskTitle.trim()}
                              className="cursor-pointer flex-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowAddInput(false);
                                setNewTaskTitle('');
                              }}
                              className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowAddInput(true)}
                          className="cursor-pointer flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          <span>{tCommon('addTask')}</span>
                        </button>
                      )}
                    </div>
                  )}
                </KanbanColumnDropZone>
              </div>
            );
          })}
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeTask ? (
            <div className="cursor-grabbing rounded-lg shadow-2xl ring-1 ring-primary/20">
              <TaskCard task={activeTask} onClick={() => {}} onToggle={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Detail Modal */}
      <TaskDetailModal
        open={selectedTaskId !== null}
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdate={onTaskUpdate ?? undefined}
      />
    </>
  );
}
