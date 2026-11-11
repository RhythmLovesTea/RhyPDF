import { logger, LogEntry } from './logger';

export interface RecoveryMetadata {
  documentId?: string;
  filename?: string;
  activePageIndex: number;
  isDirty: boolean;
  timestamp: string;
  errorReason: string;
  recentLogs: LogEntry[];
}

const STORAGE_KEY = 'rhypdf_recovery_metadata';

export function saveRecoveryMetadata(meta: Partial<RecoveryMetadata>): void {
  try {
    const fullMeta: RecoveryMetadata = {
      documentId: meta.documentId ?? 'unknown',
      filename: meta.filename ?? 'untitled.pdf',
      activePageIndex: meta.activePageIndex ?? 0,
      isDirty: meta.isDirty ?? false,
      timestamp: new Date().toISOString(),
      errorReason: meta.errorReason ?? 'Unknown error',
      recentLogs: logger.getRecentLogs().slice(-20)
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fullMeta));
    logger.info('Recovery', 'Saved recovery metadata to localStorage', fullMeta);
  } catch (err) {
    logger.error('Recovery', 'Failed to write recovery metadata to localStorage', err);
  }
}

export function getRecoveryMetadata(): RecoveryMetadata | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data) as RecoveryMetadata;
  } catch (err) {
    logger.error('Recovery', 'Failed to read recovery metadata', err);
    return null;
  }
}

export function clearRecoveryMetadata(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    logger.error('Recovery', 'Failed to clear recovery metadata', err);
  }
}

export function clearRecoveryForDoc(docId: string): void {
  const current = getRecoveryMetadata();
  if (current && current.documentId === docId) {
    clearRecoveryMetadata();
  }
}

export function listRecoverableDocs(): Array<{ docId: string; timestamp: number }> {
  const current = getRecoveryMetadata();
  if (!current || !current.documentId) return [];
  const ts = new Date(current.timestamp).getTime();
  return [{ docId: current.documentId, timestamp: isNaN(ts) ? Date.now() : ts }];
}

let handlersInitialized = false;

export function setupGlobalErrorHandlers(): void {
  if (handlersInitialized) return;
  handlersInitialized = true;

  window.addEventListener('error', (event: ErrorEvent) => {
    logger.error('GlobalError', event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack
    });
    saveRecoveryMetadata({
      errorReason: `Runtime error: ${event.message}`
    });
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
    logger.error('UnhandledRejection', reason, event.reason);
    saveRecoveryMetadata({
      errorReason: `Unhandled promise rejection: ${reason}`
    });
  });

  logger.info('Recovery', 'Global error and unhandled rejection handlers active');
}
