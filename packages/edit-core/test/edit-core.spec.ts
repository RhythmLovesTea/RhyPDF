import { describe, it, expect } from 'vitest';
import type { PageObject, TextRun, ImageObject, Rect, Matrix2D } from '@rhypdf/pdf-model';
import {
  EditSession,
  MoveObjectCommand,
  ResizeObjectCommand,
  RotateObjectCommand,
  DeleteObjectCommand,
  InsertObjectCommand,
  EditTextBlockCommand,
  ChangeStyleCommand,
  ReorderObjectCommand,
  hitTestObjects,
  cycleHitTest,
  calculateSnap,
  computeSelectionBounds,
  marqueeSelect,
  toggleSelectedId,
  ClipboardManager,
  cloneObject
} from '../src/index';

function createMockTextRun(id = 'text-1', x = 50, y = 100, text = 'Hello'): TextRun {
  return {
    id,
    type: 'text',
    text,
    fontName: 'Helvetica',
    fontSize: 12,
    fillColor: { r: 0, g: 0, b: 0, a: 1 },
    bounds: { left: x, bottom: y, right: x + 60, top: y + 14 },
    matrix: [1, 0, 0, 1, x, y],
    zIndex: 1,
    isEmbeddedSubset: false
  };
}

function createMockImage(id = 'img-1', x = 100, y = 200, w = 150, h = 100): ImageObject {
  return {
    id,
    type: 'image',
    pixelWidth: 300,
    pixelHeight: 200,
    effectiveDpi: { x: 150, y: 150 },
    bounds: { left: x, bottom: y, right: x + w, top: y + h },
    matrix: [1, 0, 0, 1, x, y],
    zIndex: 2
  };
}

describe('Phase 5: Edit Model, Commands, and Undo/Redo Engine', () => {
  describe('Task 5.1 & 5.2: EditSession, Command Stack, Dirty Tracking & Checkpoints', () => {
    it('manages undo/redo stacks and updates dirty status', async () => {
      const session = new EditSession('doc-1', 1);
      expect(session.isDirty).toBe(false);
      expect(session.canUndo).toBe(false);
      expect(session.canRedo).toBe(false);

      let value = 10;
      const cmd = {
        id: 'test-1',
        name: 'Increment',
        pageIndex: 0,
        timestamp: Date.now(),
        apply: () => {
          value += 5;
        },
        revert: () => {
          value -= 5;
        }
      };

      await session.execute(cmd);
      expect(value).toBe(15);
      expect(session.isDirty).toBe(true);
      expect(session.canUndo).toBe(true);
      expect(session.canRedo).toBe(false);

      const undone = await session.undo();
      expect(undone).toBe(true);
      expect(value).toBe(10);
      expect(session.isDirty).toBe(false);
      expect(session.canUndo).toBe(false);
      expect(session.canRedo).toBe(true);

      const redone = await session.redo();
      expect(redone).toBe(true);
      expect(value).toBe(15);
      expect(session.isDirty).toBe(true);
      expect(session.canUndo).toBe(true);
      expect(session.canRedo).toBe(false);
    });

    it('coalesces rapid commands when mergeWith returns true', async () => {
      const session = new EditSession('doc-coalesce', 1);
      let posX = 0;
      let _posY = 0;

      const mutate = (_p: number, _id: string, dx: number, dy: number) => {
        posX += dx;
        _posY += dy;
      };

      const cmd1 = new MoveObjectCommand(0, 'obj-1', 5, 0, mutate);
      await session.execute(cmd1);
      expect(posX).toBe(5);
      expect(session.undoCount).toBe(1);

      const cmd2 = new MoveObjectCommand(0, 'obj-1', 10, 0, mutate);
      await session.execute(cmd2);
      expect(posX).toBe(15);
      // Merged into cmd1, so undoCount remains 1
      expect(session.undoCount).toBe(1);

      await session.undo();
      expect(posX).toBe(0);
      expect(session.undoCount).toBe(0);
    });

    it('caps undo stack depth to bounded memory limit', async () => {
      const session = new EditSession('doc-limit', 1, { maxHistoryDepth: 5 });

      for (let i = 0; i < 10; i++) {
        await session.execute({
          id: `cmd-${i}`,
          name: `Command ${i}`,
          pageIndex: 0,
          timestamp: Date.now(),
          apply: () => {},
          revert: () => {}
        });
      }

      expect(session.undoCount).toBe(5);
    });

    it('creates checkpoints periodically every N commands', async () => {
      const session = new EditSession('doc-cp', 1, { checkpointInterval: 3 });
      expect(session.getCheckpoints().length).toBe(0);

      for (let i = 0; i < 7; i++) {
        await session.execute({
          id: `cmd-${i}`,
          name: `Command ${i}`,
          pageIndex: 0,
          timestamp: Date.now(),
          apply: () => {},
          revert: () => {}
        });
      }

      // Checkpoints triggered at command 3 and command 6
      const cps = session.getCheckpoints();
      expect(cps.length).toBe(2);
      expect(cps[0]?.commandIndex).toBe(3);
      expect(cps[1]?.commandIndex).toBe(6);
    });

    it('handles transactions with commit and rollback', async () => {
      const session = new EditSession('doc-tx', 1);
      let val = 100;

      session.beginTransaction('Batch update');
      await session.execute({
        id: 'tx-1',
        name: 'Add 10',
        pageIndex: 0,
        timestamp: Date.now(),
        apply: () => {
          val += 10;
        },
        revert: () => {
          val -= 10;
        }
      });
      await session.execute({
        id: 'tx-2',
        name: 'Add 20',
        pageIndex: 0,
        timestamp: Date.now(),
        apply: () => {
          val += 20;
        },
        revert: () => {
          val -= 20;
        }
      });
      expect(val).toBe(130);
      expect(session.undoCount).toBe(0); // Not committed yet

      session.commitTransaction();
      expect(session.undoCount).toBe(1); // Grouped into 1 transaction

      await session.undo();
      expect(val).toBe(100);

      await session.redo();
      expect(val).toBe(130);

      // Test rollback
      session.beginTransaction('To rollback');
      await session.execute({
        id: 'tx-3',
        name: 'Add 50',
        pageIndex: 0,
        timestamp: Date.now(),
        apply: () => {
          val += 50;
        },
        revert: () => {
          val -= 50;
        }
      });
      expect(val).toBe(180);
      await session.rollbackTransaction();
      expect(val).toBe(130);
      expect(session.undoCount).toBe(1);
    });
  });

  describe('Task 5.3 & 5.12: Command Suite Execution, Reversion, and Model State Invariance', () => {
    it('MoveObjectCommand: apply and revert returns exact model state', async () => {
      const textObj = createMockTextRun('t1', 100, 200);
      const originalState = JSON.stringify(textObj);

      const mutate = (_p: number, _id: string, dx: number, dy: number) => {
        textObj.bounds = {
          left: textObj.bounds.left + dx,
          bottom: textObj.bounds.bottom + dy,
          right: textObj.bounds.right + dx,
          top: textObj.bounds.top + dy
        };
      };

      const cmd = new MoveObjectCommand(0, 't1', 30, -50, mutate);
      await cmd.apply();
      expect(textObj.bounds.left).toBe(130);
      expect(textObj.bounds.bottom).toBe(150);

      await cmd.revert();
      expect(JSON.stringify(textObj)).toBe(originalState);
    });

    it('ResizeObjectCommand: apply and revert returns exact model state', async () => {
      const img = createMockImage('i1', 50, 50, 100, 100);
      const originalState = JSON.stringify(img);
      const newBounds: Rect = { left: 40, bottom: 40, right: 180, top: 180 };

      const setBounds = (_p: number, _id: string, bounds: Rect) => {
        img.bounds = bounds;
      };

      const cmd = new ResizeObjectCommand(0, 'i1', img.bounds, newBounds, setBounds);
      await cmd.apply();
      expect(img.bounds).toEqual(newBounds);

      await cmd.revert();
      expect(JSON.stringify(img)).toBe(originalState);
    });

    it('RotateObjectCommand: apply and revert returns exact model state', async () => {
      const img = createMockImage('i2', 50, 50, 100, 100);
      const originalState = JSON.stringify(img);
      const newMatrix: Matrix2D = [0, 1, -1, 0, 50, 50];

      const setMatrix = (_p: number, _id: string, m: Matrix2D) => {
        img.matrix = m;
      };

      const cmd = new RotateObjectCommand(0, 'i2', img.matrix, newMatrix, setMatrix);
      await cmd.apply();
      expect(img.matrix).toEqual(newMatrix);

      await cmd.revert();
      expect(JSON.stringify(img)).toBe(originalState);
    });

    it('DeleteObjectCommand & InsertObjectCommand: exact serialization round-trip', async () => {
      let pageObjects: PageObject[] = [
        createMockTextRun('t1', 10, 10),
        createMockImage('i1', 100, 100)
      ];
      const originalState = JSON.stringify(pageObjects);

      const deleteFn = (_p: number, id: string) => {
        pageObjects = pageObjects.filter((o) => o.id !== id);
      };
      const insertFn = (_p: number, obj: PageObject, index?: number) => {
        if (typeof index === 'number') {
          pageObjects.splice(index, 0, obj);
        } else {
          pageObjects.push(obj);
        }
      };

      const deleteCmd = new DeleteObjectCommand(0, pageObjects[1]!, deleteFn, insertFn);
      await deleteCmd.apply();
      expect(pageObjects.length).toBe(1);
      expect(pageObjects[0]?.id).toBe('t1');

      await deleteCmd.revert();
      expect(pageObjects.length).toBe(2);
      expect(JSON.stringify(pageObjects)).toBe(originalState);

      // Insert object
      const newObj = createMockTextRun('t2', 300, 300, 'Inserted');
      const insertCmd = new InsertObjectCommand(0, newObj, insertFn, deleteFn);
      await insertCmd.apply();
      expect(pageObjects.length).toBe(3);

      await insertCmd.revert();
      expect(JSON.stringify(pageObjects)).toBe(originalState);
    });

    it('EditTextBlockCommand: apply, coalesce, and revert', async () => {
      const textRun = createMockTextRun('t1', 20, 20, 'Original');
      const originalState = JSON.stringify(textRun);

      const updateText = (_p: number, _id: string, run: TextRun) => {
        Object.assign(textRun, run);
      };

      const editedRun1 = cloneObject(textRun);
      editedRun1.text = 'Orig';

      const editedRun2 = cloneObject(textRun);
      editedRun2.text = 'Updated';

      const cmd1 = new EditTextBlockCommand(0, 't1', cloneObject(textRun), editedRun1, updateText);
      await cmd1.apply();
      expect(textRun.text).toBe('Orig');

      const cmd2 = new EditTextBlockCommand(0, 't1', editedRun1, editedRun2, updateText);
      const merged = cmd1.mergeWith(cmd2);
      expect(merged).toBe(true);
      await cmd2.apply();
      expect(textRun.text).toBe('Updated');

      await cmd1.revert();
      expect(JSON.stringify(textRun)).toBe(originalState);
    });

    it('ChangeStyleCommand and ReorderObjectCommand: apply and revert', async () => {
      const textRun = createMockTextRun('t1');
      const originalColor = cloneObject(textRun.fillColor);

      const setProperty = (_p: number, _id: string, prop: string, val: unknown) => {
        (textRun as Record<string, unknown>)[prop] = val;
      };

      const newColor = { r: 1, g: 0, b: 0, a: 1 };
      const styleCmd = new ChangeStyleCommand(
        0,
        't1',
        'fillColor',
        originalColor,
        newColor,
        setProperty
      );
      await styleCmd.apply();
      expect(textRun.fillColor).toEqual(newColor);

      await styleCmd.revert();
      expect(textRun.fillColor).toEqual(originalColor);

      // Reorder
      const setZIndex = (_p: number, _id: string, z: number) => {
        textRun.zIndex = z;
      };
      const reorderCmd = new ReorderObjectCommand(0, 't1', 1, 5, setZIndex);
      await reorderCmd.apply();
      expect(textRun.zIndex).toBe(5);

      await reorderCmd.revert();
      expect(textRun.zIndex).toBe(1);
    });

    it('50+ sequential undo/redo operations maintain zero corruption', async () => {
      const session = new EditSession('stress-doc', 1);
      let counter = 0;
      const original = counter;

      for (let i = 1; i <= 60; i++) {
        await session.execute({
          id: `inc-${i}`,
          name: `Add ${i}`,
          pageIndex: 0,
          timestamp: Date.now(),
          apply: () => {
            counter += 1;
          },
          revert: () => {
            counter -= 1;
          }
        });
      }
      expect(counter).toBe(60);

      // Undo all 60
      for (let i = 0; i < 60; i++) {
        await session.undo();
      }
      expect(counter).toBe(original);

      // Redo all 60
      for (let i = 0; i < 60; i++) {
        await session.redo();
      }
      expect(counter).toBe(60);
    });
  });

  describe('Task 5.5: Hit-testing & Overlap Cycling', () => {
    it('identifies topmost object under pointer with tolerance', () => {
      const background = createMockImage('bg', 0, 0, 500, 500);
      background.zIndex = 0;

      const button = createMockTextRun('btn', 50, 50, 'Click Me');
      button.bounds = { left: 50, bottom: 50, right: 150, top: 80 };
      button.zIndex = 5;

      const objects: PageObject[] = [background, button];

      // Point inside button
      const res = hitTestObjects(objects, { x: 75, y: 65 });
      expect(res.topmost?.id).toBe('btn');
      expect(res.candidates.length).toBe(2);
      expect(res.candidates[0]?.id).toBe('btn');
      expect(res.candidates[1]?.id).toBe('bg');

      // Point outside button, but inside tolerance (e.g. 2pt away from edge)
      const resTol = hitTestObjects(objects, { x: 152, y: 70 }, 4);
      expect(resTol.topmost?.id).toBe('btn');

      // Point strictly in background
      const resBg = hitTestObjects(objects, { x: 300, y: 300 });
      expect(resBg.topmost?.id).toBe('bg');
      expect(resBg.candidates.length).toBe(1);
    });

    it('cycles through overlapping candidates on Alt-click', () => {
      const objA = createMockImage('a', 50, 50, 100, 100);
      objA.zIndex = 3;
      const objB = createMockImage('b', 50, 50, 100, 100);
      objB.zIndex = 2;
      const objC = createMockImage('c', 50, 50, 100, 100);
      objC.zIndex = 1;

      const candidates = [objA, objB, objC];

      // Initial click -> topmost objA
      const first = cycleHitTest(candidates);
      expect(first?.id).toBe('a');

      // Next cycle -> objB
      const second = cycleHitTest(candidates, 'a');
      expect(second?.id).toBe('b');

      // Next cycle -> objC
      const third = cycleHitTest(candidates, 'b');
      expect(third?.id).toBe('c');

      // Wraps around to objA
      const wrap = cycleHitTest(candidates, 'c');
      expect(wrap?.id).toBe('a');
    });
  });

  describe('Task 5.7: Multi-Selection, Marquee & Union Bounds', () => {
    it('computes union bounding box of selected objects', () => {
      const o1 = createMockTextRun('o1', 10, 20); // bounds: left: 10, bottom: 20, right: 70, top: 34
      const o2 = createMockTextRun('o2', 100, 200); // bounds: left: 100, bottom: 200, right: 160, top: 214

      const bounds = computeSelectionBounds([o1, o2], ['o1', 'o2']);
      expect(bounds).toEqual({
        left: 10,
        bottom: 20,
        right: 160,
        top: 214
      });
    });

    it('selects objects via marquee rect (intersect and contain modes)', () => {
      const o1 = createMockTextRun('o1', 10, 10); // 10..70, 10..24
      const o2 = createMockTextRun('o2', 100, 100); // 100..160, 100..114
      const objects = [o1, o2];

      // Marquee covering only o1 completely
      const marquee1: Rect = { left: 0, bottom: 0, right: 80, top: 50 };
      expect(marqueeSelect(objects, marquee1, 'contain')).toEqual(['o1']);
      expect(marqueeSelect(objects, marquee1, 'intersect')).toEqual(['o1']);

      // Marquee partially intersecting o2
      const marquee2: Rect = { left: 120, bottom: 105, right: 200, top: 200 };
      expect(marqueeSelect(objects, marquee2, 'contain')).toEqual([]);
      expect(marqueeSelect(objects, marquee2, 'intersect')).toEqual(['o2']);
    });

    it('toggles selection ID for Shift-click multi-select', () => {
      let selected = ['o1'];
      selected = toggleSelectedId(selected, 'o2');
      expect(selected).toEqual(['o1', 'o2']);

      selected = toggleSelectedId(selected, 'o1');
      expect(selected).toEqual(['o2']);
    });
  });

  describe('Task 5.8: Snapping and Alignment Guides', () => {
    it('snaps to page center and margins', () => {
      const pageSize = { width: 600, height: 800 };
      // Object near horizontal center (300)
      const movingNearCenter: Rect = { left: 298, bottom: 100, right: 398, top: 150 };

      const snapRes = calculateSnap(movingNearCenter, pageSize, [], {
        snapThresholdPt: 5,
        snapToPageCenter: true
      });

      expect(snapRes.snappedX).toBe(true);
      expect(snapRes.x).toBe(300); // Snapped left edge to center
      expect(snapRes.guides.length).toBeGreaterThan(0);
      expect(snapRes.guides[0]?.source).toBe('page-center');
    });

    it('snaps to sibling object edges and centers', () => {
      const pageSize = { width: 600, height: 800 };
      const sibling = createMockTextRun('s1', 100, 200); // left: 100, right: 160

      // Moving object at left: 98 (within 5pt of sibling left edge 100)
      const moving: Rect = { left: 98, bottom: 50, right: 158, top: 80 };

      const snapRes = calculateSnap(moving, pageSize, [sibling], {
        snapThresholdPt: 5,
        snapToObjects: true
      });

      expect(snapRes.snappedX).toBe(true);
      expect(snapRes.x).toBe(100);
      expect(snapRes.guides[0]?.source).toBe('object-edge');
    });

    it('bypasses snapping when disabled', () => {
      const pageSize = { width: 600, height: 800 };
      const moving: Rect = { left: 299, bottom: 100, right: 399, top: 150 };

      const snapRes = calculateSnap(moving, pageSize, [], { enabled: false });
      expect(snapRes.snappedX).toBe(false);
      expect(snapRes.x).toBe(299);
      expect(snapRes.guides.length).toBe(0);
    });
  });

  describe('Task 5.10: Clipboard Manager & Duplicate', () => {
    it('copies and pastes objects with fresh IDs and offset', async () => {
      const clipboard = ClipboardManager.getInstance();
      clipboard.clear();
      expect(clipboard.hasData).toBe(false);

      const orig = createMockTextRun('orig-1', 50, 100, 'Copyable Text');
      await clipboard.copy([orig], 0, 'doc-1');
      expect(clipboard.hasData).toBe(true);

      const pasted = clipboard.paste(0, { dx: 20, dy: -20 });
      expect(pasted.length).toBe(1);
      expect(pasted[0]?.id).not.toBe('orig-1');
      expect((pasted[0] as TextRun).text).toBe('Copyable Text');
      expect(pasted[0]?.bounds?.left).toBe(70);
      expect(pasted[0]?.bounds?.bottom).toBe(80);
    });

    it('duplicates objects in-place with offset', () => {
      const clipboard = ClipboardManager.getInstance();
      const orig = createMockImage('img-1', 40, 60, 100, 100);

      const duplicated = clipboard.duplicate([orig], { dx: 20, dy: -20 });
      expect(duplicated.length).toBe(1);
      expect(duplicated[0]?.id).not.toBe('img-1');
      expect(duplicated[0]?.bounds?.left).toBe(60);
      expect(duplicated[0]?.bounds?.bottom).toBe(40);
    });
  });
});
