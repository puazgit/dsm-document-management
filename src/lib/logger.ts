/**
 * Centralized logging service for the application
 * Provides structured logging with different log levels
 * Can be easily extended to send logs to external services
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  data?: Record<string, any>;
  timestamp: string;
}

class Logger {
  private isDevelopment: boolean;
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 100;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  /**
   * Creates a formatted log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    data?: Record<string, any>
  ): LogEntry {
    return {
      level,
      message,
      context,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Stores log in history (limited size)
   */
  private storeLog(entry: LogEntry): void {
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

  /**
   * Formats the log output for console
   */
  private formatConsoleOutput(entry: LogEntry): string {
    const prefix = entry.context ? `[${entry.context}]` : '';
    return `${prefix} ${entry.message}`;
  }

  /**
   * Debug level logs - only in development
   */
  debug(message: string, context?: string, data?: Record<string, any>): void {
    if (!this.isDevelopment) return;

    const entry = this.createLogEntry(LogLevel.DEBUG, message, context, data);
    this.storeLog(entry);
    
    if (data) {
      console.log(this.formatConsoleOutput(entry), data);
    } else {
      console.log(this.formatConsoleOutput(entry));
    }
  }

  /**
   * Info level logs - only in development
   */
  info(message: string, context?: string, data?: Record<string, any>): void {
    if (!this.isDevelopment) return;

    const entry = this.createLogEntry(LogLevel.INFO, message, context, data);
    this.storeLog(entry);
    
    if (data) {
      console.info(this.formatConsoleOutput(entry), data);
    } else {
      console.info(this.formatConsoleOutput(entry));
    }
  }

  /**
   * Warning level logs - shown in all environments
   */
  warn(message: string, context?: string, data?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.WARN, message, context, data);
    this.storeLog(entry);
    
    if (data) {
      console.warn(this.formatConsoleOutput(entry), data);
    } else {
      console.warn(this.formatConsoleOutput(entry));
    }
  }

  /**
   * Error level logs - always shown and stored
   */
  error(message: string, context?: string, error?: Error | unknown, data?: Record<string, any>): void {
    const errorData = error instanceof Error 
      ? { name: error.name, message: error.message, stack: error.stack, ...data }
      : { error, ...data };

    const entry = this.createLogEntry(LogLevel.ERROR, message, context, errorData);
    this.storeLog(entry);
    
    console.error(this.formatConsoleOutput(entry), errorData);
  }

  /**
   * Get recent log history (useful for debugging)
   */
  getHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  /**
   * Clear log history
   */
  clearHistory(): void {
    this.logHistory = [];
  }

  /**
   * Export logs as JSON (useful for bug reports)
   */
  exportLogs(): string {
    return JSON.stringify(this.logHistory, null, 2);
  }
}

// Singleton instance
const logger = new Logger();

// Export singleton instance
export default logger;

// Export convenience functions
export const logDebug = (message: string, context?: string, data?: Record<string, any>) => 
  logger.debug(message, context, data);

export const logInfo = (message: string, context?: string, data?: Record<string, any>) => 
  logger.info(message, context, data);

export const logWarn = (message: string, context?: string, data?: Record<string, any>) => 
  logger.warn(message, context, data);

export const logError = (message: string, context?: string, error?: Error | unknown, data?: Record<string, any>) => 
  logger.error(message, context, error, data);
