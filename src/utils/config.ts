import { z } from 'zod';

export interface SecurityConfig {
  enableDestructiveOperations: boolean;
  enableBulkOperations: boolean;
  enableFileOperations: boolean;
  enableUserEnumeration: boolean;
  maxBulkSize: number;
  maxFileSize: number;
  allowedFileExtensions: string[];
  allowedDirectories: string[];
  requireConfirmation: {
    delete: boolean;
    bulk: boolean;
    sprint: boolean;
    transition: boolean;
  };
  rateLimiting: {
    enabled: boolean;
    standardOps: number;
    bulkOps: number;
    searchOps: number;
    fileOps: number;
  };
  auditLogging: {
    enabled: boolean;
    level: 'low' | 'medium' | 'high' | 'all';
    retentionDays: number;
  };
  permissionChecking: {
    enabled: boolean;
    strict: boolean;
    cacheTimeout: number;
  };
}

const securityConfigSchema = z.object({
  enableDestructiveOperations: z.boolean().default(true),
  enableBulkOperations: z.boolean().default(true),
  enableFileOperations: z.boolean().default(true),
  enableUserEnumeration: z.boolean().default(false),
  maxBulkSize: z.number().min(1).max(100).default(50),
  maxFileSize: z
    .number()
    .min(1024)
    .max(100 * 1024 * 1024)
    .default(50 * 1024 * 1024),
  allowedFileExtensions: z
    .array(z.string())
    .default([
      'pdf',
      'doc',
      'docx',
      'txt',
      'png',
      'jpg',
      'jpeg',
      'gif',
      'xls',
      'xlsx',
      'csv',
      'zip',
      'json',
      'xml',
    ]),
  allowedDirectories: z.array(z.string()).default([]),
  requireConfirmation: z
    .object({
      delete: z.boolean().default(true),
      bulk: z.boolean().default(true),
      sprint: z.boolean().default(true),
      transition: z.boolean().default(false),
    })
    .default({}),
  rateLimiting: z
    .object({
      enabled: z.boolean().default(true),
      standardOps: z.number().min(1).max(300).default(60),
      bulkOps: z.number().min(1).max(50).default(10),
      searchOps: z.number().min(1).max(100).default(30),
      fileOps: z.number().min(1).max(20).default(5),
    })
    .default({}),
  auditLogging: z
    .object({
      enabled: z.boolean().default(true),
      level: z.enum(['low', 'medium', 'high', 'all']).default('medium'),
      retentionDays: z.number().min(1).max(365).default(30),
    })
    .default({}),
  permissionChecking: z
    .object({
      enabled: z.boolean().default(true),
      strict: z.boolean().default(false),
      cacheTimeout: z.number().min(60).max(3600).default(300),
    })
    .default({}),
});

export class ConfigurationManager {
  private config: SecurityConfig;

  constructor(configOverrides: Partial<SecurityConfig> = {}) {
    // Load from environment variables and apply overrides
    const envConfig = this.loadFromEnvironment();
    const mergedConfig = { ...envConfig, ...configOverrides };

    try {
      this.config = securityConfigSchema.parse(mergedConfig);
    } catch (error) {
      console.error('Invalid security configuration:', error);
      throw new Error('Failed to initialize security configuration');
    }
  }

  private loadFromEnvironment(): Partial<SecurityConfig> {
    return {
      enableDestructiveOperations: process.env.JIRA_ENABLE_DESTRUCTIVE !== 'false',
      enableBulkOperations: process.env.JIRA_ENABLE_BULK !== 'false',
      enableFileOperations: process.env.JIRA_ENABLE_FILE_OPS !== 'false',
      enableUserEnumeration: process.env.JIRA_ENABLE_USER_ENUM === 'true',
      maxBulkSize: process.env.JIRA_MAX_BULK_SIZE
        ? parseInt(process.env.JIRA_MAX_BULK_SIZE)
        : undefined,
      maxFileSize: process.env.JIRA_MAX_FILE_SIZE
        ? parseInt(process.env.JIRA_MAX_FILE_SIZE)
        : undefined,
      allowedFileExtensions: process.env.JIRA_ALLOWED_EXTENSIONS?.split(',') || undefined,
      allowedDirectories: process.env.JIRA_ALLOWED_DIRS?.split(',') || undefined,
      requireConfirmation: {
        delete: process.env.JIRA_CONFIRM_DELETE !== 'false',
        bulk: process.env.JIRA_CONFIRM_BULK !== 'false',
        sprint: process.env.JIRA_CONFIRM_SPRINT !== 'false',
        transition: process.env.JIRA_CONFIRM_TRANSITION === 'true',
      },
      rateLimiting: {
        enabled: process.env.JIRA_RATE_LIMITING !== 'false',
        standardOps: process.env.JIRA_RATE_STANDARD ? parseInt(process.env.JIRA_RATE_STANDARD) : 60,
        bulkOps: process.env.JIRA_RATE_BULK ? parseInt(process.env.JIRA_RATE_BULK) : 10,
        searchOps: process.env.JIRA_RATE_SEARCH ? parseInt(process.env.JIRA_RATE_SEARCH) : 30,
        fileOps: process.env.JIRA_RATE_FILE ? parseInt(process.env.JIRA_RATE_FILE) : 5,
      },
      auditLogging: {
        enabled: process.env.JIRA_AUDIT_LOGGING !== 'false',
        level: (process.env.JIRA_AUDIT_LEVEL as any) || undefined,
        retentionDays: process.env.JIRA_AUDIT_RETENTION
          ? parseInt(process.env.JIRA_AUDIT_RETENTION)
          : 30,
      },
      permissionChecking: {
        enabled: process.env.JIRA_PERMISSION_CHECK !== 'false',
        strict: process.env.JIRA_PERMISSION_STRICT === 'true',
        cacheTimeout: process.env.JIRA_PERMISSION_CACHE
          ? parseInt(process.env.JIRA_PERMISSION_CACHE)
          : 300,
      },
    };
  }

  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  isOperationAllowed(operation: string): boolean {
    switch (operation) {
      case 'delete_attachment':
      case 'complete_sprint':
        return this.config.enableDestructiveOperations;

      case 'bulk_update_issues':
      case 'move_issues_to_sprint':
        return this.config.enableBulkOperations;

      case 'upload_attachment':
      case 'download_attachment':
        return this.config.enableFileOperations;

      case 'get_all_users':
      case 'search_users':
        return this.config.enableUserEnumeration;

      default:
        return true;
    }
  }

  needsConfirmation(operation: string): boolean {
    if (operation.includes('delete') || operation.includes('remove')) {
      return this.config.requireConfirmation.delete;
    }

    if (operation.includes('bulk')) {
      return this.config.requireConfirmation.bulk;
    }

    if (
      operation.includes('sprint') &&
      (operation.includes('complete') || operation.includes('start'))
    ) {
      return this.config.requireConfirmation.sprint;
    }

    if (operation.includes('transition')) {
      return this.config.requireConfirmation.transition;
    }

    return false;
  }

  getMaxBulkSize(): number {
    return this.config.maxBulkSize;
  }

  getMaxFileSize(): number {
    return this.config.maxFileSize;
  }

  getAllowedFileExtensions(): string[] {
    return [...this.config.allowedFileExtensions];
  }

  getAllowedDirectories(): string[] {
    return [...this.config.allowedDirectories];
  }

  isRateLimitingEnabled(): boolean {
    return this.config.rateLimiting.enabled;
  }

  getRateLimit(operationType: 'standard' | 'bulk' | 'search' | 'file'): number {
    return this.config.rateLimiting[`${operationType}Ops`];
  }

  isAuditLoggingEnabled(): boolean {
    return this.config.auditLogging.enabled;
  }

  getAuditLevel(): 'low' | 'medium' | 'high' | 'all' {
    return this.config.auditLogging.level;
  }

  getAuditRetentionDays(): number {
    return this.config.auditLogging.retentionDays;
  }

  isPermissionCheckingEnabled(): boolean {
    return this.config.permissionChecking.enabled;
  }

  isStrictPermissionMode(): boolean {
    return this.config.permissionChecking.strict;
  }

  getPermissionCacheTimeout(): number {
    return this.config.permissionChecking.cacheTimeout * 1000; // Convert to milliseconds
  }

  updateConfig(updates: Partial<SecurityConfig>): void {
    const mergedConfig = { ...this.config, ...updates };
    this.config = securityConfigSchema.parse(mergedConfig);
  }

  validateOperation(operation: string, context: any = {}): void {
    if (!this.isOperationAllowed(operation)) {
      throw new Error(`Operation '${operation}' is disabled by security configuration`);
    }

    // Additional context-specific validations
    if (operation.includes('bulk') && context.count > this.getMaxBulkSize()) {
      throw new Error(
        `Bulk operation exceeds maximum size: ${context.count} > ${this.getMaxBulkSize()}`
      );
    }

    if (operation.includes('file') && context.size > this.getMaxFileSize()) {
      throw new Error(`File size exceeds maximum: ${context.size} > ${this.getMaxFileSize()}`);
    }
  }

  getSecuritySummary(): Record<string, any> {
    return {
      destructiveOperations: this.config.enableDestructiveOperations,
      bulkOperations: this.config.enableBulkOperations,
      fileOperations: this.config.enableFileOperations,
      userEnumeration: this.config.enableUserEnumeration,
      maxBulkSize: this.config.maxBulkSize,
      maxFileSize: this.config.maxFileSize,
      confirmationRequired: this.config.requireConfirmation,
      rateLimiting: this.config.rateLimiting.enabled,
      auditLogging: this.config.auditLogging.enabled,
      permissionChecking: this.config.permissionChecking.enabled,
    };
  }
}

// Global configuration instance
export const securityConfig = new ConfigurationManager();

// Convenience functions
