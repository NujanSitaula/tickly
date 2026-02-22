import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { initializeYjsDoc, getTitleFromYjs, setTitleInYjs } from '@/lib/yjs-document';
import type { NoteContent } from '@/lib/api';

const YJS_WEBSOCKET_URL = process.env.NEXT_PUBLIC_YJS_WEBSOCKET_URL || 'ws://localhost:1234';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tickly_token');
}

interface UseYjsProviderOptions {
  noteId: number;
  initialContent?: NoteContent | null;
  initialTitle?: string;
  enabled?: boolean;
}

interface UseYjsProviderReturn {
  yDoc: Y.Doc | null;
  provider: WebsocketProvider | null;
  connected: boolean;
  error: Error | null;
  stateLoaded: boolean;
}

/**
 * Hook to manage Yjs WebSocket provider lifecycle.
 * Single source of truth: fetch /yjs-state once per noteId, apply only when doc is empty.
 */
export function useYjsProvider({
  noteId,
  initialContent,
  initialTitle,
  enabled = true,
}: UseYjsProviderOptions): UseYjsProviderReturn {
  const [yDoc, setYDoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [stateLoaded, setStateLoaded] = useState(false);
  const initializedRef = useRef(false);
  const stateLoadingRef = useRef(false);
  const fetchedForNoteIdRef = useRef<number | null>(null);
  const prevNoteIdRef = useRef<number>(noteId);
  const docNoteIdRef = useRef<number | null>(null);
  const initialTitleRef = useRef(initialTitle);
  initialTitleRef.current = initialTitle;

  // When noteId changes: reset refs, destroy previous provider/doc, so we init once per new noteId
  useEffect(() => {
    if (!enabled) return;
    if (prevNoteIdRef.current !== noteId) {
      prevNoteIdRef.current = noteId;
      initializedRef.current = false;
      stateLoadingRef.current = false;
      fetchedForNoteIdRef.current = null;
      setProvider((prev) => {
        if (prev) {
          prev.destroy();
        }
        return null;
      });
      setYDoc(null);
      setStateLoaded(false);
      setConnected(false);
      docNoteIdRef.current = null;
    }
  }, [noteId, enabled]);

  // Create Y.Doc once per noteId (empty; server state applied only if doc empty in loadInitialState)
  useEffect(() => {
    if (!enabled || noteId <= 0) return;
    if (initializedRef.current) return;

    const doc = initializeYjsDoc(noteId, undefined, undefined);
    docNoteIdRef.current = noteId;
    setYDoc(doc);
    initializedRef.current = true;
    setStateLoaded(true);

    return () => {
      // Cleanup doc only when noteId changes (handled above) or unmount
    };
  }, [noteId, enabled]);

  // WebSocket provider: depends only on noteId, enabled, yDoc (stable deps; no initialContent/stateLoaded)
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

  // Fetch /yjs-state once per noteId; apply only when doc is empty (do not overwrite WebSocket-synced state)
  useEffect(() => {
    if (!yDoc || !enabled || noteId <= 0) return;
    if (docNoteIdRef.current !== noteId) return;
    if (fetchedForNoteIdRef.current === noteId) return;

    const loadInitialState = async () => {
      if (fetchedForNoteIdRef.current === noteId) return;
      fetchedForNoteIdRef.current = noteId;
      stateLoadingRef.current = true;

      try {
        const token = getToken();
        if (!token) return;

        const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
        const response = await fetch(`${API_URL}/notes/${noteId}/yjs-state`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const binaryState = await response.arrayBuffer();
          if (binaryState.byteLength > 0) {
            const blocks = yDoc.getArray('blocks');
            if (blocks.length === 0) {
              Y.applyUpdate(yDoc, new Uint8Array(binaryState));
              getTitleFromYjs(yDoc);
            }
          }
        } else if (response.status === 404) {
          const title = getTitleFromYjs(yDoc);
          if (title.length === 0 && initialTitleRef.current != null) {
            setTitleInYjs(yDoc, initialTitleRef.current);
          }
        }
      } catch (err) {
        console.error('Failed to load Yjs state:', err);
        fetchedForNoteIdRef.current = null;
        const title = getTitleFromYjs(yDoc);
        if (title.length === 0 && initialTitleRef.current != null) {
          setTitleInYjs(yDoc, initialTitleRef.current);
        }
      } finally {
        stateLoadingRef.current = false;
      }
    };

    loadInitialState();
  }, [noteId, yDoc, enabled]);

  return {
    yDoc,
    provider,
    connected,
    error,
    stateLoaded,
  };
}
