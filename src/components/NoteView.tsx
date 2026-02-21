'use client';

import type { NoteBlock, NoteContent } from '@/lib/api';
import type { BlockEditingInfo } from '@/hooks/useYjsContent';
import { CheckCircle2, Circle } from 'lucide-react';

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

function isHtml(text: string): boolean {
  return typeof text === 'string' && text.trim().includes('<');
}

function ParagraphBlock({ text, editingInfo }: { text: string; editingInfo?: BlockEditingInfo }) {
  const content = isHtml(text) ? (
    <div
      className="prose prose-sm dark:prose-invert max-w-none text-foreground [&_p]:m-0 [&_p:not(:first-child)]:mt-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-semibold [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_strong]:font-semibold [&_em]:italic [&_u]:underline"
      dangerouslySetInnerHTML={{ __html: text }}
    />
  ) : (
    <p className="text-foreground whitespace-pre-wrap">{text || '\u00A0'}</p>
  );

  if (editingInfo) {
    return (
      <div className="relative rounded-lg border-2 border-primary/40 bg-primary/5 px-3 py-2">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-medium text-primary">
            {editingInfo.userName} is editing...
          </span>
        </div>
        <div className="opacity-60">{content}</div>
      </div>
    );
  }

  if (!text?.trim()) {
    return <p className="text-foreground/70">&nbsp;</p>;
  }

  return content;
}

function BulletListBlock({ items, editingInfo }: { items: string[]; editingInfo?: BlockEditingInfo }) {
  if (!items?.length) return null;
  
  const content = (
    <ul className="list-none space-y-1 pl-0">
      {items.map((item, i) => (
        <li key={i} className="flex items-baseline gap-2">
          <span className="shrink-0 w-4 text-center text-muted-foreground text-sm" aria-hidden>
            {BULLET}
          </span>
          <span className="min-w-0 flex-1 text-foreground">{item || '\u00A0'}</span>
        </li>
      ))}
    </ul>
  );

  if (editingInfo) {
    return (
      <div className="relative rounded-lg border-2 border-primary/40 bg-primary/5 px-3 py-2">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-medium text-primary">
            {editingInfo.userName} is editing...
          </span>
        </div>
        <div className="opacity-60">{content}</div>
      </div>
    );
  }

  return content;
}

function TodoListBlock({
  title,
  items,
  onToggle,
  editingInfo,
}: {
  title?: string;
  items: { text: string; done: boolean }[];
  onToggle?: (index: number) => void;
  editingInfo?: BlockEditingInfo;
}) {
  if (!items?.length && !title?.trim()) return null;
  
  const content = (
    <div className="space-y-2">
      {title?.trim() && (
        <p className="text-sm font-bold text-foreground">{title}</p>
      )}
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggle?.(i)}
            className={`shrink-0 cursor-pointer text-muted-foreground transition-colors ${
              onToggle ? 'hover:text-primary' : ''
            }`}
            aria-label={item.done ? 'Mark not done' : 'Mark done'}
            disabled={!onToggle || !!editingInfo}
          >
            {item.done ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
          </button>
          <span
            className={`${
              item.done
                ? 'text-muted-foreground line-through'
                : 'text-foreground'
            }`}
          >
            {item.text || '\u00A0'}
          </span>
        </div>
      ))}
    </div>
  );

  if (editingInfo) {
    return (
      <div className="relative rounded-lg border-2 border-primary/40 bg-primary/5 px-3 py-2">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-medium text-primary">
            {editingInfo.userName} is editing...
          </span>
        </div>
        <div className="opacity-60">{content}</div>
      </div>
    );
  }

  return content;
}

function ImageBlock({ url, alt, editingInfo }: { url: string; alt?: string; editingInfo?: BlockEditingInfo }) {
  const resolved = resolveImageUrl(url);
  
  const content = (
    <figure className="my-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolved}
        alt={alt ?? ''}
        className="max-h-80 w-auto max-w-full rounded-lg object-contain shadow-sm"
      />
      {alt?.trim() && (
        <figcaption className="mt-2 text-center text-sm text-muted-foreground">{alt}</figcaption>
      )}
    </figure>
  );

  if (editingInfo) {
    return (
      <div className="relative rounded-lg border-2 border-primary/40 bg-primary/5 px-3 py-2">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-medium text-primary">
            {editingInfo.userName} is editing...
          </span>
        </div>
        <div className="opacity-60">{content}</div>
      </div>
    );
  }

  return content;
}

function Block({
  block,
  blockIndex,
  onTodoToggle,
  editingInfo,
}: {
  block: NoteBlock;
  blockIndex: number;
  onTodoToggle?: (blockIndex: number, itemIndex: number) => void;
  editingInfo?: BlockEditingInfo;
}) {
  const blockWithId = block as NoteBlock & { id?: string };
  const blockId = blockWithId.id;

  switch (block.type) {
    case 'paragraph':
      return <ParagraphBlock text={block.text} editingInfo={editingInfo} />;
    case 'bulletList':
      return <BulletListBlock items={block.items} editingInfo={editingInfo} />;
    case 'todoList':
      return (
        <TodoListBlock
          title={block.title}
          items={block.items}
          onToggle={onTodoToggle ? (itemIndex) => onTodoToggle(blockIndex, itemIndex) : undefined}
          editingInfo={editingInfo}
        />
      );
    case 'image':
      return <ImageBlock url={block.url} alt={block.alt} editingInfo={editingInfo} />;
    default:
      return null;
  }
}

interface NoteViewProps {
  content: NoteContent | null;
  emptyMessage?: string;
  onContentChange?: (content: NoteContent) => void;
  editingBlocks?: Map<string, BlockEditingInfo>;
}

export default function NoteView({
  content,
  emptyMessage = 'No content.',
  onContentChange,
  editingBlocks = new Map(),
}: NoteViewProps) {
  const blocks = content?.blocks ?? [];

  const handleTodoToggle = (blockIndex: number, itemIndex: number) => {
    if (!content || !onContentChange) return;
    const block = blocks[blockIndex];
    if (block?.type !== 'todoList') return;
    
    // Don't allow toggling if someone else is editing
    const blockWithId = block as NoteBlock & { id?: string };
    if (blockWithId.id && editingBlocks.has(blockWithId.id)) return;
    
    const newItems = block.items.map((item, i) =>
      i === itemIndex ? { ...item, done: !item.done } : item
    );
    const newBlocks = blocks.map((b, i) =>
      i === blockIndex ? { ...b, items: newItems } : b
    );
    onContentChange({ blocks: newBlocks });
  };

  if (blocks.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">{emptyMessage}</p>
    );
  }

  return (
    <article className="space-y-6">
      {blocks.map((block, index) => {
        const blockWithId = block as NoteBlock & { id?: string };
        const blockId = blockWithId.id;
        const editingInfo = blockId ? editingBlocks.get(blockId) : undefined;
        
        return (
          <section key={blockId || index} className="min-w-0">
            <Block 
              block={block} 
              blockIndex={index} 
              onTodoToggle={handleTodoToggle}
              editingInfo={editingInfo}
            />
          </section>
        );
      })}
    </article>
  );
}
