import { PDFDocument, PDFName, PDFDict, PDFRef, PDFString, PDFArray, PDFNumber } from 'pdf-lib';
import type { BookmarkItem } from './types';

function generateId(): string {
  return 'bm_' + Math.random().toString(36).slice(2, 10);
}

/**
 * Traverses bookmark tree to find a node by ID.
 */
export function findBookmark(tree: BookmarkItem[], id: string): BookmarkItem | null {
  for (const item of tree) {
    if (item.id === id) return item;
    if (item.children && item.children.length > 0) {
      const found = findBookmark(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Flattens bookmark tree into a linear list with depth indicators.
 */
export function flattenBookmarks(
  tree: BookmarkItem[],
  depth = 0
): Array<{ item: BookmarkItem; depth: number }> {
  const result: Array<{ item: BookmarkItem; depth: number }> = [];
  for (const item of tree) {
    result.push({ item, depth });
    if (item.children && item.children.length > 0) {
      result.push(...flattenBookmarks(item.children, depth + 1));
    }
  }
  return result;
}

/**
 * Adds a new bookmark to the tree under targetParentId (or top-level if null).
 */
export function addBookmark(
  tree: BookmarkItem[],
  targetParentId: string | null,
  newBookmark: Omit<BookmarkItem, 'id'> & { id?: string }
): { tree: BookmarkItem[]; created: BookmarkItem } {
  const created: BookmarkItem = {
    ...newBookmark,
    id: newBookmark.id ?? generateId(),
    children: newBookmark.children ?? []
  };

  if (!targetParentId) {
    return {
      tree: [...tree, created],
      created
    };
  }

  function insertInto(nodes: BookmarkItem[]): BookmarkItem[] {
    return nodes.map((node) => {
      if (node.id === targetParentId) {
        return {
          ...node,
          children: [...(node.children ?? []), created]
        };
      }
      if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: insertInto(node.children)
        };
      }
      return node;
    });
  }

  return {
    tree: insertInto(tree),
    created
  };
}

/**
 * Updates a bookmark's properties.
 */
export function updateBookmark(
  tree: BookmarkItem[],
  id: string,
  updates: Partial<Omit<BookmarkItem, 'id'>>
): BookmarkItem[] {
  return tree.map((node) => {
    if (node.id === id) {
      return { ...node, ...updates };
    }
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: updateBookmark(node.children, id, updates)
      };
    }
    return node;
  });
}

/**
 * Deletes a bookmark and all its children.
 */
export function deleteBookmark(tree: BookmarkItem[], id: string): BookmarkItem[] {
  return tree
    .filter((node) => node.id !== id)
    .map((node) => {
      if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: deleteBookmark(node.children, id)
        };
      }
      return node;
    });
}

/**
 * Reorders or moves a bookmark to a new parent and index.
 */
export function moveBookmark(
  tree: BookmarkItem[],
  id: string,
  targetParentId: string | null,
  targetIndex: number
): BookmarkItem[] {
  const target = findBookmark(tree, id);
  if (!target) return tree;
  const targetNode: BookmarkItem = target;

  const withoutTarget = deleteBookmark(tree, id);

  if (!targetParentId) {
    const next = [...withoutTarget];
    const clampedIndex = Math.max(0, Math.min(targetIndex, next.length));
    next.splice(clampedIndex, 0, targetNode);
    return next;
  }

  function insertInto(nodes: BookmarkItem[]): BookmarkItem[] {
    return nodes.map((node) => {
      if (node.id === targetParentId) {
        const nextChildren = [...(node.children ?? [])];
        const clampedIndex = Math.max(0, Math.min(targetIndex, nextChildren.length));
        nextChildren.splice(clampedIndex, 0, targetNode);
        return {
          ...node,
          children: nextChildren
        };
      }
      if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: insertInto(node.children)
        };
      }
      return node;
    });
  }

  return insertInto(withoutTarget);
}

/**
 * Loads bookmarks from a PDF's /Outlines structure.
 */
export async function loadBookmarksFromPdf(
  pdfBytes: Uint8Array | ArrayBuffer
): Promise<BookmarkItem[]> {
  try {
    const bytes = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
    const doc = await PDFDocument.load(bytes);
    const catalog = doc.catalog;
    const outlinesRef = catalog.get(PDFName.of('Outlines'));

    if (!outlinesRef || !(outlinesRef instanceof PDFRef)) {
      return [];
    }

    const outlinesDict = doc.context.lookup(outlinesRef);
    if (!(outlinesDict instanceof PDFDict)) {
      return [];
    }

    const firstRef = outlinesDict.get(PDFName.of('First'));
    if (!firstRef || !(firstRef instanceof PDFRef)) {
      return [];
    }

    const pageCount = doc.getPageCount();
    const pageRefs = new Map<string, number>();
    for (let p = 0; p < pageCount; p++) {
      pageRefs.set(doc.getPage(p).ref.toString(), p);
    }

    function parseItem(itemRef: PDFRef): BookmarkItem | null {
      const dict = doc.context.lookup(itemRef);
      if (!(dict instanceof PDFDict)) return null;

      const titleObj = dict.get(PDFName.of('Title'));
      let title = 'Untitled Bookmark';
      if (
        titleObj &&
        typeof (titleObj as unknown as { decodeText?: () => string }).decodeText === 'function'
      ) {
        title = (titleObj as unknown as { decodeText: () => string }).decodeText();
      } else if (
        titleObj &&
        typeof (titleObj as unknown as { asString?: () => string }).asString === 'function'
      ) {
        title = (titleObj as unknown as { asString: () => string }).asString();
      }

      let pageIndex = 0;
      const destObj = dict.get(PDFName.of('Dest'));
      if (destObj instanceof PDFArray && destObj.size() > 0) {
        const destPageRef = destObj.get(0);
        if (destPageRef instanceof PDFRef) {
          pageIndex = pageRefs.get(destPageRef.toString()) ?? 0;
        }
      }

      const children: BookmarkItem[] = [];
      const childFirst = dict.get(PDFName.of('First'));
      if (childFirst instanceof PDFRef) {
        let curChild: PDFRef | undefined = childFirst;
        while (curChild) {
          const childItem = parseItem(curChild);
          if (childItem) children.push(childItem);
          const rawChildDict: unknown = doc.context.lookup(curChild);
          if (rawChildDict instanceof PDFDict) {
            const nextVal: unknown = rawChildDict.get(PDFName.of('Next'));
            curChild = nextVal instanceof PDFRef ? nextVal : undefined;
          } else {
            break;
          }
        }
      }

      return {
        id: generateId(),
        title,
        pageIndex,
        children: children.length > 0 ? children : undefined
      };
    }

    const result: BookmarkItem[] = [];
    let curRef: PDFRef | undefined = firstRef;
    while (curRef) {
      const item = parseItem(curRef);
      if (item) result.push(item);
      const rawCurDict: unknown = doc.context.lookup(curRef);
      if (rawCurDict instanceof PDFDict) {
        const nextVal: unknown = rawCurDict.get(PDFName.of('Next'));
        curRef = nextVal instanceof PDFRef ? nextVal : undefined;
      } else {
        break;
      }
    }

    return result;
  } catch {
    return [];
  }
}

/**
 * Saves or updates bookmarks in the PDF document's /Outlines dictionary.
 */
export async function saveBookmarksToPdf(
  pdfBytes: Uint8Array | ArrayBuffer,
  bookmarks: BookmarkItem[]
): Promise<Uint8Array> {
  const bytes = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
  const doc = await PDFDocument.load(bytes);
  const context = doc.context;
  const pageCount = doc.getPageCount();

  if (bookmarks.length === 0) {
    doc.catalog.delete(PDFName.of('Outlines'));
    return doc.save();
  }

  const outlinesDict = context.obj({
    Type: PDFName.of('Outlines')
  });
  const outlinesRef = context.register(outlinesDict);

  function createSubtree(
    items: BookmarkItem[],
    parentRef: PDFRef
  ): { first: PDFRef; last: PDFRef; count: number } {
    const itemRefs: PDFRef[] = [];
    let totalCount = items.length;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) continue;
      const targetPage = Math.max(0, Math.min(item.pageIndex, pageCount - 1));
      const pageRef = doc.getPage(targetPage).ref;

      const itemDict = context.obj({
        Title: PDFString.of(item.title),
        Parent: parentRef,
        Dest: [pageRef, PDFName.of('Fit')]
      });

      const itemRef = context.register(itemDict);
      itemRefs.push(itemRef);
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemRef = itemRefs[i];
      if (!item || !itemRef) continue;
      const itemDict = context.lookup(itemRef);
      if (!(itemDict instanceof PDFDict)) continue;

      if (i > 0 && itemRefs[i - 1]) {
        itemDict.set(PDFName.of('Prev'), itemRefs[i - 1]!);
      }
      if (i < items.length - 1 && itemRefs[i + 1]) {
        itemDict.set(PDFName.of('Next'), itemRefs[i + 1]!);
      }

      if (item.children && item.children.length > 0) {
        const sub = createSubtree(item.children, itemRef);
        itemDict.set(PDFName.of('First'), sub.first);
        itemDict.set(PDFName.of('Last'), sub.last);
        itemDict.set(PDFName.of('Count'), PDFNumber.of(sub.count));
        totalCount += sub.count;
      }
    }

    const firstRef = itemRefs[0] ?? parentRef;
    const lastRef = itemRefs[itemRefs.length - 1] ?? parentRef;

    return {
      first: firstRef,
      last: lastRef,
      count: totalCount
    };
  }

  const rootSub = createSubtree(bookmarks, outlinesRef);
  outlinesDict.set(PDFName.of('First'), rootSub.first);
  outlinesDict.set(PDFName.of('Last'), rootSub.last);
  outlinesDict.set(PDFName.of('Count'), PDFNumber.of(rootSub.count));

  doc.catalog.set(PDFName.of('Outlines'), outlinesRef);
  return doc.save();
}
