'use client';

import type { NoteBlock, NoteContent } from '@/lib/api';
import { notes as notesApi } from '@/lib/api';
import { websocket } from '@/lib/websocket';
import { useAuth } from '@/contexts/AuthContext';
import { useYjsProvider } from '@/hooks/useYjsProvider';
import type { NoteViewer } from '@/hooks/useYjsContent';
import { useYjsAutosave } from '@/hooks/useYjsAutosave';
import { migrateIfNeeded } from '@/lib/yjs-migration';
import {
  yjsToNoteContent,
  getTitleFromYjs,
  setTitleInYjs,
  insertBlockInYjs,
  deleteBlockFromYjs,
  moveBlockInYjs,
  updateBlockInYjs,
  getBlockFromYjs,
  cleanupDuplicateBlocks,
} from '@/lib/yjs-document';
import * as Y from 'yjs';
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CheckCircle2, Circle, GripVertical, Image, List, ListTodo, Plus, Type, X } from 'lucide-react';
import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, forwardRef } from 'react';
import RichParagraphEditor from './RichParagraphEditor';

export interface NoteEditorHandle {
  setYjsTitle: (title: string) => void;
}

interface NoteEditorProps {
  initialContent: NoteContent | null;
  initialTitle?: string;
  onSave: (content: NoteContent) => void;
  onTitleChange?: (title: string) => void;
  readOnly?: boolean;
  noteId: number;
  onUploadImage?: (noteId: number, file: File) => Promise<string>;
  onPresenceChange?: (viewers: NoteViewer[]) => void;
  onContentSavingChange?: (saving: boolean) => void;
  isTitleInputFocused?: () => boolean;
  getCurrentTitle?: () => string;
}

interface BlockLock {
  block_id: string;
  user_id: number;
}

const emptyContent: NoteContent = { blocks: [] };

type BulletItemWithId = { id: string; text: string };
type TodoItemWithId = { id: string; text: string; done: boolean };

type BlockWithId =
  | (Extract<NoteBlock, { type: 'paragraph' }> & { id: string })
  | (Extract<NoteBlock, { type: 'image' }> & { id: string })
  | { type: 'bulletList'; items: BulletItemWithId[]; id: string }
  | { type: 'todoList'; title?: string; items: TodoItemWithId[]; id: string };

/** Local editor state: blocks have stable ids and list items may have ids. */
type NoteContentWithBlockIds = { blocks: BlockWithId[] };

function genBlockId(): string {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function genItemId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeBulletItems(items: string[] | BulletItemWithId[]): BulletItemWithId[] {
  return items.map((item) =>
    typeof item === 'string' ? { id: genItemId(), text: item } : { ...item, id: item.id ?? genItemId() }
  );
}

function normalizeTodoItems(items: { text: string; done: boolean }[] | TodoItemWithId[]): TodoItemWithId[] {
  return items.map((item) => ({
    ...item,
    id: (item as TodoItemWithId).id ?? genItemId(),
  }));
}

function normalizeBlocks(blocks: NoteBlock[]): BlockWithId[] {
  return blocks
    .filter((b): b is NoteBlock => {
      // Filter out invalid blocks
      if (!b || !b.type) {
        console.warn('Invalid block found in normalizeBlocks, filtering out:', b);
        return false;
      }
      return true;
    })
    .map((b) => {
      const withBlockId = { ...b, id: (b as BlockWithId).id ?? genBlockId() };
      if (withBlockId.type === 'bulletList') {
        return { ...withBlockId, items: normalizeBulletItems(withBlockId.items) };
      }
      if (withBlockId.type === 'todoList') {
        return { ...withBlockId, items: normalizeTodoItems(withBlockId.items) };
      }
      return withBlockId;
    });
}

function blocksWithoutIds(blocks: BlockWithId[]): NoteContent {
  return {
    blocks: blocks.map(({ id: _id, ...b }) => {
      if (b.type === 'bulletList') {
        return { ...b, items: (b.items as BulletItemWithId[]).map((i) => i.text) };
      }
      if (b.type === 'todoList') {
        return { ...b, items: (b.items as TodoItemWithId[]).map(({ id: _i, ...r }) => r) };
      }
      return b;
    }),
  };
}

const BULLET = '•';

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const ASSET_BASE_URL = RAW_API_URL.replace(/\/api\/v1\/?$/, '');

function resolveImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  if (url.startsWith('/storage/')) {
    return `${ASSET_BASE_URL}${url}`;
  }
  return url;
}

function BulletRowReadOnly({ value }: { value: string }) {
  return (
    <li className="flex items-center gap-2 py-0.5">
      <span className="shrink-0 w-4 text-center text-muted-foreground text-sm" aria-hidden>
        {BULLET}
      </span>
      <span className="min-w-0 flex-1 text-foreground">{value || '\u00A0'}</span>
    </li>
  );
}

function SortableBulletRow({
  item,
  onChange,
  onRemove,
  onEnterAfter,
  autoFocus,
  onFocusHandled,
  onFocus,
  onBlur,
}: {
  item: BulletItemWithId;
  onChange: (v: string) => void;
  onRemove: () => void;
  onEnterAfter: () => void;
  autoFocus?: boolean;
  onFocusHandled?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: item.id,
  });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition };

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
      onFocusHandled?.();
    }
  }, [autoFocus, onFocusHandled]);

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 py-0.5 group/bullet touch-none rounded-md transition-colors ${
        isDragging ? 'opacity-40' : ''
      } ${isOver ? 'bg-primary/10 ring-1 ring-inset ring-primary/30' : ''}`}
    >
      <button
        type="button"
        className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground opacity-0 group-hover/bullet:opacity-100 hover:text-foreground touch-none"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="shrink-0 w-4 text-center text-muted-foreground text-sm" aria-hidden>
        {BULLET}
      </span>
      <input
        ref={inputRef}
        type="text"
        value={item.text}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onEnterAfter();
          }
        }}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="List item"
        className="min-w-0 flex-1 border-0 bg-transparent p-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
      />
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 text-muted-foreground opacity-0 group-hover/bullet:opacity-100 hover:text-destructive"
        aria-label="Remove item"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );
}

function BlockBulletList({
  items,
  onChange,
  readOnly,
  onFocus,
  onBlur,
}: {
  items: BulletItemWithId[];
  onChange: (items: BulletItemWithId[]) => void;
  onRemove?: () => void;
  readOnly?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const add = () => onChange([...items, { id: genItemId(), text: '' }]);
  const addAfter = (index: number): string => {
    const newId = genItemId();
    onChange([
      ...items.slice(0, index + 1),
      { id: newId, text: '' },
      ...items.slice(index + 1),
    ]);
    return newId;
  };
  const set = (index: number, v: string) =>
    onChange(items.map((x, j) => (j === index ? { ...x, text: v } : x)));
  const remove = (index: number) => onChange(items.filter((_, j) => j !== index));

  const [focusId, setFocusId] = useState<string | null>(null);
  const [activeBulletId, setActiveBulletId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );
  const handleDragStart = (event: DragStartEvent) => {
    setActiveBulletId(String(event.active.id));
  };
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveBulletId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(items, oldIndex, newIndex));
  };

  if (readOnly) {
    return (
      <ul className="space-y-0.5 pl-0">
        {items.map((item) => (
          <BulletRowReadOnly key={item.id} value={item.text} />
        ))}
      </ul>
    );
  }

  const activeBullet = activeBulletId != null ? items.find((i) => i.id === activeBulletId) : null;

  const handleFirstFocus = useCallback(() => {
    if (!readOnly) {
      onFocus?.();
    }
  }, [readOnly, onFocus]);

  const handleLastBlur = useCallback(() => {
    if (!readOnly) {
      // Use a small timeout to check if focus moved to another item in the same list
      setTimeout(() => {
        const activeElement = document.activeElement;
        const listElement = activeElement?.closest('[data-bullet-list]');
        if (!listElement) {
          onBlur?.();
        }
      }, 100);
    }
  }, [readOnly, onBlur]);

  return (
    <div className="group" data-bullet-list>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-0.5 pl-0">
            {items.map((item, i) => (
              <SortableBulletRow
                key={item.id}
                item={item}
                onChange={(v) => set(i, v)}
                onRemove={() => remove(i)}
                onEnterAfter={() => setFocusId(addAfter(i))}
                autoFocus={focusId === item.id}
                onFocusHandled={() => setFocusId(null)}
                onFocus={i === 0 ? handleFirstFocus : undefined}
                onBlur={i === items.length - 1 ? handleLastBlur : undefined}
              />
            ))}
          </ul>
        </SortableContext>
        <DragOverlay dropAnimation={null}>
          {activeBullet != null ? (
            <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 shadow-lg ring-1 ring-primary/20">
              <span className="shrink-0 w-4 text-center text-muted-foreground text-sm">{BULLET}</span>
              <span className="text-foreground">{activeBullet.text || '\u00A0'}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={add}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          + Add item
        </button>
      </div>
    </div>
  );
}

function TodoRowReadOnly({ item }: { item: { text: string; done: boolean } }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="shrink-0 text-muted-foreground">
        {item.done ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4" />}
      </span>
      <span className={item.done ? 'text-muted-foreground line-through' : 'text-foreground'}>
        {item.text || '\u00A0'}
      </span>
    </div>
  );
}

function SortableTodoRow({
  item,
  onToggle,
  onChange,
  onRemove,
  onFocus,
  onBlur,
}: {
  item: TodoItemWithId;
  onToggle: () => void;
  onChange: (text: string) => void;
  onRemove: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: item.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 py-1.5 group/todo touch-none rounded-md transition-colors ${
        isDragging ? 'opacity-40' : ''
      } ${isOver ? 'bg-primary/10 ring-1 ring-inset ring-primary/30' : ''}`}
    >
      <button
        type="button"
        className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground opacity-0 group-hover/todo:opacity-100 hover:text-foreground touch-none"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onToggle}
        className="shrink-0 cursor-pointer text-muted-foreground hover:text-primary transition-colors"
        aria-label={item.done ? 'Mark not done' : 'Mark done'}
      >
        {item.done ? (
          <CheckCircle2 className="h-4 w-4 text-primary" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </button>
      <input
        type="text"
        value={item.text}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="Todo…"
        className={`min-w-0 flex-1 border-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 ${
          item.done ? 'line-through text-muted-foreground' : ''
        }`}
      />
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 cursor-pointer p-1 text-muted-foreground opacity-0 group-hover/todo:opacity-100 hover:text-destructive"
        aria-label="Remove todo"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function BlockTodoList({
  title,
  onTitleChange,
  items,
  onChange,
  readOnly,
  onFocus,
  onBlur,
}: {
  title?: string;
  onTitleChange?: (title: string) => void;
  items: TodoItemWithId[];
  onChange: (items: TodoItemWithId[]) => void;
  onRemove?: () => void;
  readOnly?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const [showAddInput, setShowAddInput] = useState(false);
  const [newText, setNewText] = useState('');

  const [activeTodoId, setActiveTodoId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const add = () => {
    if (newText.trim()) {
      onChange([...items, { id: genItemId(), text: newText.trim(), done: false }]);
      setNewText('');
      setShowAddInput(false);
    } else {
      setShowAddInput(true);
    }
  };

  const set = (i: number, text: string, done: boolean) =>
    onChange(items.map((x, j) => (j === i ? { ...x, text, done } : x)));
  const remove = (i: number) => onChange(items.filter((_, j) => j !== i));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTodoId(String(event.active.id));
  };
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTodoId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(items, oldIndex, newIndex));
  };

  if (readOnly) {
    return (
      <div className="space-y-0">
        {title?.trim() && (
          <p className="mb-2 text-sm font-bold text-foreground">{title}</p>
        )}
        {items.map((item) => (
          <TodoRowReadOnly key={item.id} item={item} />
        ))}
      </div>
    );
  }

  const activeTodo = activeTodoId != null ? items.find((i) => i.id === activeTodoId) : null;

  const handleFirstFocus = useCallback(() => {
    if (!readOnly) {
      onFocus?.();
    }
  }, [readOnly, onFocus]);

  const handleLastBlur = useCallback(() => {
    if (!readOnly) {
      // Use a small timeout to check if focus moved to another item in the same list
      setTimeout(() => {
        const activeElement = document.activeElement;
        const listElement = activeElement?.closest('[data-todo-list]');
        if (!listElement) {
          onBlur?.();
        }
      }, 100);
    }
  }, [readOnly, onBlur]);

  return (
    <div className="group" data-todo-list>
      {onTitleChange && (
        <input
          type="text"
          value={title ?? ''}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Todo list title (optional)"
          className="mb-2 w-full border-0 border-b border-transparent bg-transparent p-0 text-sm font-bold text-foreground placeholder:text-muted-foreground focus:border-border focus:outline-none focus:ring-0"
          onFocus={handleFirstFocus}
          onBlur={handleLastBlur}
        />
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-0">
            {items.map((item, i) => (
              <SortableTodoRow
                key={item.id}
                item={item}
                onToggle={() => set(i, item.text, !item.done)}
                onChange={(text) => set(i, text, item.done)}
                onRemove={() => remove(i)}
                onFocus={i === 0 ? handleFirstFocus : undefined}
                onBlur={i === items.length - 1 ? handleLastBlur : undefined}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={null}>
          {activeTodo != null ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-lg ring-1 ring-primary/20">
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
              {activeTodo.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              ) : (
                <Circle className="h-4 w-4 shrink-0" />
              )}
              <span className={activeTodo.done ? 'line-through text-muted-foreground' : 'text-foreground'}>
                {activeTodo.text || 'Todo…'}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {showAddInput ? (
          <div className="flex w-full items-center gap-2">
            <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') add();
                else if (e.key === 'Escape') {
                  setShowAddInput(false);
                  setNewText('');
                }
              }}
              autoFocus
              placeholder="Add todo…"
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
            />
            <button
              type="button"
              onClick={add}
              className="shrink-0 cursor-pointer text-primary hover:text-primary/80"
              aria-label="Add"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddInput(true)}
            className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add todo
          </button>
        )}
      </div>
    </div>
  );
}

function BlockImage({
  url,
  alt,
  readOnly,
}: {
  url: string;
  alt?: string;
  onRemove?: () => void;
  readOnly?: boolean;
}) {
  return (
    <div className="group relative inline-block max-w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt ?? ''} className="max-h-64 rounded-lg object-contain" />
    </div>
  );
}

// SAVE_DEBOUNCE_MS removed - autosave handled by useYjsAutosave hook

function BlockDragPreview({ block }: { block: BlockWithId }) {
  if (!block || !block.type) {
    return <p className="text-sm text-muted-foreground">Block</p>;
  }
  
  if (block.type === 'paragraph') {
    const plain = block.text.replace(/<[^>]+>/g, '').trim().slice(0, 80);
    return <p className="text-sm text-foreground">{plain || 'Paragraph'}</p>;
  }
  if (block.type === 'bulletList') {
    return <p className="text-sm text-muted-foreground">Bullet list · {block.items.length} item(s)</p>;
  }
  if (block.type === 'todoList') {
    const done = block.items.filter((i) => i.done).length;
    return <p className="text-sm text-muted-foreground">Todo list · {done}/{block.items.length} done</p>;
  }
  if (block.type === 'image') {
    return (
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={block.url} alt={block.alt ?? ''} className="max-h-12 rounded object-cover" />
        <span className="text-sm text-muted-foreground">Image</span>
      </div>
    );
  }
  return null;
}

function SortableBlockWrapper({
  blockId,
  readOnly,
  onRemove,
  isLockedByOther,
  isLockedByMe,
  isBeingEditedByOther,
  editingUserName,
  children,
}: {
  blockId: string;
  readOnly: boolean;
  onRemove?: () => void;
  isLockedByOther?: boolean;
  isLockedByMe?: boolean;
  isBeingEditedByOther?: boolean;
  editingUserName?: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: blockId,
    disabled: isLockedByOther || isBeingEditedByOther,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col gap-0 touch-none">
      {(isLockedByOther || isBeingEditedByOther) && editingUserName && (
        <span className="self-center rounded-t-md bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
          {editingUserName}
        </span>
      )}
      <div
        className={`group flex gap-2 rounded-lg border px-4 py-3 transition-colors ${
          isDragging ? 'opacity-40' : ''
        } ${
          isOver
            ? 'border-primary/60 bg-primary/5 ring-2 ring-inset ring-primary/30'
            : isLockedByOther || isBeingEditedByOther
            ? 'border-primary/40 bg-primary/5 ring-2 ring-inset ring-primary/40'
            : 'border-transparent bg-transparent hover:border-border/40 hover:bg-muted/20 focus-within:border-border/50 focus-within:bg-muted/20'
        }`}
      >
        {!readOnly && (
        <button
          type="button"
          disabled={isLockedByOther || isBeingEditedByOther}
          className="mt-1 shrink-0 cursor-grab active:cursor-grabbing rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground touch-none self-start focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Drag to reorder block"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        )}
        <div className={`min-w-0 flex-1 ${isLockedByOther || isBeingEditedByOther ? 'pointer-events-none opacity-60' : ''}`}>{children}</div>
        {!readOnly && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            disabled={isLockedByOther || isBeingEditedByOther}
            className="mt-1 shrink-0 self-start rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Remove block"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// History management removed - Yjs handles undo/redo via CRDT

const NoteEditorInner = forwardRef<NoteEditorHandle, NoteEditorProps>(function NoteEditorInner({
  initialContent,
  initialTitle,
  onSave,
  onTitleChange,
  readOnly = false,
  noteId,
  onUploadImage,
  onPresenceChange,
  onContentSavingChange,
  isTitleInputFocused,
  getCurrentTitle,
}, ref) {
  const { user } = useAuth();
  
  const { yDoc, provider, connected, stateLoaded } = useYjsProvider({
    noteId,
    initialContent: initialContent || null,
    initialTitle,
    enabled: !readOnly,
  });

  useImperativeHandle(ref, () => ({
    setYjsTitle: (title: string) => {
      if (yDoc) setTitleInYjs(yDoc, title);
    },
  }), [yDoc]);

  const titleSyncedFromYjsRef = useRef(false);
  // Sync title from Yjs to parent (real-time); title is last-write-wins in meta map
  useEffect(() => {
    if (!yDoc || !onTitleChange || readOnly) return;
    const meta = yDoc.getMap('meta');
    const update = () => {
      const t = getTitleFromYjs(yDoc);
      const currentTitle = getCurrentTitle ? getCurrentTitle() : '';
      const isFocused = isTitleInputFocused ? isTitleInputFocused() : false;
      
      // Skip observer updates if Yjs title differs from current title:
      // - If input is focused: user is actively editing, don't overwrite
      // - If input is not focused: user just edited (debounced sync pending), don't overwrite
      // Only sync when titles match (no local edits) or when syncing would bring them in sync
      if (t !== currentTitle) return;

      // Only sync non-empty titles, or empty titles if we haven't synced yet (to avoid overwriting valid titles with empty)
      if (t.length > 0) {
        titleSyncedFromYjsRef.current = true;
        onTitleChange(t);
      } else if (!titleSyncedFromYjsRef.current) {
        // Only sync empty title if we haven't synced yet (initial state might be empty)
        titleSyncedFromYjsRef.current = true;
        onTitleChange(t);
      }
      // If title is empty and we've already synced, don't overwrite (preserve current title)
    };
    const onMetaChange = (event: Y.YMapEvent<unknown>) => {
      if (event.keys.has('title')) update();
    };
    meta.observe(onMetaChange);
    // Initial sync: only if title is non-empty AND matches current title (don't overwrite user edits)
    const initialTitle = getTitleFromYjs(yDoc);
    const currentTitle = getCurrentTitle ? getCurrentTitle() : '';
    if (initialTitle.length > 0 && initialTitle === currentTitle) {
      titleSyncedFromYjsRef.current = true;
      onTitleChange(initialTitle);
    }
    return () => meta.unobserve(onMetaChange);
  }, [yDoc, onTitleChange, readOnly, isTitleInputFocused, getCurrentTitle]);

  // Local state for rendering (synced from Yjs)
  const [content, setContent] = useState<NoteContentWithBlockIds>(() => ({
    blocks: normalizeBlocks(initialContent?.blocks ?? []),
  }));
  
  // Track which blocks other users are editing via awareness
  const [editingBlocks, setEditingBlocks] = useState<Map<string, { userId: number; userName: string }>>(new Map());
  
  // Ref to track if initial sync has been done
  const initialSyncDoneRef = useRef(false);
  // Ref to track if we're currently performing a drag operation
  const isDraggingRef = useRef(false);
  // Ref to prevent multiple simultaneous move operations
  const isMovingBlockRef = useRef(false);
  
  // Autosave Yjs state (also sync to JSON for backward compatibility)
  const { saving } = useYjsAutosave({
    yDoc,
    noteId,
    enabled: !readOnly && !!yDoc,
    syncContentToJson: true, // Keep JSON field updated for viewing mode
  });

  useEffect(() => {
    onContentSavingChange?.(saving);
  }, [saving, onContentSavingChange]);

  // Set our presence (viewing/editing this note) and track other viewers + block editors
  useEffect(() => {
    if (!provider || !provider.awareness || readOnly) return;

    const setOurPresence = () => {
      if (user) {
        provider.awareness.setLocalStateField('noteId', noteId);
        provider.awareness.setLocalStateField('userId', user.id);
        provider.awareness.setLocalStateField('userName', user.name || user.email || 'User');
        provider.awareness.setLocalStateField('userAvatar', user.avatar_url ?? null);
      }
    };
    setOurPresence();

    const updateEditingBlocks = () => {
      const editingMap = new Map<string, { userId: number; userName: string }>();
      const viewersByUser = new Map<number, NoteViewer>();
      const states = provider.awareness.getStates();

      states.forEach((state, clientId) => {
        if (clientId === provider.awareness.clientID) return;

        const blockId = state.blockId as string | undefined;
        const userId = state.userId as number | undefined;
        const userName = state.userName as string | undefined;
        const stateNoteId = state.noteId as number | undefined;
        const userAvatar = state.userAvatar as string | null | undefined;

        if (blockId && userId && userName) {
          editingMap.set(blockId, { userId, userName });
        }
        if (stateNoteId === noteId && userId && userName) {
          const existing = viewersByUser.get(userId);
          const avatarUrl = userAvatar ?? undefined;
          if (!existing || (avatarUrl && !existing.avatarUrl)) {
            viewersByUser.set(userId, { clientId, userId, userName, avatarUrl });
          }
        }
      });

      if (user && !viewersByUser.has(user.id)) {
        viewersByUser.set(user.id, {
          clientId: provider.awareness.clientID,
          userId: user.id,
          userName: user.name || user.email || 'User',
          avatarUrl: user.avatar_url ?? undefined,
        });
      }

      setEditingBlocks(editingMap);
      onPresenceChange?.(Array.from(viewersByUser.values()));
    };

    provider.awareness.on('change', updateEditingBlocks);
    updateEditingBlocks();

    const onStatus = (event: { status: string }) => {
      if (event.status === 'connected') {
        setOurPresence();
        updateEditingBlocks();
      }
    };
    provider.on('status', onStatus);

    const presenceIntervalId = setInterval(updateEditingBlocks, 1500);

    return () => {
      clearInterval(presenceIntervalId);
      provider.off('status', onStatus);
      provider.awareness.off('change', updateEditingBlocks);
    };
  }, [provider, readOnly, noteId, user, onPresenceChange, connected]);

  // Migrate content to Yjs on mount if needed
  // Only migrate if Yjs state doesn't exist yet (checked inside migrateIfNeeded)
  useEffect(() => {
    if (!readOnly && initialContent && yDoc && stateLoaded) {
      // Only migrate after state is loaded, and only if state doesn't exist
      migrateIfNeeded(noteId, initialContent).catch(console.error);
    }
  }, [noteId, initialContent, readOnly, yDoc, stateLoaded]);

  // Reset initial sync flag when dependencies change
  useEffect(() => {
    initialSyncDoneRef.current = false;
  }, [yDoc, provider, stateLoaded]);

  // Sync Yjs document changes to local state for rendering
  // Only sync after state is loaded and provider is connected to avoid duplicates
  useEffect(() => {
    if (!yDoc || !provider || !stateLoaded || readOnly) return;

    let updateTimeout: ReturnType<typeof setTimeout> | null = null;
    let updateCounter = 0; // Counter for periodic cleanup

    const updateContent = () => {
      // Skip updates during drag/move operations to prevent interference
      if (isDraggingRef.current || isMovingBlockRef.current) {
        return;
      }
      
      // Periodically clean up duplicates (every 3 updates to catch issues quickly)
      updateCounter++;
      if (updateCounter % 3 === 0) {
        const duplicatesRemoved = cleanupDuplicateBlocks(yDoc);
        if (duplicatesRemoved > 0) {
          console.warn(`Cleaned up ${duplicatesRemoved} duplicate/invalid blocks during update`);
        }
      }
      
      // Debounce updates to prevent rapid re-renders
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      
      updateTimeout = setTimeout(() => {
        const newContent = yjsToNoteContent(yDoc);
        setContent((prev) => {
          // Normalize new content
          const normalizedNew = normalizeBlocks(newContent.blocks);
          const normalizedPrev = prev.blocks as BlockWithId[];
          
          // Compare block order first (by ID), then content
          // Check if order changed by comparing IDs at each position
          const orderChanged = normalizedPrev.length !== normalizedNew.length ||
            normalizedPrev.some((prevBlock, i) => {
              const newBlock = normalizedNew[i];
              if (!newBlock) return true;
              // Compare IDs to detect reordering
              const prevId = (prevBlock as BlockWithId).id;
              const newId = (newBlock as BlockWithId).id;
              return prevId !== newId;
            });
          
          // Compare block content (not IDs) to see if content changed
          const contentChanged = orderChanged || normalizedPrev.length !== normalizedNew.length ||
            normalizedPrev.some((prevBlock, i) => {
              const newBlock = normalizedNew[i];
              if (!newBlock || prevBlock.type !== newBlock.type) return true;
              
              // Compare based on type
              if (prevBlock.type === 'paragraph' && newBlock.type === 'paragraph') {
                return prevBlock.text !== newBlock.text;
              }
              if (prevBlock.type === 'bulletList' && newBlock.type === 'bulletList') {
                return JSON.stringify(prevBlock.items) !== JSON.stringify(newBlock.items);
              }
              if (prevBlock.type === 'todoList' && newBlock.type === 'todoList') {
                return JSON.stringify(prevBlock.items) !== JSON.stringify(newBlock.items) ||
                       prevBlock.title !== newBlock.title;
              }
              if (prevBlock.type === 'image' && newBlock.type === 'image') {
                return prevBlock.url !== newBlock.url || prevBlock.alt !== newBlock.alt;
              }
              return true;
            });
          
          if (contentChanged || orderChanged) {
            // Preserve existing IDs when possible to avoid re-renders
            // Use IDs from Yjs (source of truth) - they should always be present
            const usedIds = new Set<string>();
            const blocksWithPreservedIds = normalizedNew.map((newBlock) => {
              // Use ID from Yjs (stored in newBlock) - this is the source of truth
              const yjsId = (newBlock as BlockWithId).id;
              if (yjsId) {
                // If this ID is already used, generate a new one (shouldn't happen in Yjs, but be safe)
                if (usedIds.has(yjsId)) {
                  console.warn('Duplicate Yjs block ID detected:', yjsId, 'generating new ID');
                  let newId = genBlockId();
                  while (usedIds.has(newId)) {
                    newId = genBlockId();
                  }
                  usedIds.add(newId);
                  return { ...newBlock, id: newId };
                }
                usedIds.add(yjsId);
                return { ...newBlock, id: yjsId };
              }
              
              // Fallback: generate new ID if Yjs didn't provide one (shouldn't happen)
              console.warn('Block from Yjs has no ID, generating new one');
              let newId = genBlockId();
              while (usedIds.has(newId)) {
                newId = genBlockId();
              }
              usedIds.add(newId);
              return { ...newBlock, id: newId };
            });
            
            // Final safety check: ensure all IDs are unique
            const finalIds = new Set<string>();
            const deduplicatedBlocks = blocksWithPreservedIds.map((block, i) => {
              if (finalIds.has(block.id)) {
                console.warn('Duplicate block ID after processing:', block.id, 'at index', i, 'generating new ID');
                let newId = genBlockId();
                while (finalIds.has(newId)) {
                  newId = genBlockId();
                }
                finalIds.add(newId);
                return { ...block, id: newId };
              }
              finalIds.add(block.id);
              return block;
            });
            
            return { blocks: deduplicatedBlocks };
          }
          return prev;
        });
      }, 50); // 50ms debounce
    };

    // Do initial sync only once when state is loaded and provider is ready
    if (!initialSyncDoneRef.current) {
      initialSyncDoneRef.current = true;
      
      // Aggressively clean up any duplicate/invalid blocks in Yjs document
      // Run cleanup multiple times to catch all duplicates (they might cascade)
      let totalRemoved = 0;
      for (let i = 0; i < 5; i++) {
        const removed = cleanupDuplicateBlocks(yDoc);
        totalRemoved += removed;
        if (removed === 0) break; // Stop if no more duplicates
      }
      if (totalRemoved > 0) {
        console.warn(`Cleaned up ${totalRemoved} duplicate/invalid blocks on initial sync`);
      }
      
      // Initial sync (no debounce for initial load)
      const newContent = yjsToNoteContent(yDoc);
      const normalizedNew = normalizeBlocks(newContent.blocks);
      
      // Deduplicate blocks by ID to prevent duplicate keys (defensive)
      const seenIds = new Set<string>();
      const deduplicatedBlocks = normalizedNew.filter((block) => {
        const blockId = (block as BlockWithId).id;
        if (!blockId) {
          // Block without ID - generate one
          (block as BlockWithId).id = genBlockId();
          return true;
        }
        if (seenIds.has(blockId)) {
          console.warn('Duplicate block ID in Yjs document:', blockId, 'filtering duplicate');
          return false; // Filter out duplicate
        }
        seenIds.add(blockId);
        return true;
      });
      
      setContent({ blocks: deduplicatedBlocks });
    }

    // Listen to Yjs updates (debounced)
    yDoc.on('update', updateContent);

    return () => {
      yDoc.off('update', updateContent);
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
    };
  }, [yDoc, provider, stateLoaded, connected, readOnly]);

  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const blockSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // Block locking state: map of block_id -> { user_id, locked_at }
  const [blockLocks, setBlockLocks] = useState<Map<string, { user_id: number }>>(new Map());
  const [currentlyEditingBlockId, setCurrentlyEditingBlockId] = useState<string | null>(null);
  const lockRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Note: Manual save logic removed - Yjs autosave handles persistence
  // Note: Undo/redo removed - Yjs handles this via CRDT

  // Block operations via Yjs
  // Only allow operations after state is loaded and provider is connected
  const setBlock = useCallback(
    (index: number, block: NoteBlock) => {
      if (!yDoc || !provider || !stateLoaded || readOnly) return;
      if (!block || !block.type) {
        console.warn('Cannot update block: invalid block data', block);
        return;
      }
      // Validate index is within bounds
      const blocks = yDoc.getArray<Y.Map<any>>('blocks');
      if (index < 0 || index >= blocks.length) {
        console.warn('Cannot update block: invalid index', index, 'blocks length:', blocks.length);
        return;
      }
      updateBlockInYjs(yDoc, index, block);
    },
    [yDoc, provider, stateLoaded, readOnly]
  );

  const removeBlock = useCallback(
    (index: number) => {
      if (!yDoc || !provider || !stateLoaded || readOnly) return;
      deleteBlockFromYjs(yDoc, index);
    },
    [yDoc, provider, stateLoaded, readOnly]
  );

  const insertBlock = useCallback(
    (index: number, block: NoteBlock) => {
      if (!yDoc || !provider || !stateLoaded || readOnly) return;
      insertBlockInYjs(yDoc, index, block);
    },
    [yDoc, provider, stateLoaded, readOnly]
  );

  const handleBlockDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id);
    setActiveBlockId(id);
    isDraggingRef.current = true;
  }, []);

  const handleBlockDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!yDoc || !provider || !stateLoaded || readOnly) return;
      
      // Prevent multiple simultaneous move operations
      if (isMovingBlockRef.current) {
        console.warn('Block move already in progress, ignoring drag end');
        return;
      }
      
      setActiveBlockId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) {
        isDraggingRef.current = false;
        return;
      }
      
      // Use React state indices (what user sees) for drag operation
      // Then find corresponding Yjs indices to perform the move
      const blocks = content.blocks as BlockWithId[];
      const oldIndexReact = blocks.findIndex((b) => b && b.id === active.id);
      const newIndexReact = blocks.findIndex((b) => b && b.id === over.id);
      
      if (oldIndexReact === -1 || newIndexReact === -1) {
        console.warn('Could not find block indices in React state:', { oldIndexReact, newIndexReact, activeId: active.id, overId: over.id });
        isDraggingRef.current = false;
        return;
      }
      
      // Get Yjs document to find actual indices
      const yjsBlocks = yDoc.getArray<Y.Map<any>>('blocks');
      let oldIndexYjs = -1;
      let newIndexYjs = -1;
      
      // Find Yjs indices by block ID
      for (let i = 0; i < yjsBlocks.length; i++) {
        const blockMap = yjsBlocks.get(i);
        if (blockMap) {
          const blockId = blockMap.get('id');
          if (blockId === active.id) {
            oldIndexYjs = i;
          }
          if (blockId === over.id) {
            newIndexYjs = i;
          }
        }
      }
      
      if (oldIndexYjs === -1 || newIndexYjs === -1) {
        console.warn('Could not find block indices in Yjs:', { oldIndexYjs, newIndexYjs, activeId: active.id, overId: over.id });
        isDraggingRef.current = false;
        return;
      }
      
      // Prevent duplicate moves
      if (oldIndexYjs === newIndexYjs) {
        console.warn('Block already at target position:', { oldIndexYjs, newIndexYjs });
        isDraggingRef.current = false;
        return;
      }
      
      // Set moving flag so the Yjs sync effect doesn't overwrite our update
      isMovingBlockRef.current = true;
      
      // Optimistically update React state so the UI reorders immediately.
      // (The Yjs sync effect skips updates while isMovingBlockRef is true, so we must apply locally.)
      const reordered = arrayMove(blocks, oldIndexReact, newIndexReact);
      setContent({ blocks: reordered });
      
      // Use Yjs indices for the actual move operation (persists to doc)
      try {
        moveBlockInYjs(yDoc, oldIndexYjs, newIndexYjs);
      } catch (error) {
        console.error('Error moving block:', error);
        // Revert optimistic update on error
        setContent({ blocks });
      } finally {
        // Clear flags after a delay so the next Yjs update doesn't overwrite our order
        setTimeout(() => {
          isMovingBlockRef.current = false;
          isDraggingRef.current = false;
        }, 200);
      }
    },
    [yDoc, provider, stateLoaded, readOnly, content.blocks]
  );

  // Set awareness when user focuses on a block
  const setBlockAwareness = useCallback(
    (blockId: string) => {
      if (!provider || !provider.awareness || !user || readOnly) return;
      
      provider.awareness.setLocalStateField('blockId', blockId);
      provider.awareness.setLocalStateField('userId', user.id);
      provider.awareness.setLocalStateField('userName', user.name || user.email || 'User');
    },
    [provider, user, readOnly]
  );

  // Clear awareness when user blurs a block
  const clearBlockAwareness = useCallback(
    () => {
      if (!provider || !provider.awareness || readOnly) return;
      
      provider.awareness.setLocalStateField('blockId', null);
      provider.awareness.setLocalStateField('userId', null);
      provider.awareness.setLocalStateField('userName', null);
    },
    [provider, readOnly]
  );

  // Lock/unlock block handlers
  const lockBlock = useCallback(
    async (blockId: string) => {
      if (!user || readOnly) return;
      try {
        await notesApi.blocks.lock(noteId, blockId);
        setCurrentlyEditingBlockId(blockId);
        // Refresh lock every 30 seconds to keep it alive
        if (lockRefreshIntervalRef.current) {
          clearInterval(lockRefreshIntervalRef.current);
        }
        lockRefreshIntervalRef.current = setInterval(() => {
          if (currentlyEditingBlockId) {
            notesApi.blocks.lock(noteId, currentlyEditingBlockId).catch(console.error);
          }
        }, 30000);
      } catch (error) {
        console.error('Failed to lock block:', error);
      }
    },
    [noteId, user, readOnly, currentlyEditingBlockId]
  );

  const unlockBlock = useCallback(
    async (blockId: string) => {
      if (!user || readOnly) return;
      try {
        await notesApi.blocks.unlock(noteId, blockId);
        setCurrentlyEditingBlockId(null);
        if (lockRefreshIntervalRef.current) {
          clearInterval(lockRefreshIntervalRef.current);
          lockRefreshIntervalRef.current = null;
        }
      } catch (error) {
        console.error('Failed to unlock block:', error);
      }
    },
    [noteId, user, readOnly]
  );

  // Subscribe to block lock/unlock events
  useEffect(() => {
    if (!user || readOnly) return;

    const handleBlockLocked = (data: { note_id: number; block_id: string; user_id: number }) => {
      if (data.note_id === noteId) {
        setBlockLocks((prev) => {
          const next = new Map(prev);
          next.set(data.block_id, { user_id: data.user_id });
          return next;
        });
      }
    };

    const handleBlockUnlocked = (data: { note_id: number; block_id: string; user_id: number }) => {
      if (data.note_id === noteId) {
        setBlockLocks((prev) => {
          const next = new Map(prev);
          next.delete(data.block_id);
          return next;
        });
      }
    };

    websocket.on('note.block_locked', handleBlockLocked);
    websocket.on('note.block_unlocked', handleBlockUnlocked);

    return () => {
      websocket.off('note.block_locked', handleBlockLocked);
      websocket.off('note.block_unlocked', handleBlockUnlocked);
      // Cleanup: unlock any block we were editing
      if (currentlyEditingBlockId) {
        unlockBlock(currentlyEditingBlockId);
      }
      if (lockRefreshIntervalRef.current) {
        clearInterval(lockRefreshIntervalRef.current);
      }
    };
  }, [noteId, user, readOnly, currentlyEditingBlockId, unlockBlock]);

  // Deduplicate blocks by ID before computing blockIds
  const seenBlockIds = new Set<string>();
  const deduplicatedBlocks = (content.blocks as BlockWithId[]).filter((b) => {
    if (!b || !b.id || !b.type) return false; // Filter invalid blocks
    if (seenBlockIds.has(b.id)) {
      console.warn('Duplicate block ID in render:', b.id, 'filtering duplicate');
      return false; // Filter duplicates
    }
    seenBlockIds.add(b.id);
    return true;
  });
  
  const blockIds = deduplicatedBlocks.map((b) => b.id);
  const activeBlock = activeBlockId != null
    ? (content.blocks as BlockWithId[]).find((b) => b && b.id === activeBlockId && b.type)
    : null;

  // Helper to check if a block is locked by another user
  const isBlockLockedByOther = useCallback(
    (blockId: string) => {
      const lock = blockLocks.get(blockId);
      return lock && lock.user_id !== user?.id;
    },
    [blockLocks, user]
  );

  // Helper to check if a block is locked by current user
  const isBlockLockedByMe = useCallback(
    (blockId: string) => {
      const lock = blockLocks.get(blockId);
      return lock && lock.user_id === user?.id;
    },
    [blockLocks, user]
  );

  return (
    <div className="space-y-6">
      {content.blocks.length === 0 && readOnly ? (
        <p className="py-4 text-muted-foreground">No content.</p>
      ) : readOnly ? (
        deduplicatedBlocks.map((block, index) => (
          <div
            key={index}
            className="group rounded-lg border border-transparent bg-transparent px-4 py-3 transition-colors hover:border-border/40 hover:bg-muted/20 focus-within:border-border/50 focus-within:bg-muted/20"
          >
            {block.type === 'paragraph' && (
              <RichParagraphEditor
                content={block.text}
                onChange={(text) => setBlock(index, { ...block, text })}
                readOnly={readOnly}
                onRemove={() => removeBlock(index)}
                placeholder="Paragraph…"
              />
            )}
            {block.type === 'bulletList' && (
              <BlockBulletList
                items={block.items}
                onChange={(items) => setBlock(index, { ...block, items: items.map((i) => i.text) })}
                onRemove={() => removeBlock(index)}
                readOnly={readOnly}
              />
            )}
            {block.type === 'todoList' && (
              <BlockTodoList
                title={block.title}
                onTitleChange={readOnly ? undefined : (t) => setBlock(index, { ...block, title: t })}
                items={block.items}
                onChange={(items) => setBlock(index, { ...block, items: items.map(({ text, done }) => ({ text, done })) })}
                onRemove={() => removeBlock(index)}
                readOnly={readOnly}
              />
            )}
            {block.type === 'image' && (
              <BlockImage
                url={block.url}
                alt={block.alt}
                onRemove={() => removeBlock(index)}
                readOnly={readOnly}
              />
            )}
          </div>
        ))
      ) : (
        <DndContext
          sensors={blockSensors}
          collisionDetection={closestCenter}
          onDragStart={handleBlockDragStart}
          onDragEnd={handleBlockDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
            {deduplicatedBlocks.map((block, index) => {
              // Safety check: skip blocks without type or id
              if (!block || typeof block !== 'object' || !block.type || !block.id) {
                console.warn('Block at index', index, 'is invalid, skipping:', block);
                return null;
              }

              // Additional type-specific validation
              if (block.type === 'paragraph' && typeof block.text !== 'string') {
                console.warn('Paragraph block at index', index, 'has invalid text:', block);
                return null;
              }
              if (block.type === 'bulletList' && !Array.isArray(block.items)) {
                console.warn('BulletList block at index', index, 'has invalid items:', block);
                return null;
              }
              if (block.type === 'todoList' && !Array.isArray(block.items)) {
                console.warn('TodoList block at index', index, 'has invalid items:', block);
                return null;
              }
              if (block.type === 'image' && typeof block.url !== 'string') {
                console.warn('Image block at index', index, 'has invalid url:', block);
                return null;
              }

              const blockLockedByOther = isBlockLockedByOther(block.id);
              const blockLockedByMe = isBlockLockedByMe(block.id);
              // Check if block is being edited by another user via awareness
              const editingInfo = editingBlocks.get(block.id);
              const blockBeingEditedByOther = editingInfo && editingInfo.userId !== user?.id;
              const blockReadOnly = readOnly || blockLockedByOther || blockBeingEditedByOther;
              return (
                <SortableBlockWrapper
                  key={block.id}
                  blockId={block.id}
                  readOnly={readOnly}
                  onRemove={() => removeBlock(index)}
                  isLockedByOther={blockLockedByOther}
                  isLockedByMe={blockLockedByMe}
                  isBeingEditedByOther={blockBeingEditedByOther}
                  editingUserName={blockBeingEditedByOther && editingInfo ? editingInfo.userName : undefined}
                >
                  <>
            {block.type === 'paragraph' && typeof block.text === 'string' && (
              <RichParagraphEditor
                key={`paragraph-${block.id}-${yDoc ? 'yjs' : 'local'}`}
                content={block.text}
                onChange={(text) => {
                  if (block && block.type === 'paragraph' && typeof text === 'string') {
                    setBlock(index, { ...block, text });
                  }
                }}
                readOnly={blockReadOnly}
                placeholder="Paragraph…"
                onFocus={() => {
                  lockBlock(block.id);
                  setBlockAwareness(block.id);
                }}
                onBlur={() => {
                  unlockBlock(block.id);
                  clearBlockAwareness();
                }}
                yDoc={yDoc}
                provider={provider}
                blockId={block.id}
                user={user ? { name: user.name || user.email || 'User' } : undefined}
              />
            )}
                    {block.type === 'bulletList' && (
                      <BlockBulletList
                        items={block.items}
                        onChange={(items) => setBlock(index, { ...block, items: items.map((i) => i.text) })}
                        readOnly={blockReadOnly}
                        onFocus={() => {
                          lockBlock(block.id);
                          setBlockAwareness(block.id);
                        }}
                        onBlur={() => {
                          unlockBlock(block.id);
                          clearBlockAwareness();
                        }}
                      />
                    )}
                    {block.type === 'todoList' && (
                      <BlockTodoList
                        title={block.title}
                        onTitleChange={(t) => setBlock(index, { ...block, title: t })}
                        items={block.items}
                        onChange={(items) => setBlock(index, { ...block, items: items.map(({ text, done }) => ({ text, done })) })}
                        readOnly={blockReadOnly}
                        onFocus={() => {
                          lockBlock(block.id);
                          setBlockAwareness(block.id);
                        }}
                        onBlur={() => {
                          unlockBlock(block.id);
                          clearBlockAwareness();
                        }}
                      />
                    )}
                    {block.type === 'image' && (
                      <BlockImage
                        url={block.url}
                        alt={block.alt}
                        readOnly={blockReadOnly}
                      />
                    )}
                  </>
                </SortableBlockWrapper>
              );
            })}
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {activeBlock ? (
              <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-lg ring-1 ring-primary/20">
                <BlockDragPreview block={activeBlock} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-6">
          {connected && (
            <span className="text-xs text-muted-foreground">
              {connected ? '● Connected' : '○ Disconnected'}
            </span>
          )}
          <span className="h-5 w-px bg-border" aria-hidden />
          <button
            type="button"
            onClick={() => insertBlock(content.blocks.length, { type: 'paragraph', text: '' })}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Type className="h-4 w-4" /> Paragraph
          </button>
          <button
            type="button"
            onClick={() => insertBlock(content.blocks.length, { type: 'bulletList', items: [''] })}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <List className="h-4 w-4" /> Bullet list
          </button>
          <button
            type="button"
            onClick={() =>
              insertBlock(content.blocks.length, {
                type: 'todoList',
                items: [{ text: '', done: false }],
              })
            }
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ListTodo className="h-4 w-4" /> Todo list
          </button>
          {onUploadImage && (
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <Image className="h-4 w-4" /> Image
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const url = await onUploadImage(noteId, file);
                    insertBlock(content.blocks.length, { type: 'image', url, alt: file.name });
                  } catch (err) {
                    console.error('Upload failed:', err);
                  }
                  e.target.value = '';
                }}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
});

export default NoteEditorInner;
