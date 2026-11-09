import { logger } from './lib/logger';

export interface ServiceWorkerState {
  registered: boolean;
  registration: ServiceWorkerRegistration | null;
  error: Error | null;
}

const state: ServiceWorkerState = {
  registered: false,
  registration: null,
  error: null
};

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    logger.info('SW', 'Service Worker not supported in this browser.');
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        state.registered = true;
        state.registration = registration;
        logger.info(
          'SW',
          `Service Worker registered successfully with scope: ${registration.scope}`
        );

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                logger.info('SW', 'New Service Worker version available.');
              }
            });
          }
        });

        resolve(registration);
      } catch (err) {
        state.error = err instanceof Error ? err : new Error(String(err));
        logger.error('SW', 'Service Worker registration failed', state.error);
        resolve(null);
      }
    });
  });
}

/**
 * PWA Launch Queue Handler for OS File Associations (`.pdf`).
 * When registered as a file handler, Chromium passes files via window.launchQueue.
 */
export function setupPwaFileHandler(onOpenFile: (file: File) => void): void {
  interface LaunchParams {
    files: FileSystemHandle[];
  }
  interface LaunchQueue {
    setConsumer: (callback: (launchParams: LaunchParams) => void) => void;
  }

  const extendedWindow = window as unknown as { launchQueue?: LaunchQueue };

  if (extendedWindow.launchQueue) {
    extendedWindow.launchQueue.setConsumer(async (launchParams) => {
      if (!launchParams.files || launchParams.files.length === 0) {
        return;
      }

      for (const handle of launchParams.files) {
        if (handle.kind === 'file') {
          const fileHandle = handle as FileSystemFileHandle;
          try {
            const file = await fileHandle.getFile();
            if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
              logger.info('PWA', `LaunchQueue opened PDF file: ${file.name}`);
              onOpenFile(file);
              break;
            }
          } catch (err) {
            logger.error('PWA', 'Failed to read file from launchQueue', err);
          }
        }
      }
    });
  }
}
