export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  prefix: string;
  message: string;
  data?: unknown;
}

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

class Logger {
  private buffer: LogEntry[] = [];
  private maxBufferSize = 100;
  private minLevel: LogLevel = 'info';

  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private log(level: LogLevel, prefix: string, message: string, data?: unknown): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      prefix,
      message,
      data
    };

    this.buffer.push(entry);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }

    if (LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[this.minLevel]) {
      const formatted = `[${entry.timestamp}] [${level.toUpperCase()}] [${prefix}] ${message}`;
      if (level === 'error') {
        console.error(formatted, data ?? '');
      } else if (level === 'warn') {
        console.warn(formatted, data ?? '');
      } else {
        console.log(formatted, data ?? '');
      }
    }
  }

  debug(prefix: string, message: string, data?: unknown): void {
    this.log('debug', prefix, message, data);
  }

  info(prefix: string, message: string, data?: unknown): void {
    this.log('info', prefix, message, data);
  }

  warn(prefix: string, message: string, data?: unknown): void {
    this.log('warn', prefix, message, data);
  }

  error(prefix: string, message: string, data?: unknown): void {
    this.log('error', prefix, message, data);
  }

  getRecentLogs(): LogEntry[] {
    return [...this.buffer];
  }

  clear(): void {
    this.buffer = [];
  }
}

export const logger = new Logger();
