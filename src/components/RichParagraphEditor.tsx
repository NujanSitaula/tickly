'use client';

import { isTextSelection } from '@tiptap/core';
import { Underline as UnderlineExtension } from '@tiptap/extension-underline';
import { useEditor, EditorContent, Tiptap, type Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';
import { Bold, Code, Heading1, Heading2, Heading3, Italic, Redo2, Type, Undo2, Underline } from 'lucide-react';
import { useEffect, useRef, useMemo } from 'react';

function isHtml(text: string): boolean {
  return typeof text === 'string' && text.trim().includes('<');
}

function BubbleFormatToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-background px-1 py-1 shadow-lg ring-1 ring-border">
      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:pointer-events-none"
        aria-label="Undo"
        title="Undo"
      >
        <Undo2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:pointer-events-none"
        aria-label="Redo"
        title="Redo"
      >
        <Redo2 className="h-4 w-4" />
      </button>
      <span className="mr-1 border-r border-border pr-1 text-xs text-muted-foreground">Format</span>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${editor.isActive('bold') ? 'bg-muted text-foreground' : ''}`}
        aria-label="Bold"
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${editor.isActive('italic') ? 'bg-muted text-foreground' : ''}`}
        aria-label="Italic"
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${editor.isActive('underline') ? 'bg-muted text-foreground' : ''}`}
        aria-label="Underline"
        title="Underline"
      >
        <Underline className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={`rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${editor.isActive('code') ? 'bg-muted text-foreground' : ''}`}
        aria-label="Code"
        title="Code"
      >
        <Code className="h-4 w-4" />
      </button>
      <span className="ml-1 border-l border-border pl-1 text-xs text-muted-foreground">Block</span>
      <button
        type="button"
        onClick={() => editor.chain().focus().setParagraph().run()}
        className={`rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${editor.isActive('paragraph') ? 'bg-muted text-foreground' : ''}`}
        aria-label="Paragraph"
        title="Paragraph"
      >
        <Type className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${editor.isActive('heading', { level: 1 }) ? 'bg-muted text-foreground' : ''}`}
        aria-label="Heading 1"
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${editor.isActive('heading', { level: 2 }) ? 'bg-muted text-foreground' : ''}`}
        aria-label="Heading 2"
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${editor.isActive('heading', { level: 3 }) ? 'bg-muted text-foreground' : ''}`}
        aria-label="Heading 3"
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </button>
    </div>
  );
}

interface RichParagraphEditorProps {
  content: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  onRemove?: () => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  // Yjs collaboration props (optional)
  yDoc?: Y.Doc | null;
  provider?: WebsocketProvider | null;
  blockId?: string; // ID of the block this paragraph belongs to
  user?: { name: string; color?: string };
}

export default function RichParagraphEditor({
  content,
  onChange,
  readOnly = false,
  placeholder = 'Paragraph…',
  onFocus,
  onBlur,
  yDoc,
  provider,
  blockId,
  user,
}: RichParagraphEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onFocusRef = useRef(onFocus);
  onFocusRef.current = onFocus;
  const onBlurRef = useRef(onBlur);
  onBlurRef.current = onBlur;
  
  // Track if content update is from Yjs (external) or user (internal)
  const isInternalUpdateRef = useRef(false);

  // Build extensions array - ensure it's stable
  const extensions = useMemo(() => {
    const baseExtensions = [
      StarterKit.configure({
        paragraph: { HTMLAttributes: { class: 'm-0' } },
        heading: { levels: [1, 2, 3], HTMLAttributes: { class: 'font-semibold tracking-tight' } },
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        underline: false, // Disable underline in StarterKit since we're adding it separately
      }),
      UnderlineExtension,
    ];

    // Add CollaborationCaret extension if provider and user are available
    // Note: For block-based editing, we sync at the block level, not paragraph HTML level
    // Collaboration extension would require a separate Yjs XML fragment per paragraph
    // For now, we'll skip it and rely on block-level sync via Yjs
    // CollaborationCaret can work for cursor awareness, but temporarily disabled to debug crashes
    // TODO: Re-enable once block-level syncing is stable
    // if (provider && user && !readOnly && provider.awareness) {
    //   try {
    //     baseExtensions.push(
    //       CollaborationCaret.configure({
    //         provider,
    //         user: {
    //           name: user.name || 'User',
    //           color: user.color || `#${Math.floor(Math.random() * 16777215).toString(16)}`,
    //         },
    //       })
    //     );
    //   } catch (error) {
    //     console.warn('Failed to add CollaborationCaret extension:', error);
    //   }
    // }

    return baseExtensions;
  }, [provider, user, readOnly]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: isHtml(content) ? content : content ? `<p>${escapeHtml(content)}</p>` : '<p></p>',
    editable: !readOnly,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none min-h-[2.5rem] w-full border-0 bg-transparent p-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 [&_p]:m-0 [&_h1]:mt-0 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-0 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-0 [&_h3]:text-lg [&_h3]:font-semibold [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm',
      },
      handleDOMEvents: {
        focus: () => {
          onFocusRef.current?.();
        },
        blur: () => {
          const html = editor?.getHTML();
          if (html && html !== '<p></p>') onChangeRef.current(html);
          onBlurRef.current?.();
        },
      },
    },
    onUpdate: ({ editor }) => {
      // Only trigger onChange if this is a user-initiated update (not from Yjs sync)
      if (!isInternalUpdateRef.current) {
        onChangeRef.current(editor.getHTML());
      }
    },
  });

  useEffect(() => {
    if (!editor) return;
    
    // Skip update if editor is focused (user is typing)
    if (editor.isFocused) {
      return;
    }
    
    const target = isHtml(content) ? content : content ? `<p>${escapeHtml(content)}</p>` : '<p></p>';
    const current = editor.getHTML();
    
    // Normalize HTML for comparison (remove whitespace differences)
    const normalizeHtml = (html: string) => html.replace(/\s+/g, ' ').trim();
    const normalizedTarget = normalizeHtml(target);
    const normalizedCurrent = normalizeHtml(current);
    
    if (normalizedTarget !== normalizedCurrent) {
      // Mark as internal update to prevent feedback loop
      isInternalUpdateRef.current = true;
      try {
        editor.commands.setContent(target, { emitUpdate: false });
      } catch (error) {
        console.warn('Failed to set editor content:', error);
      }
      // Reset flag after update completes
      requestAnimationFrame(() => {
        isInternalUpdateRef.current = false;
      });
    }
  }, [content, editor]);

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [readOnly, editor]);

  if (readOnly) {
    return (
      <div className="group flex gap-2">
        <div className="min-h-[2.5rem] flex-1">
          {content && isHtml(content) ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-foreground [&_p]:m-0 [&_h1]:mt-0 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-0 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-0 [&_h3]:text-lg [&_h3]:font-semibold [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <p className="whitespace-pre-wrap text-foreground">{content || '\u00A0'}</p>
          )}
        </div>
      </div>
    );
  }

  if (!editor) {
    return <div className="min-h-[2.5rem] flex-1" />;
  }

  return (
    <Tiptap editor={editor}>
      {!readOnly && (
        <BubbleMenu
          editor={editor}
          options={{ placement: 'top' }}
          shouldShow={({ state }) => {
            const sel = state.selection;
            return isTextSelection(sel) && sel.from !== sel.to;
          }}
          className="z-50"
        >
          <BubbleFormatToolbar editor={editor} />
        </BubbleMenu>
      )}
      <div className="min-h-[2.5rem] flex-1">
        <EditorContent editor={editor} />
      </div>
    </Tiptap>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
