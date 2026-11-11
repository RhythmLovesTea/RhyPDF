/**
 * @rhypdf/editor - performanceMonitor.ts
 * Task 16.1: Web budgets (Shell interactive < 2s, LCP < 2.5s, INP < 200ms)
 * Task 16.5: Main-thread hygiene (Long Tasks API, no task > 50ms during user interaction)
 */

export interface PerformanceBudgets {
  maxShellInteractiveMs: number; // 2000 ms
  maxLcpMs: number; // 2500 ms
  maxInpMs: number; // 200 ms
  maxTaskDurationMs: number; // 50 ms
}

export const DEFAULT_BUDGETS: PerformanceBudgets = {
  maxShellInteractiveMs: 2000,
  maxLcpMs: 2500,
  maxInpMs: 200,
  maxTaskDurationMs: 50
};

export interface LongTaskRecord {
  startTime: number;
  duration: number;
  name?: string;
  duringInteraction?: boolean;
}

export interface PerformanceMetricsReport {
  shellInteractiveMs: number | null;
  lcpMs: number | null;
  maxInpMs: number | null;
  longTasksCount: number;
  longTasksDuringInteractionCount: number;
  longestTaskMs: number;
  allBudgetsMet: boolean;
  violations: string[];
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor | null = null;
  private budgets: PerformanceBudgets;

  private shellInteractiveMs: number | null = null;
  private lcpMs: number | null = null;
  private interactionDurations: number[] = [];
  private longTasks: LongTaskRecord[] = [];
  private isInteracting = false;
  private observer: PerformanceObserver | null = null;

  constructor(budgets?: Partial<PerformanceBudgets>) {
    this.budgets = { ...DEFAULT_BUDGETS, ...budgets };
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startObserving(): void {
    if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
      return;
    }

    try {
      // 1. Long Tasks Observer (> 50ms main-thread execution)
      const supportedTypes = PerformanceObserver.supportedEntryTypes || [];

      if (supportedTypes.includes('longtask')) {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordLongTask(entry.duration, entry.name, entry.startTime);
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observer = longTaskObserver;
      }

      // 2. Largest Contentful Paint Observer
      if (supportedTypes.includes('largest-contentful-paint')) {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            this.recordLcp(lastEntry.startTime);
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      }

      // 3. Event timing / INP
      if (supportedTypes.includes('event')) {
        const eventObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if ('duration' in entry && typeof entry.duration === 'number') {
              this.recordInteraction(entry.name, entry.duration);
            }
          }
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (eventObserver as any).observe({ type: 'event', durationThreshold: 16, buffered: true });
      }
    } catch {
      // Environment does not support selective PerformanceObserver options
    }
  }

  stopObserving(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  setInteracting(interacting: boolean): void {
    this.isInteracting = interacting;
  }

  recordShellInteractive(timeMs: number): void {
    this.shellInteractiveMs = timeMs;
  }

  recordLcp(timeMs: number): void {
    this.lcpMs = timeMs;
  }

  recordInteraction(_name: string, durationMs: number): void {
    this.interactionDurations.push(durationMs);
  }

  recordLongTask(durationMs: number, name?: string, startTime = performance.now()): void {
    const isDuringInteraction = this.isInteracting;
    this.longTasks.push({
      duration: durationMs,
      name,
      startTime,
      duringInteraction: isDuringInteraction
    });
  }

  getLongTasks(): LongTaskRecord[] {
    return [...this.longTasks];
  }

  clearLongTasks(): void {
    this.longTasks = [];
  }

  reset(): void {
    this.shellInteractiveMs = null;
    this.lcpMs = null;
    this.interactionDurations = [];
    this.longTasks = [];
    this.isInteracting = false;
  }

  checkBudgets(): PerformanceMetricsReport {
    const violations: string[] = [];

    // Check Shell Interactive (< 2000 ms)
    if (
      this.shellInteractiveMs !== null &&
      this.shellInteractiveMs > this.budgets.maxShellInteractiveMs
    ) {
      violations.push(
        `Shell interactive time (${this.shellInteractiveMs}ms) exceeded budget (${this.budgets.maxShellInteractiveMs}ms)`
      );
    }

    // Check LCP (< 2500 ms)
    if (this.lcpMs !== null && this.lcpMs > this.budgets.maxLcpMs) {
      violations.push(`LCP (${this.lcpMs}ms) exceeded budget (${this.budgets.maxLcpMs}ms)`);
    }

    // Check INP (< 200 ms)
    const maxInp =
      this.interactionDurations.length > 0 ? Math.max(...this.interactionDurations) : null;
    if (maxInp !== null && maxInp > this.budgets.maxInpMs) {
      violations.push(`INP (${maxInp}ms) exceeded budget (${this.budgets.maxInpMs}ms)`);
    }

    // Check Long Tasks during interaction (> 50 ms)
    const longTasksDuringInteraction = this.longTasks.filter(
      (t) => t.duringInteraction && t.duration > this.budgets.maxTaskDurationMs
    );
    if (longTasksDuringInteraction.length > 0) {
      const longest = Math.max(...longTasksDuringInteraction.map((t) => t.duration));
      violations.push(
        `${longTasksDuringInteraction.length} task(s) exceeded 50ms during user interaction (longest: ${longest.toFixed(1)}ms)`
      );
    }

    const longestOverall =
      this.longTasks.length > 0 ? Math.max(...this.longTasks.map((t) => t.duration)) : 0;

    return {
      shellInteractiveMs: this.shellInteractiveMs,
      lcpMs: this.lcpMs,
      maxInpMs: maxInp,
      longTasksCount: this.longTasks.length,
      longTasksDuringInteractionCount: longTasksDuringInteraction.length,
      longestTaskMs: longestOverall,
      allBudgetsMet: violations.length === 0,
      violations
    };
  }
}
