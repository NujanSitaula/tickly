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
 * Hook to manage Yjs WebSocket provider lifecycle
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

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Seed doc with initialContent and initialTitle for instant display; server state will sync in background
    if (!initializedRef.current) {
      const doc = initializeYjsDoc(noteId, initialContent ?? undefined, initialTitle);
      setYDoc(doc);
      initializedRef.current = true;
      setStateLoaded(true); // Connect immediately; server state will be applied in background
    }

    const doc = yDoc;
    if (!doc) return;

    if (!stateLoaded) {
      return;
    }

    // Get authentication token
    const token = getToken();
    if (!token) {
      setError(new Error('No authentication token found'));
      return;
    }

    // Create WebSocket URL (without token - token goes in params)
    const wsUrl = `${YJS_WEBSOCKET_URL}/notes/${noteId}`;

    // Create WebSocket provider with token in params
    const wsProvider = new WebsocketProvider(wsUrl, `note-${noteId}`, doc, {
      connect: true,
      resyncInterval: 5000,
      // Pass token as query parameter
      params: {
        token: token,
      },
    });

    // Handle connection events
    wsProvider.on('status', (event: { status: 'connecting' | 'connected' | 'disconnected' }) => {
      setConnected(event.status === 'connected');
      if (event.status === 'connected') {
        setError(null);
      }
    });

    // Handle connection errors (signature: event, provider)
    wsProvider.on('connection-error', (event: unknown, _provider?: WebsocketProvider) => {
      const err = (event as { error?: Error })?.error;
      if (err) {
        console.error('Yjs WebSocket connection error:', err);
        setError(err);
      }
    });

    // Handle connection close
    wsProvider.on('connection-close', () => {
      setConnected(false);
    });

    setProvider(wsProvider);

    // Cleanup on unmount
    return () => {
      if (wsProvider) {
        wsProvider.destroy();
      }
    };
  }, [noteId, enabled, yDoc, initialContent, stateLoaded]);

  // Load server state in background and apply when ready (doc already seeded with initialContent for instant display)
  useEffect(() => {
    if (!yDoc || !enabled || stateLoadingRef.current) return;

    const loadInitialState = async () => {
      if (stateLoadingRef.current) return;
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
            Y.applyUpdate(yDoc, new Uint8Array(binaryState));
            getTitleFromYjs(yDoc); // migrate legacy title if present
          }
        } else if (response.status === 404) {
          if (getTitleFromYjs(yDoc).length === 0 && initialTitle != null) {
            setTitleInYjs(yDoc, initialTitle);
          }
        }
      } catch (err) {
        console.error('Failed to load Yjs state:', err);
        if (getTitleFromYjs(yDoc).length === 0 && initialTitle != null) {
          setTitleInYjs(yDoc, initialTitle);
        }
      }
    };

    loadInitialState();
  }, [noteId, yDoc, enabled, initialTitle]);

  return {
    yDoc,
    provider,
    connected,
    error,
    stateLoaded,
  };
}
