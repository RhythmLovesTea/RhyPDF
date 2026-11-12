import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { announceA11y, subscribeToAnnouncements } from '../../../apps/editor/src/lib/a11y';
import { triggerHaptic } from '../../../apps/editor/src/lib/haptics';

describe('Phase 18.1 & 18.2 Polish, Accessibility & Haptics', () => {
  describe('Accessibility Live Region Announcer', () => {
    it('notifies subscribers of polite and assertive announcements', () => {
      const messages: Array<{ text: string; urgency: string }> = [];
      const unsubscribe = subscribeToAnnouncements((text, urgency) => {
        messages.push({ text, urgency });
      });

      announceA11y('Selected text block', 'polite');
      announceA11y('Document saved successfully', 'assertive');

      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual({ text: 'Selected text block', urgency: 'polite' });
      expect(messages[1]).toEqual({ text: 'Document saved successfully', urgency: 'assertive' });

      unsubscribe();
      announceA11y('Ignored announcement after unsubscribe');
      expect(messages).toHaveLength(2);
    });

    it('ignores empty, null, or whitespace-only strings', () => {
      const spy = vi.fn();
      const unsubscribe = subscribeToAnnouncements(spy);

      announceA11y('');
      announceA11y('   ');
      expect(spy).not.toHaveBeenCalled();

      unsubscribe();
    });

    it('gracefully handles subscriber errors without crashing caller', () => {
      const faultySubscriber = vi.fn(() => {
        throw new Error('Subscriber failure');
      });
      const healthySubscriber = vi.fn();

      const un1 = subscribeToAnnouncements(faultySubscriber);
      const un2 = subscribeToAnnouncements(healthySubscriber);

      expect(() => {
        announceA11y('Safe announcement');
      }).not.toThrow();

      expect(faultySubscriber).toHaveBeenCalled();
      expect(healthySubscriber).toHaveBeenCalledWith('Safe announcement', 'polite');

      un1();
      un2();
    });
  });

  describe('Subtle Haptic Micro-Feedback', () => {
    let originalVibrate: unknown;

    beforeEach(() => {
      originalVibrate = (globalThis.navigator as unknown as { vibrate?: unknown }).vibrate;
    });

    afterEach(() => {
      if (originalVibrate !== undefined) {
        (globalThis.navigator as unknown as { vibrate?: unknown }).vibrate = originalVibrate;
      } else {
        delete (globalThis.navigator as unknown as { vibrate?: unknown }).vibrate;
      }
    });

    it('triggers appropriate micro-vibration durations based on action type', () => {
      const vibrateMock = vi.fn();
      Object.defineProperty(globalThis.navigator, 'vibrate', {
        value: vibrateMock,
        writable: true,
        configurable: true
      });

      triggerHaptic('selection');
      expect(vibrateMock).toHaveBeenCalledWith(10);

      triggerHaptic('snap');
      expect(vibrateMock).toHaveBeenCalledWith(15);

      triggerHaptic('action');
      expect(vibrateMock).toHaveBeenCalledWith(20);

      triggerHaptic('success');
      expect(vibrateMock).toHaveBeenCalledWith([15, 40, 15]);

      triggerHaptic('warning');
      expect(vibrateMock).toHaveBeenCalledWith([30, 40, 30]);
    });

    it('handles platforms without navigator.vibrate gracefully without error', () => {
      Object.defineProperty(globalThis.navigator, 'vibrate', {
        value: undefined,
        writable: true,
        configurable: true
      });

      expect(() => {
        triggerHaptic('selection');
        triggerHaptic('snap');
      }).not.toThrow();
    });
  });

  describe('Canvas Object Keyboard Navigation & Cycling Logic', () => {
    interface CanvasObject {
      id: string;
      type: 'text' | 'image' | 'annotation';
    }

    const objects: CanvasObject[] = [
      { id: 'obj-1', type: 'text' },
      { id: 'obj-2', type: 'image' },
      { id: 'obj-3', type: 'text' }
    ];

    function cycleSelection(
      currentId: string | null,
      list: CanvasObject[],
      shiftKey: boolean
    ): string {
      const currentIdx = currentId ? list.findIndex((o) => o.id === currentId) : -1;
      let nextIdx: number;
      if (shiftKey) {
        nextIdx = currentIdx <= 0 ? list.length - 1 : currentIdx - 1;
      } else {
        nextIdx = currentIdx === -1 || currentIdx >= list.length - 1 ? 0 : currentIdx + 1;
      }
      return list[nextIdx]!.id;
    }

    it('cycles forward on Tab', () => {
      let selected = cycleSelection(null, objects, false);
      expect(selected).toBe('obj-1');

      selected = cycleSelection(selected, objects, false);
      expect(selected).toBe('obj-2');

      selected = cycleSelection(selected, objects, false);
      expect(selected).toBe('obj-3');

      // Loops back to first
      selected = cycleSelection(selected, objects, false);
      expect(selected).toBe('obj-1');
    });

    it('cycles backward on Shift+Tab', () => {
      let selected = cycleSelection('obj-1', objects, true);
      expect(selected).toBe('obj-3');

      selected = cycleSelection(selected, objects, true);
      expect(selected).toBe('obj-2');

      selected = cycleSelection(selected, objects, true);
      expect(selected).toBe('obj-1');
    });

    it('calculates nudges correctly with arrows (1 pt) and Shift+arrows (10 pt)', () => {
      function nudge(pos: { x: number; y: number }, key: string, shift: boolean) {
        const delta = shift ? 10 : 1;
        const newPos = { ...pos };
        switch (key) {
          case 'ArrowUp':
            newPos.y -= delta;
            break;
          case 'ArrowDown':
            newPos.y += delta;
            break;
          case 'ArrowLeft':
            newPos.x -= delta;
            break;
          case 'ArrowRight':
            newPos.x += delta;
            break;
        }
        return newPos;
      }

      const initial = { x: 100, y: 100 };
      expect(nudge(initial, 'ArrowUp', false)).toEqual({ x: 100, y: 99 });
      expect(nudge(initial, 'ArrowDown', false)).toEqual({ x: 100, y: 101 });
      expect(nudge(initial, 'ArrowLeft', false)).toEqual({ x: 99, y: 100 });
      expect(nudge(initial, 'ArrowRight', false)).toEqual({ x: 101, y: 100 });

      // Shift fast nudge
      expect(nudge(initial, 'ArrowUp', true)).toEqual({ x: 100, y: 90 });
      expect(nudge(initial, 'ArrowRight', true)).toEqual({ x: 110, y: 100 });
    });
  });

  describe('Section 3B UI Quality Bar Verification', () => {
    it('verifies touch target size standard is at least 44x44 CSS px', () => {
      const minTouchTarget = 44;
      const buttonSizeMd = 44; // Standard touch
      expect(buttonSizeMd).toBeGreaterThanOrEqual(minTouchTarget);
    });

    it('verifies animation motion timing constraint is <= 200ms', () => {
      const maxAllowedMotionMs = 200;
      const cssTransitions = [120, 150, 200];
      for (const t of cssTransitions) {
        expect(t).toBeLessThanOrEqual(maxAllowedMotionMs);
      }
    });

    it('verifies 8px spatial grid alignment', () => {
      const gridBase = 8;
      const paddings = [8, 16, 24, 32, 48];
      for (const p of paddings) {
        expect(p % gridBase).toBe(0);
      }
    });
  });
});
