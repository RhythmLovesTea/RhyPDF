/**
 * Subtle Haptic Feedback Manager (Task 18.2)
 * Provides tactile micro-feedback using navigator.vibrate where supported.
 * Falls back to no-op on platforms without vibration motors (desktop, iOS).
 */

export type HapticType = 'selection' | 'snap' | 'action' | 'warning' | 'success';

export function triggerHaptic(type: HapticType): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }

  try {
    switch (type) {
      case 'selection':
        // Extremely subtle tick for selecting objects (10ms)
        navigator.vibrate(10);
        break;
      case 'snap':
        // Crisp tactile click when snapping to alignment guides (15ms)
        navigator.vibrate(15);
        break;
      case 'action':
        // Soft pulse for undo/redo, delete, or save operations (20ms)
        navigator.vibrate(20);
        break;
      case 'success':
        // Double micro-pulse for completed export/save (15ms, 40ms pause, 15ms)
        navigator.vibrate([15, 40, 15]);
        break;
      case 'warning':
        // Tactile alert for errors, bounds limits, or destructive prompts (30ms, 40ms pause, 30ms)
        navigator.vibrate([30, 40, 30]);
        break;
    }
  } catch {
    // Vibration may be restricted by user agent policies
  }
}
