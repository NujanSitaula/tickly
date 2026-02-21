import * as Y from 'yjs';
import type { NoteContent, NoteBlock } from './api';

/**
 * Yjs document structure:
 * - Y.Map('meta') for document metadata (title, etc.)
 * - Y.Array('blocks') for blocks array
 * - Each block is a Y.Map with type-specific fields
 */

/**
 * Convert Yjs document to NoteContent format
 */
/**
 * Clean up duplicate blocks and invalid blocks in Yjs document (keeps first occurrence of each ID)
 */
export function cleanupDuplicateBlocks(yDoc: Y.Doc): number {
  const blocks = yDoc.getArray<Y.Map<any>>('blocks');
  const seenIds = new Set<string>();
  const indicesToRemove: number[] = [];
  
  // Find duplicate blocks and invalid blocks (keep first occurrence of valid blocks)
  for (let i = 0; i < blocks.length; i++) {
    const blockMap = blocks.get(i);
    if (!blockMap) {
      indicesToRemove.push(i);
      continue;
    }
    
    const blockType = blockMap.get('type');
    const blockId = blockMap.get('id') as string | undefined;
    
    // Remove blocks without type
    if (!blockType) {
      indicesToRemove.push(i);
      continue;
    }
    
    // Remove duplicate blocks (keep first occurrence)
    if (blockId) {
      if (seenIds.has(blockId)) {
        indicesToRemove.push(i);
      } else {
        seenIds.add(blockId);
      }
    } else {
      // Blocks without ID should also be removed (they're invalid)
      indicesToRemove.push(i);
    }
  }
  
  // Remove duplicates and invalid blocks in reverse order to maintain indices
  if (indicesToRemove.length > 0) {
    yDoc.transact(() => {
      for (let i = indicesToRemove.length - 1; i >= 0; i--) {
        blocks.delete(indicesToRemove[i], 1);
      }
    });
    console.log(`Cleaned up ${indicesToRemove.length} duplicate/invalid blocks`);
  }
  
  return indicesToRemove.length;
}

export function yjsToNoteContent(yDoc: Y.Doc): NoteContent {
  const blocks = yDoc.getArray<Y.Map<any>>('blocks');
  const noteBlocks: NoteBlock[] = [];
  const seenIds = new Set<string>(); // Track IDs to prevent duplicates

  for (let i = 0; i < blocks.length; i++) {
    const blockMap = blocks.get(i);
    if (!blockMap) continue;

    const type = blockMap.get('type') as string;
    if (!type) {
      // Skip blocks without a type (might be in transition)
      console.warn('Block at index', i, 'has no type, skipping');
      continue;
    }

    const blockId = blockMap.get('id') as string | undefined;
    
    // Skip blocks with duplicate IDs (keep first occurrence)
    if (blockId && seenIds.has(blockId)) {
      console.warn('Duplicate block ID detected in Yjs:', blockId, 'at index', i, 'skipping duplicate');
      continue;
    }
    if (blockId) {
      seenIds.add(blockId);
    }

    switch (type) {
      case 'paragraph': {
        const text = blockMap.get('text') || '';
        const block: NoteBlock & { id?: string } = { type: 'paragraph', text };
        if (blockId) (block as any).id = blockId;
        noteBlocks.push(block);
        break;
      }
      case 'bulletList': {
        const itemsArray = blockMap.get('items') as Y.Array<Y.Map<any>>;
        const items: string[] = [];
        if (itemsArray) {
          for (let j = 0; j < itemsArray.length; j++) {
            const itemMap = itemsArray.get(j);
            if (itemMap) {
              items.push(itemMap.get('text') || '');
            }
          }
        }
        const block: NoteBlock & { id?: string } = { type: 'bulletList', items };
        if (blockId) (block as any).id = blockId;
        noteBlocks.push(block);
        break;
      }
      case 'todoList': {
        const title = blockMap.get('title') || undefined;
        const itemsArray = blockMap.get('items') as Y.Array<Y.Map<any>>;
        const items: { text: string; done: boolean }[] = [];
        if (itemsArray) {
          for (let j = 0; j < itemsArray.length; j++) {
            const itemMap = itemsArray.get(j);
            if (itemMap) {
              items.push({
                text: itemMap.get('text') || '',
                done: itemMap.get('done') || false,
              });
            }
          }
        }
        const block: NoteBlock & { id?: string } = { type: 'todoList', title, items };
        if (blockId) (block as any).id = blockId;
        noteBlocks.push(block);
        break;
      }
      case 'image': {
        const url = blockMap.get('url') || '';
        const alt = blockMap.get('alt') || undefined;
        const block: NoteBlock & { id?: string } = { type: 'image', url, alt };
        if (blockId) (block as any).id = blockId;
        noteBlocks.push(block);
        break;
      }
      default: {
        // Unknown block type - log warning but don't crash
        console.warn('Unknown block type:', type, 'at index', i);
        break;
      }
    }
  }

  return { blocks: noteBlocks };
}

/**
 * Initialize Yjs document from NoteContent
 */
export function noteContentToYjs(yDoc: Y.Doc, content: NoteContent): void {
  const blocks = yDoc.getArray<Y.Map<any>>('blocks');
  
  // Clear existing blocks
  blocks.delete(0, blocks.length);

  // Add blocks from content
  for (const block of content.blocks) {
    const blockMap = new Y.Map();

    switch (block.type) {
      case 'paragraph': {
        blockMap.set('type', 'paragraph');
        blockMap.set('text', block.text);
        // Store block ID if available
        const blockId = (block as any).id;
        if (blockId) blockMap.set('id', blockId);
        blocks.push([blockMap]);
        break;
      }
      case 'bulletList': {
        blockMap.set('type', 'bulletList');
        const itemsArray = new Y.Array<Y.Map<any>>();
        for (const itemText of block.items) {
          const itemMap = new Y.Map();
          itemMap.set('text', itemText);
          itemsArray.push([itemMap]);
        }
        blockMap.set('items', itemsArray);
        const blockId = (block as any).id;
        if (blockId) blockMap.set('id', blockId);
        blocks.push([blockMap]);
        break;
      }
      case 'todoList': {
        blockMap.set('type', 'todoList');
        if (block.title) {
          blockMap.set('title', block.title);
        }
        const itemsArray = new Y.Array<Y.Map<any>>();
        for (const item of block.items) {
          const itemMap = new Y.Map();
          itemMap.set('text', item.text);
          itemMap.set('done', item.done);
          itemsArray.push([itemMap]);
        }
        blockMap.set('items', itemsArray);
        const blockId = (block as any).id;
        if (blockId) blockMap.set('id', blockId);
        blocks.push([blockMap]);
        break;
      }
      case 'image': {
        blockMap.set('type', 'image');
        blockMap.set('url', block.url);
        if (block.alt) {
          blockMap.set('alt', block.alt);
        }
        const blockId = (block as any).id;
        if (blockId) blockMap.set('id', blockId);
        blocks.push([blockMap]);
        break;
      }
    }
  }
}

/**
 * Get the note title from the Yjs document (real-time synced).
 * Title is stored in Y.Map('meta') as last-write-wins to avoid merge duplication.
 * Migrates from legacy Y.Text('title') if present.
 */
export function getTitleFromYjs(yDoc: Y.Doc): string {
  const meta = yDoc.getMap('meta');
  const fromMeta = meta.get('title');
  if (typeof fromMeta === 'string') return fromMeta;
  // Migrate from legacy Y.Text('title')
  try {
    const legacyTitle = yDoc.getText('title');
    const t = legacyTitle.toString();
    if (t.length > 0) {
      meta.set('title', t);
      return t;
    }
  } catch {
    // no legacy title
  }
  return '';
}

/**
 * Set the note title in the Yjs document (last-write-wins via meta map, no merge duplication).
 */
export function setTitleInYjs(yDoc: Y.Doc, newTitle: string): void {
  const meta = yDoc.getMap('meta');
  const current = meta.get('title');
  if (current === newTitle) return;
  meta.set('title', newTitle);
}

/**
 * Create a new Yjs document initialized with optional content and title
 */
export function initializeYjsDoc(noteId: number, initialContent?: NoteContent, initialTitle?: string): Y.Doc {
  const yDoc = new Y.Doc();

  const meta = yDoc.getMap('meta');
  meta.set('noteId', noteId);
  meta.set('title', initialTitle ?? '');

  if (initialContent) {
    noteContentToYjs(yDoc, initialContent);
  }

  return yDoc;
}

/**
 * Get a block from Yjs document by index
 */
export function getBlockFromYjs(yDoc: Y.Doc, index: number): Y.Map<any> | null {
  const blocks = yDoc.getArray<Y.Map<any>>('blocks');
  if (index < 0 || index >= blocks.length) {
    return null;
  }
  return blocks.get(index) || null;
}

/**
 * Find the index of a block in Yjs document by matching content
 * This is a fallback when we don't have block IDs stored in Yjs
 */
export function findBlockIndexInYjs(yDoc: Y.Doc, targetBlock: NoteBlock, startIndex: number = 0): number {
  const blocks = yDoc.getArray<Y.Map<any>>('blocks');
  
  // Try to find by matching type and content
  for (let i = startIndex; i < blocks.length; i++) {
    const blockMap = blocks.get(i);
    if (!blockMap) continue;
    
    const type = blockMap.get('type');
    if (type !== targetBlock.type) continue;
    
    // For paragraphs, match by text
    if (type === 'paragraph' && targetBlock.type === 'paragraph' && blockMap.get('text') === targetBlock.text) {
      return i;
    }
    
    // For other types, just match by type and position
    // This is not perfect but better than nothing
    if (i === startIndex) {
      return i;
    }
  }
  
  return -1;
}

/**
 * Insert a block into Yjs document at index
 */
export function insertBlockInYjs(yDoc: Y.Doc, index: number, block: NoteBlock): void {
  const blocks = yDoc.getArray<Y.Map<any>>('blocks');
  const blockMap = new Y.Map();

  // Generate ID if not provided
  const blockId = (block as any).id || `block-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  blockMap.set('id', blockId);

  switch (block.type) {
    case 'paragraph': {
      blockMap.set('type', 'paragraph');
      blockMap.set('text', block.text);
      break;
    }
    case 'bulletList': {
      blockMap.set('type', 'bulletList');
      const itemsArray = new Y.Array<Y.Map<any>>();
      for (const itemText of block.items) {
        const itemMap = new Y.Map();
        itemMap.set('text', itemText);
        itemsArray.push([itemMap]);
      }
      blockMap.set('items', itemsArray);
      break;
    }
    case 'todoList': {
      blockMap.set('type', 'todoList');
      if (block.title) {
        blockMap.set('title', block.title);
      }
      const itemsArray = new Y.Array<Y.Map<any>>();
      for (const item of block.items) {
        const itemMap = new Y.Map();
        itemMap.set('text', item.text);
        itemMap.set('done', item.done);
        itemsArray.push([itemMap]);
      }
      blockMap.set('items', itemsArray);
      break;
    }
    case 'image': {
      blockMap.set('type', 'image');
      blockMap.set('url', block.url);
      if (block.alt) {
        blockMap.set('alt', block.alt);
      }
      break;
    }
  }

  blocks.insert(index, [blockMap]);
}

/**
 * Delete a block from Yjs document at index
 */
export function deleteBlockFromYjs(yDoc: Y.Doc, index: number): void {
  const blocks = yDoc.getArray<Y.Map<any>>('blocks');
  blocks.delete(index, 1);
}

/**
 * Move a block in Yjs document from oldIndex to newIndex
 */
export function moveBlockInYjs(yDoc: Y.Doc, oldIndex: number, newIndex: number): void {
  const blocks = yDoc.getArray<Y.Map<any>>('blocks');
  if (oldIndex === newIndex) return;
  
  // Validate indices
  if (oldIndex < 0 || oldIndex >= blocks.length) {
    console.warn('Invalid oldIndex:', oldIndex, 'blocks length:', blocks.length);
    return;
  }
  if (newIndex < 0 || newIndex > blocks.length) {
    console.warn('Invalid newIndex:', newIndex, 'blocks length:', blocks.length);
    return;
  }
  
  const blockMap = blocks.get(oldIndex);
  if (!blockMap) {
    console.warn('Block at oldIndex not found:', oldIndex);
    return;
  }

  const blockType = blockMap.get('type');
  if (!blockType) {
    console.warn('Block at oldIndex has no type:', oldIndex);
    return;
  }

  yDoc.transact(() => {
    const clonedBlock = blockMap.clone();
    blocks.delete(oldIndex, 1);
    // Match dnd-kit arrayMove semantics: insert at the target index.
    // Using (newIndex - 1) for forward moves turns simple swaps into no-ops.
    const targetIndex = newIndex;
    const finalIndex = Math.max(0, Math.min(targetIndex, blocks.length));
    blocks.insert(finalIndex, [clonedBlock]);
  });
}

/**
 * Update a block in Yjs document at index
 */
export function updateBlockInYjs(yDoc: Y.Doc, index: number, block: NoteBlock): void {
  const blocks = yDoc.getArray<Y.Map<any>>('blocks');
  
  // Validate index
  if (index < 0 || index >= blocks.length) {
    console.warn('Invalid block index:', index, 'blocks length:', blocks.length);
    return;
  }
  
  const blockMap = blocks.get(index);
  
  if (!blockMap) {
    console.warn('Block at index', index, 'not found in Yjs document');
    return;
  }

  // Validate block type matches
  const currentType = blockMap.get('type');
  if (currentType !== block.type) {
    console.warn('Block type mismatch at index', index, 'expected:', block.type, 'got:', currentType);
    return;
  }

  // Update based on block type
  switch (block.type) {
    case 'paragraph': {
      blockMap.set('text', block.text || '');
      break;
    }
    case 'bulletList': {
      const itemsArray = blockMap.get('items') as Y.Array<Y.Map<any>>;
      if (itemsArray) {
        itemsArray.delete(0, itemsArray.length);
        for (const itemText of block.items) {
          const itemMap = new Y.Map();
          itemMap.set('text', itemText);
          itemsArray.push([itemMap]);
        }
      }
      break;
    }
    case 'todoList': {
      if (block.title !== undefined) {
        blockMap.set('title', block.title);
      }
      const itemsArray = blockMap.get('items') as Y.Array<Y.Map<any>>;
      if (itemsArray) {
        itemsArray.delete(0, itemsArray.length);
        for (const item of block.items) {
          const itemMap = new Y.Map();
          itemMap.set('text', item.text);
          itemMap.set('done', item.done);
          itemsArray.push([itemMap]);
        }
      }
      break;
    }
    case 'image': {
      blockMap.set('url', block.url);
      if (block.alt !== undefined) {
        blockMap.set('alt', block.alt);
      }
      const blockId = (block as any).id;
      if (blockId) blockMap.set('id', blockId);
      break;
    }
  }
}
