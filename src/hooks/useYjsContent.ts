import { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { yjsToNoteContent, getTitleFromYjs } from '@/lib/yjs-document';
import type { NoteContent, NoteBlock } from '@/lib/api';

export type NoteViewer = {
  clientId: number;
  userId: number;
  userName: string;
  avatarUrl?: string | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const YJS_WEBSOCKET_URL = process.env.NEXT_PUBLIC_YJS_WEBSOCKET_URL || 'ws://localhost:1234';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tickly_token');
}

/**
 * Normalize content to ensure bullet list items are strings (not objects)
 */
function normalizeContentForView(content: NoteContent | null): NoteContent | null {
  if (!content || !content.blocks) return content;
  
  return {
    blocks: content.blocks.map((block): NoteBlock => {
      if (block.type === 'bulletList') {
        // Ensure items are strings, not objects
        const items = block.items.map((item) => 
          typeof item === 'string' ? item : (item as any).text || String(item)
        );
        return { ...block, items };
      }
      return block;
    }),
  };
}

export type BlockEditingInfo = {
  blockId: string;
  userId: number;
  userName: string;
};

/**
 * Hook to load Yjs state and subscribe to real-time updates for viewing
 */
export function useYjsContent(
  noteId: number,
  fallbackContent: NoteContent | null,
  user?: { id: number; name?: string | null; email?: string; avatar_url?: string | null } | null,
  enabled = true
): {
  content: NoteContent | null;
  title: string;
  loading: boolean;
  editingBlocks: Map<string, BlockEditingInfo>;
  otherViewers: NoteViewer[];
} {
  const [content, setContent] = useState<NoteContent | null>(fallbackContent);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingBlocks, setEditingBlocks] = useState<Map<string, BlockEditingInfo>>(new Map());
  const [otherViewers, setOtherViewers] = useState<NoteViewer[]>([]);
  const yDocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!enabled || noteId <= 0) {
      setContent(normalizeContentForView(fallbackContent));
      setTitle('');
      setLoading(false);
      setOtherViewers([]);
      return;
    }
    let mounted = true;
    let updateHandler: (() => void) | null = null;
    let titleUnobserve: (() => void) | null = null;
    let presenceIntervalId: ReturnType<typeof setInterval> | null = null;

    // Cleanup previous connection if it exists
    const prevProvider = providerRef.current;
    
    if (prevProvider) {
      prevProvider.destroy();
      providerRef.current = null;
    }
    // Clear yDoc ref - new one will be created
    yDocRef.current = null;

    const initializeYjs = async () => {
      try {
        const token = getToken();
        if (!token) {
          if (mounted) {
            setContent(normalizeContentForView(fallbackContent));
            setLoading(false);
          }
          return;
        }

        // Create Yjs document and connect immediately so presence appears fast
        const yDoc = new Y.Doc();
        yDocRef.current = yDoc;

        const wsUrl = `${YJS_WEBSOCKET_URL}/notes/${noteId}`;
        const provider = new WebsocketProvider(wsUrl, `note-${noteId}`, yDoc, {
          reconnect: true,
          resyncInterval: 5000,
          params: { token },
        });
        providerRef.current = provider;

        const setOurPresence = () => {
          if (provider.awareness && user) {
            provider.awareness.setLocalStateField('noteId', noteId);
            provider.awareness.setLocalStateField('userId', user.id);
            provider.awareness.setLocalStateField('userName', user.name || user.email || 'User');
            provider.awareness.setLocalStateField('userAvatar', user.avatar_url ?? null);
          }
        };
        setOurPresence();

        // Subscribe to doc updates
        const handleUpdate = () => {
          if (!mounted || !yDocRef.current) return;
          const updatedContent = yjsToNoteContent(yDocRef.current);
          if (updatedContent.blocks.length > 0) {
            setContent(normalizeContentForView(updatedContent));
          }
        };
        updateHandler = handleUpdate;
        yDoc.on('update', handleUpdate);

        const meta = yDoc.getMap('meta');
        const updateTitle = () => {
          if (mounted && yDocRef.current) setTitle(getTitleFromYjs(yDocRef.current));
        };
        const titleObserver = () => updateTitle();
        meta.observe(titleObserver);
        titleUnobserve = () => meta.unobserve(titleObserver);
        updateTitle();

        // Track block editors and other viewers (one avatar per user)
        const updateEditingBlocks = () => {
          if (!mounted || !provider.awareness) return;

          const editingMap = new Map<string, BlockEditingInfo>();
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
              editingMap.set(blockId, { blockId, userId, userName });
            }
            if (stateNoteId === noteId && userId && userName) {
              const existing = viewersByUser.get(userId);
              const avatarUrl = userAvatar ?? undefined;
              if (!existing || (avatarUrl && !existing.avatarUrl)) {
                viewersByUser.set(userId, { clientId, userId, userName, avatarUrl });
              }
            }
          });

          // Include current user so everyone viewing (including you) is shown
          if (user && !viewersByUser.has(user.id)) {
            viewersByUser.set(user.id, {
              clientId: provider.awareness.clientID,
              userId: user.id,
              userName: user.name || user.email || 'User',
              avatarUrl: user.avatar_url ?? undefined,
            });
          }

          setEditingBlocks(editingMap);
          setOtherViewers(Array.from(viewersByUser.values()));
        };

        provider.awareness.on('change', updateEditingBlocks);
        updateEditingBlocks();

        // Re-set presence when WebSocket connects so others see us as soon as we join
        provider.on('status', (event: { status: string }) => {
          if (event.status === 'connected') {
            setOurPresence();
            if (mounted) updateEditingBlocks();
          }
        });

        // Poll for presence so we catch joiners even if awareness 'change' is delayed or missed
        presenceIntervalId = setInterval(() => {
          if (mounted && providerRef.current?.awareness) updateEditingBlocks();
        }, 1500);

        // Show UI immediately so header (and presence avatars) appear without waiting for state fetch
        if (mounted) {
          setContent(normalizeContentForView(fallbackContent));
          setLoading(false);
        }

        // Load initial state in background and apply when ready
        const response = await fetch(`${API_URL}/notes/${noteId}/yjs-state`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (mounted && yDocRef.current) {
          if (response.ok) {
            const binaryState = await response.arrayBuffer();
            if (binaryState.byteLength > 0) {
              Y.applyUpdate(yDocRef.current, new Uint8Array(binaryState));
              getTitleFromYjs(yDocRef.current); // migrate legacy title if present
            }
          }
          const initialContent = yjsToNoteContent(yDocRef.current);
          if (initialContent.blocks.length > 0) {
            setContent(normalizeContentForView(initialContent));
          }
        }
      } catch (err) {
        console.error('Failed to initialize Yjs for viewing:', err);
        if (mounted) {
          setContent(normalizeContentForView(fallbackContent));
          setLoading(false);
        }
      }
    };

    initializeYjs();

    // Cleanup on unmount or dependency change
    return () => {
      mounted = false;
      titleUnobserve?.();
      if (presenceIntervalId) clearInterval(presenceIntervalId);
      if (updateHandler && yDocRef.current) {
        yDocRef.current.off('update', updateHandler);
      }
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
      if (yDocRef.current) {
        yDocRef.current = null;
      }
    };
  }, [noteId, fallbackContent, user?.id, user?.name, user?.email, user?.avatar_url, enabled]);

  return { 
    content: normalizeContentForView(content), 
    title,
    loading,
    editingBlocks,
    otherViewers,
  };
}
