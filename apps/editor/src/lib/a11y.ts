/**
 * Accessibility Live Region Announcer (WCAG 2.2 AA - Task 18.1)
 * Provides screen reader announcements for object selection, formatting updates,
 * undo/redo actions, mode changes, and document status updates.
 */

type Urgency = 'polite' | 'assertive';

interface AnnouncementListener {
  (message: string, urgency: Urgency): void;
}

const listeners = new Set<AnnouncementListener>();

export function subscribeToAnnouncements(listener: AnnouncementListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Announces a message to screen readers via aria-live regions.
 */
export function announceA11y(message: string, urgency: Urgency = 'polite'): void {
  if (!message || message.trim() === '') return;
  listeners.forEach((listener) => {
    try {
      listener(message.trim(), urgency);
    } catch {
      // Ignore subscriber errors
    }
  });
}
