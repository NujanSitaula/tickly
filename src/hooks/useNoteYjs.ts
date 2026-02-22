import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import {
  initializeYjsDoc,
  getTitleFromYjs,
  setTitleInYjs,
  yjsToNoteContent,
} from '@/lib/yjs-document';
import type { NoteContent, NoteBlock } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const YJS_WEBSOCKET_URL = process.env.NEXT_PUBLIC_YJS_WEBSOCKET_URL || 'ws://localhost:1234';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tickly_token');
}

function normalizeContentForView(content: NoteContent | null): NoteContent | null {
  if (!content || !content.blocks) return content;
  return {
    blocks: content.blocks.map((block): NoteBlock => {
      if (block.type === 'bulletList') {
        const items = block.items.map((item) =>
          typeof item === 'string' ? item : (item as { text?: string })?.text ?? String(item)
        );
        return { ...block, items };
      }
      return block;
    }),
  };
}

export type NoteViewer = {
  clientId: number;
  userId: number;
  userName: string;
  avatarUrl?: string | null;
};

export type BlockEditingInfo = {
  blockId: string;
  userId: number;
  userName: string;
};

export interface UseNoteYjsOptions {
  noteId: number;
  initialTitle?: string;
  user?: { id: number; name?: string | null; email?: string; avatar_url?: string | null } | null;
  enabled?: boolean;
}

export interface UseNoteYjsReturn {
  yDoc: Y.Doc | null;
  provider: WebsocketProvider | null;
  content: NoteContent | null;
  title: string;
  loading: boolean;
  stateLoaded: boolean;
  connected: boolean;
  error: Error | null;
  editingBlocks: Map<string, BlockEditingInfo>;
  otherViewers: NoteViewer[];
  /** True when GET /yjs-state returned 404 (no Yjs state on server); use for migration. */
  yjsStateNotFound: boolean;
}

/**
 * Shared Yjs source per noteId. One Y.Doc, one fetch, apply only when doc empty.
 * Use for both view and edit: pass yDoc/provider to NoteEditor when editing; use content/title for NoteView when viewing.
 */
export function useNoteYjs({
  noteId,
  initialTitle,
  user,
  enabled = true,
}: UseNoteYjsOptions): UseNoteYjsReturn {
  const [yDoc, setYDoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [content, setContent] = useState<NoteContent | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [stateLoaded, setStateLoaded] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [editingBlocks, setEditingBlocks] = useState<Map<string, BlockEditingInfo>>(new Map());
  const [otherViewers, setOtherViewers] = useState<NoteViewer[]>([]);
  const [yjsStateNotFound, setYjsStateNotFound] = useState(false);

  const initializedRef = useRef(false);
  const fetchedForNoteIdRef = useRef<number | null>(null);
  const prevNoteIdRef = useRef<number>(noteId);
  const docNoteIdRef = useRef<number | null>(null);
  const initialTitleRef = useRef(initialTitle);
  const userRef = useRef(user);
  initialTitleRef.current = initialTitle;
  userRef.current = user;

  // When noteId changes: reset refs, destroy previous provider/doc
  useEffect(() => {
    if (!enabled) return;
    if (prevNoteIdRef.current !== noteId) {
      prevNoteIdRef.current = noteId;
      initializedRef.current = false;
      fetchedForNoteIdRef.current = null;
      docNoteIdRef.current = null;
      setYjsStateNotFound(false);
      setProvider((prev) => {
        if (prev) prev.destroy();
        return null;
      });
      setYDoc(null);
      setStateLoaded(false);
      setConnected(false);
      setContent(null);
      setTitle('');
      setLoading(true);
    }
  }, [noteId, enabled]);

  // Create Y.Doc once per noteId (empty)
  useEffect(() => {
    if (!enabled || noteId <= 0) return;
    if (initializedRef.current) return;

    const doc = initializeYjsDoc(noteId, undefined, undefined);
    docNoteIdRef.current = noteId;
    setYDoc(doc);
    initializedRef.current = true;
    setStateLoaded(true);
  }, [noteId, enabled]);

  // WebSocket provider
  useEffect(() => {
    if (!enabled || !yDoc) return;

    const token = getToken();
    if (!token) {
      setError(new Error('No authentication token found'));
      return;
    }

    const wsUrl = `${YJS_WEBSOCKET_URL}/notes/${noteId}`;
    const wsProvider = new WebsocketProvider(wsUrl, `note-${noteId}`, yDoc, {
      connect: true,
      resyncInterval: 5000,
      params: { token },
    });

    wsProvider.on('status', (event: { status: 'connecting' | 'connected' | 'disconnected' }) => {
      setConnected(event.status === 'connected');
      if (event.status === 'connected') setError(null);
    });
    wsProvider.on('connection-error', (event: unknown, _provider?: WebsocketProvider) => {
      const err = (event as { error?: Error })?.error;
      if (err) {
        console.error('Yjs WebSocket connection error:', err);
        setError(err);
      }
    });
    wsProvider.on('connection-close', () => setConnected(false));

    setProvider(wsProvider);
    return () => {
      wsProvider.destroy();
    };
  }, [noteId, enabled, yDoc]);

  // Fetch /yjs-state once per noteId; apply only when doc is empty
  useEffect(() => {
    if (!yDoc || !enabled || noteId <= 0) return;
    if (docNoteIdRef.current !== noteId) return;
    if (fetchedForNoteIdRef.current === noteId) return;

    const loadInitialState = async () => {
      if (fetchedForNoteIdRef.current === noteId) return;
      fetchedForNoteIdRef.current = noteId;

      try {
        const token = getToken();
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_URL}/notes/${noteId}/yjs-state`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          setYjsStateNotFound(false);
          const binaryState = await response.arrayBuffer();
          if (binaryState.byteLength > 0) {
            const blocks = yDoc.getArray('blocks');
            if (blocks.length === 0) {
              Y.applyUpdate(yDoc, new Uint8Array(binaryState));
              getTitleFromYjs(yDoc);
            }
          }
        } else if (response.status === 404) {
          setYjsStateNotFound(true);
          const currentTitle = getTitleFromYjs(yDoc);
          if (currentTitle.length === 0 && initialTitleRef.current != null) {
            setTitleInYjs(yDoc, initialTitleRef.current);
          }
        } else {
          setYjsStateNotFound(false);
        }
      } catch (err) {
        console.error('Failed to load Yjs state:', err);
        fetchedForNoteIdRef.current = null;
        const currentTitle = getTitleFromYjs(yDoc);
        if (currentTitle.length === 0 && initialTitleRef.current != null) {
          setTitleInYjs(yDoc, initialTitleRef.current);
        }
      } finally {
        setLoading(false);
      }
    };

    loadInitialState();
  }, [noteId, yDoc, enabled]);

  // Subscribe to yDoc for content/title; subscribe to provider for presence
  useEffect(() => {
    if (!yDoc || !provider) return;

    const handleUpdate = () => {
      const updatedContent = yjsToNoteContent(yDoc);
      setContent(normalizeContentForView(updatedContent));
    };
    yDoc.on('update', handleUpdate);
    handleUpdate();

    const meta = yDoc.getMap('meta');
    const updateTitle = () => setTitle(getTitleFromYjs(yDoc));
    meta.observe(updateTitle);
    updateTitle();

    const setOurPresence = () => {
      const u = userRef.current;
      if (provider.awareness && u) {
        provider.awareness.setLocalStateField('noteId', noteId);
        provider.awareness.setLocalStateField('userId', u.id);
        provider.awareness.setLocalStateField('userName', u.name || u.email || 'User');
        provider.awareness.setLocalStateField('userAvatar', u.avatar_url ?? null);
      }
    };
    setOurPresence();

    const updateEditingBlocks = () => {
      if (!provider.awareness) return;
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
      const u = userRef.current;
      if (u && !viewersByUser.has(u.id)) {
        viewersByUser.set(u.id, {
          clientId: provider.awareness.clientID,
          userId: u.id,
          userName: u.name || u.email || 'User',
          avatarUrl: u.avatar_url ?? undefined,
        });
      }
      setEditingBlocks(editingMap);
      setOtherViewers(Array.from(viewersByUser.values()));
    };
    provider.awareness.on('change', updateEditingBlocks);
    updateEditingBlocks();

    provider.on('status', (event: { status: string }) => {
      if (event.status === 'connected') {
        setOurPresence();
        updateEditingBlocks();
      }
    });

    const presenceIntervalId = setInterval(updateEditingBlocks, 1500);

    return () => {
      yDoc.off('update', handleUpdate);
      meta.unobserve(updateTitle);
      clearInterval(presenceIntervalId);
    };
  }, [yDoc, provider, noteId]);

  return {
    yDoc,
    provider,
    content: normalizeContentForView(content),
    title,
    loading,
    stateLoaded,
    connected,
    error,
    editingBlocks,
    otherViewers,
    yjsStateNotFound,
  };
}
