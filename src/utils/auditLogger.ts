export interface AuditLogEntry {
  timestamp: string;
  operation: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface AuditLoggerOptions {
  enableConsoleLogging?: boolean;
  enableFileLogging?: boolean;
  logFilePath?: string;
  maxLogEntries?: number;
  retentionDays?: number;
  cleanupIntervalMs?: number;
  maxMemoryUsageMB?: number;
  batchCleanupSize?: number;
}

export class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private options: Required<AuditLoggerOptions>;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private lastCleanup: number = Date.now();
  private cleanupInProgress: boolean = false;

  constructor(options: AuditLoggerOptions = {}) {
    this.options = {
      enableConsoleLogging: options.enableConsoleLogging ?? true,
      enableFileLogging: options.enableFileLogging ?? false,
      logFilePath: options.logFilePath ?? './audit.log',
      maxLogEntries: options.maxLogEntries ?? 10000,
      retentionDays: options.retentionDays ?? 90,
      cleanupIntervalMs: options.cleanupIntervalMs ?? 300000, // 5 minutes
      maxMemoryUsageMB: options.maxMemoryUsageMB ?? 50,
      batchCleanupSize: options.batchCleanupSize ?? 1000,
    };

    // Start periodic cleanup
    this.startPeriodicCleanup();
  }

  log(entry: Omit<AuditLogEntry, 'timestamp'>): void {
    const fullEntry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      ...entry,
    };

    // Add to in-memory logs
    this.logs.push(fullEntry);

    // Trigger cleanup if memory usage is high or if it's time
    const now = Date.now();
    if (this.shouldTriggerCleanup(now)) {
      this.performCleanup();
    }

    // Console logging
    if (this.options.enableConsoleLogging) {
      this.logToConsole(fullEntry);
    }

    // File logging (if enabled)
    if (this.options.enableFileLogging) {
      this.logToFile(fullEntry);
    }
  }

  logOperation(
    operation: string,
    resource: string,
    details: Record<string, any>,
    options: {
      resourceId?: string;
      riskLevel?: AuditLogEntry['riskLevel'];
      success?: boolean;
      error?: string;
      metadata?: Record<string, any>;
    } = {}
  ): void {
    this.log({
      operation,
      resource,
      resourceId: options.resourceId,
      details,
      riskLevel: options.riskLevel ?? this.determineRiskLevel(operation, resource),
      success: options.success ?? true,
      error: options.error,
      metadata: options.metadata,
    });
  }

  logSuccess(operation: string, resource: string, details: Record<string, any>): void {
    this.logOperation(operation, resource, details, { success: true });
  }

  logFailure(
    operation: string,
    resource: string,
    error: string,
    details: Record<string, any> = {}
  ): void {
    this.logOperation(operation, resource, details, {
      success: false,
      error,
      riskLevel: 'high',
    });
  }

  logSecurityEvent(
    operation: string,
    details: Record<string, any>,
    severity: 'medium' | 'high' | 'critical' = 'high'
  ): void {
    this.logOperation(operation, 'security', details, {
      riskLevel: severity,
      success: false,
    });
  }

  private determineRiskLevel(operation: string, resource: string): AuditLogEntry['riskLevel'] {
    // Critical operations
    const criticalOps = ['delete', 'remove', 'destroy', 'purge'];
    const criticalResources = ['user', 'project', 'board'];

    if (
      criticalOps.some((op) => operation.toLowerCase().includes(op)) ||
      criticalResources.some((res) => resource.toLowerCase().includes(res))
    ) {
      return 'critical';
    }

    // High risk operations
    const highRiskOps = ['bulk', 'mass', 'complete', 'close', 'resolve', 'transition'];
    const highRiskResources = ['sprint', 'attachment', 'permission'];

    if (
      highRiskOps.some((op) => operation.toLowerCase().includes(op)) ||
      highRiskResources.some((res) => resource.toLowerCase().includes(res))
    ) {
      return 'high';
    }

    // Medium risk operations
    const mediumRiskOps = ['update', 'modify', 'edit', 'move', 'assign'];
    const mediumRiskResources = ['issue', 'comment', 'worklog'];

    if (
      mediumRiskOps.some((op) => operation.toLowerCase().includes(op)) ||
      mediumRiskResources.some((res) => resource.toLowerCase().includes(res))
    ) {
      return 'medium';
    }

    return 'low';
  }

  private logToConsole(entry: AuditLogEntry): void {
    const prefix = `[AUDIT:${entry.riskLevel.toUpperCase()}]`;
    const message = `${entry.operation} on ${entry.resource}${entry.resourceId ? `:${entry.resourceId}` : ''}`;
    const status = entry.success ? 'SUCCESS' : 'FAILED';

    const logLine = `${prefix} ${entry.timestamp} - ${message} - ${status}`;

    switch (entry.riskLevel) {
      case 'critical':
        console.error(logLine, entry.details);
        break;
      case 'high':
        console.warn(logLine, entry.details);
        break;
      case 'medium':
        console.info(logLine, entry.details);
        break;
      default:
        console.log(logLine, entry.details);
    }
  }

  private logToFile(_entry: AuditLogEntry): void {
    // In a real implementation, this would write to a file
    // For now, we'll just store it in memory
    // You could implement this with fs.appendFileSync or a logging library
  }

  private startPeriodicCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      try {
        this.performCleanup();
      } catch (error) {
        console.error('AuditLogger cleanup error:', error);
      }
    }, this.options.cleanupIntervalMs);

    // Don't keep Node.js alive just for cleanup
    this.cleanupTimer.unref();
  }

  private shouldTriggerCleanup(now: number): boolean {
    // Always cleanup if we've exceeded max entries
    if (this.logs.length > this.options.maxLogEntries) {
      return true;
    }

    // Cleanup if it's been too long since last cleanup
    if (now - this.lastCleanup > this.options.cleanupIntervalMs) {
      return true;
    }

    // Cleanup if estimated memory usage is high
    if (this.getEstimatedMemoryUsage() > this.options.maxMemoryUsageMB) {
      return true;
    }

    return false;
  }

  private performCleanup(): void {
    if (this.cleanupInProgress) {
      return;
    }

    this.cleanupInProgress = true;

    try {
      const initialLength = this.logs.length;

      // Step 1: Remove entries older than retention period
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.options.retentionDays);

      this.logs = this.logs.filter((log) => new Date(log.timestamp) > cutoffDate);

      // Step 2: If still too many entries, remove oldest ones in batches
      if (this.logs.length > this.options.maxLogEntries) {
        // Keep the most recent entries
        this.logs = this.logs.slice(-this.options.maxLogEntries);
      }

      // Step 3: If memory usage is still high, remove more entries
      while (
        this.getEstimatedMemoryUsage() > this.options.maxMemoryUsageMB &&
        this.logs.length > 100
      ) {
        const removeCount = Math.min(this.options.batchCleanupSize, this.logs.length - 100);
        this.logs.splice(0, removeCount);
      }

      const finalLength = this.logs.length;
      const removedEntries = initialLength - finalLength;

      if (removedEntries > 0) {
        console.log(
          `AuditLogger cleanup: removed ${removedEntries} entries, ${finalLength} remaining`
        );
      }

      this.lastCleanup = Date.now();
    } catch (error) {
      console.error('AuditLogger cleanup failed:', error);
    } finally {
      this.cleanupInProgress = false;
    }
  }

  private getEstimatedMemoryUsage(): number {
    if (this.logs.length === 0) return 0;

    // Estimate memory usage based on average entry size
    const sampleSize = Math.min(10, this.logs.length);
    const sampleEntries = this.logs.slice(-sampleSize);
    const avgEntrySize =
      sampleEntries.reduce((sum, entry) => {
        return sum + JSON.stringify(entry).length;
      }, 0) / sampleSize;

    // Convert to MB (rough estimate including object overhead)
    return (this.logs.length * avgEntrySize * 2) / (1024 * 1024);
  }

  getLogs(filter?: {
    operation?: string;
    resource?: string;
    riskLevel?: AuditLogEntry['riskLevel'];
    success?: boolean;
    since?: Date;
    limit?: number;
  }): AuditLogEntry[] {
    let filtered = [...this.logs];

    if (filter) {
      if (filter.operation) {
        filtered = filtered.filter((log) => log.operation.includes(filter.operation!));
      }

      if (filter.resource) {
        filtered = filtered.filter((log) => log.resource.includes(filter.resource!));
      }

      if (filter.riskLevel) {
        filtered = filtered.filter((log) => log.riskLevel === filter.riskLevel);
      }

      if (filter.success !== undefined) {
        filtered = filtered.filter((log) => log.success === filter.success);
      }

      if (filter.since) {
        filtered = filtered.filter((log) => new Date(log.timestamp) > filter.since!);
      }
    }

    // Sort by timestamp (most recent first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply limit
    if (filter?.limit) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered;
  }

  getSecurityEvents(limit = 100): AuditLogEntry[] {
    return this.getLogs({
      resource: 'security',
      limit,
    });
  }

  getFailedOperations(limit = 100): AuditLogEntry[] {
    return this.getLogs({
      success: false,
      limit,
    });
  }

  getHighRiskOperations(limit = 100): AuditLogEntry[] {
    return this.getLogs({
      riskLevel: 'high',
      limit,
    }).concat(
      this.getLogs({
        riskLevel: 'critical',
        limit,
      })
    );
  }

  clear(): void {
    this.logs = [];
    this.lastCleanup = Date.now();
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.logs = [];
    this.cleanupInProgress = false;
  }

  getStats(): {
    totalLogs: number;
    byRiskLevel: Record<AuditLogEntry['riskLevel'], number>;
    bySuccess: { success: number; failure: number };
    recentActivity: number; // last 24 hours
  } {
    const byRiskLevel = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    const bySuccess = {
      success: 0,
      failure: 0,
    };

    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);
    let recentActivity = 0;

    for (const log of this.logs) {
      byRiskLevel[log.riskLevel]++;

      if (log.success) {
        bySuccess.success++;
      } else {
        bySuccess.failure++;
      }

      if (new Date(log.timestamp) > last24Hours) {
        recentActivity++;
      }
    }

    return {
      totalLogs: this.logs.length,
      byRiskLevel,
      bySuccess,
      recentActivity,
    };
  }
}

// Global audit logger instance
export const auditLogger = new AuditLogger({
  enableConsoleLogging: true,
  enableFileLogging: false,
  maxLogEntries: 5000,
  retentionDays: 30,
  cleanupIntervalMs: 300000, // 5 minutes
  maxMemoryUsageMB: 25,
  batchCleanupSize: 500,
});

// Convenience functions for common operations
export const logFileOperation = (
  operation: string,
  filePath: string,
  success = true,
  error?: string
) => {
  auditLogger.logOperation(operation, 'file', { filePath }, { success, error });
};

export const logJQLSearch = (jql: string, resultCount: number, success = true, error?: string) => {
  auditLogger.logOperation('jql_search', 'search', { jql, resultCount }, { success, error });
};

export const logBulkOperation = (
  operation: string,
  resource: string,
  count: number,
  success = true,
  error?: string
) => {
  auditLogger.logOperation(
    `bulk_${operation}`,
    resource,
    { count },
    {
      success,
      error,
      riskLevel: 'high',
    }
  );
};

export const logDestructiveOperation = (
  operation: string,
  resource: string,
  resourceId?: string,
  success = true,
  error?: string
) => {
  auditLogger.logOperation(
    operation,
    resource,
    { destructive: true },
    {
      resourceId,
      success,
      error,
      riskLevel: 'critical',
    }
  );
};

export const logSecurityViolation = (violation: string, details: Record<string, any>) => {
  auditLogger.logSecurityEvent(`security_violation_${violation}`, details, 'critical');
};
