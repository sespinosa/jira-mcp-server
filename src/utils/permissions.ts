import { Version3Client } from 'jira.js';
import { auditLogger } from './auditLogger.js';

export interface PermissionCheck {
  permission: string;
  project?: string;
  issue?: string;
  required: boolean;
}

export interface OperationPermissions {
  operation: string;
  permissions: PermissionCheck[];
  description: string;
}

export class PermissionError extends Error {
  constructor(
    message: string,
    public permission: string,
    public resource?: string
  ) {
    super(message);
    this.name = 'PermissionError';
  }
}

// Define permissions required for various operations
export const operationPermissions: Record<string, OperationPermissions> = {
  // Issue operations
  create_issue: {
    operation: 'create_issue',
    permissions: [{ permission: 'CREATE_ISSUES', required: true }],
    description: 'Create new issues',
  },

  update_issue: {
    operation: 'update_issue',
    permissions: [{ permission: 'EDIT_ISSUES', required: true }],
    description: 'Update existing issues',
  },

  bulk_update_issues: {
    operation: 'bulk_update_issues',
    permissions: [
      { permission: 'EDIT_ISSUES', required: true },
      { permission: 'BULK_CHANGE', required: false }, // Nice to have but not always available
    ],
    description: 'Bulk update multiple issues',
  },

  link_issues: {
    operation: 'link_issues',
    permissions: [{ permission: 'LINK_ISSUES', required: true }],
    description: 'Link issues together',
  },

  // Attachment operations
  upload_attachment: {
    operation: 'upload_attachment',
    permissions: [{ permission: 'CREATE_ATTACHMENTS', required: true }],
    description: 'Upload file attachments',
  },

  delete_attachment: {
    operation: 'delete_attachment',
    permissions: [
      { permission: 'DELETE_OWN_ATTACHMENTS', required: false },
      { permission: 'DELETE_ALL_ATTACHMENTS', required: false },
    ],
    description: 'Delete file attachments',
  },

  // Sprint operations
  create_sprint: {
    operation: 'create_sprint',
    permissions: [{ permission: 'MANAGE_SPRINTS', required: true }],
    description: 'Create new sprints',
  },

  complete_sprint: {
    operation: 'complete_sprint',
    permissions: [{ permission: 'MANAGE_SPRINTS', required: true }],
    description: 'Complete/close sprints',
  },

  move_issues_to_sprint: {
    operation: 'move_issues_to_sprint',
    permissions: [{ permission: 'SCHEDULE_ISSUES', required: true }],
    description: 'Move issues between sprints',
  },

  // Project operations
  create_project_component: {
    operation: 'create_project_component',
    permissions: [{ permission: 'ADMINISTER_PROJECTS', required: true }],
    description: 'Create project components',
  },

  create_project_version: {
    operation: 'create_project_version',
    permissions: [{ permission: 'ADMINISTER_PROJECTS', required: true }],
    description: 'Create project versions',
  },

  // Board operations
  create_board: {
    operation: 'create_board',
    permissions: [{ permission: 'MANAGE_BOARDS', required: true }],
    description: 'Create new boards',
  },

  // User operations
  get_all_users: {
    operation: 'get_all_users',
    permissions: [
      { permission: 'USER_PICKER', required: true },
      { permission: 'BROWSE_USERS', required: false },
    ],
    description: 'List all users',
  },
};

export class PermissionValidator {
  private jira: Version3Client;
  private permissionCache: Map<string, { permissions: string[]; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private maxCacheSize = 100; // Maximum cache entries
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(jira: Version3Client) {
    this.jira = jira;
    this.startPeriodicCleanup();
  }

  async checkOperationPermissions(
    operation: string,
    context: {
      projectKey?: string;
      issueKey?: string;
      userId?: string;
    } = {}
  ): Promise<void> {
    const opPerms = operationPermissions[operation];
    if (!opPerms) {
      // If operation not defined, allow but log
      auditLogger.logOperation(
        'permission_check',
        'operation',
        {
          operation,
          result: 'undefined_operation',
          context,
        },
        { riskLevel: 'medium' }
      );
      return;
    }

    try {
      // Get current user permissions
      const userPermissions = await this.getUserPermissions(context.projectKey);

      // Check required permissions
      const missingRequired: string[] = [];
      const missingOptional: string[] = [];

      for (const permCheck of opPerms.permissions) {
        const hasPermission = this.hasPermission(userPermissions, permCheck.permission);

        if (!hasPermission) {
          if (permCheck.required) {
            missingRequired.push(permCheck.permission);
          } else {
            missingOptional.push(permCheck.permission);
          }
        }
      }

      // Log permission check
      auditLogger.logOperation('permission_check', 'operation', {
        operation,
        requiredPermissions: opPerms.permissions.filter((p) => p.required).map((p) => p.permission),
        userPermissions,
        missingRequired,
        missingOptional,
        context,
      });

      // Fail if missing required permissions
      if (missingRequired.length > 0) {
        throw new PermissionError(
          `Missing required permissions for ${operation}: ${missingRequired.join(', ')}`,
          missingRequired[0],
          context.projectKey
        );
      }

      // Warn if missing optional permissions
      if (missingOptional.length > 0) {
        auditLogger.logOperation(
          'permission_warning',
          'operation',
          {
            operation,
            missingOptional,
            context,
          },
          { riskLevel: 'low' }
        );
      }
    } catch (error) {
      if (error instanceof PermissionError) {
        throw error;
      }

      // Log permission check failure
      auditLogger.logFailure(
        'permission_check',
        operation,
        error instanceof Error ? error.message : 'Unknown error',
        {
          operation,
          context,
        }
      );

      // In case of error checking permissions, we'll allow the operation but log it
      // This prevents the MCP server from being completely blocked by permission API issues
      console.warn(`Permission check failed for ${operation}, allowing operation: ${error}`);
    }
  }

  private startPeriodicCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      try {
        this.cleanupExpiredCache();
      } catch (error) {
        console.error('PermissionValidator cleanup error:', error);
      }
    }, this.cacheTimeout);

    // Don't keep Node.js alive just for cleanup
    this.cleanupTimer.unref();
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    // Remove expired entries
    for (const [key, entry] of this.permissionCache.entries()) {
      if (now - entry.timestamp > this.cacheTimeout) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.permissionCache.delete(key));

    // If still too many entries, remove oldest ones
    if (this.permissionCache.size > this.maxCacheSize) {
      const entries = Array.from(this.permissionCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const removeCount = this.permissionCache.size - this.maxCacheSize;
      entries.slice(0, removeCount).forEach(([key]) => {
        this.permissionCache.delete(key);
      });
    }
  }

  private async getUserPermissions(projectKey?: string): Promise<string[]> {
    const cacheKey = `permissions_${projectKey || 'global'}`;
    const cached = this.permissionCache.get(cacheKey);

    // Return cached permissions if still valid
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.permissions;
    }

    try {
      let permissions: string[] = [];

      if (projectKey) {
        // Get project-specific permissions
        const projectPerms = await this.jira.permissions.getMyPermissions({
          projectKey,
        });
        permissions = Object.keys(projectPerms.permissions || {}).filter(
          (key) => (projectPerms.permissions as any)?.[key]?.havePermission
        );
      } else {
        // Get global permissions
        const globalPerms = await this.jira.permissions.getMyPermissions();
        permissions = Object.keys(globalPerms.permissions || {}).filter(
          (key) => (globalPerms.permissions as any)?.[key]?.havePermission
        );
      }

      // Ensure we don't exceed cache size before adding
      if (this.permissionCache.size >= this.maxCacheSize) {
        this.cleanupExpiredCache();
      }

      // Cache the permissions
      this.permissionCache.set(cacheKey, {
        permissions,
        timestamp: Date.now(),
      });

      return permissions;
    } catch (error) {
      // If we can't get permissions, return empty array and let the operation proceed
      // This prevents blocking the MCP server due to permission API issues
      console.warn(`Failed to get permissions for ${projectKey}: ${error}`);
      return [];
    }
  }

  private hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    // Direct match
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // Check for broader permissions that imply the required one
    const permissionHierarchy: Record<string, string[]> = {
      ADMINISTER: ['*'], // Admin has all permissions
      ADMINISTER_PROJECTS: [
        'CREATE_ISSUES',
        'EDIT_ISSUES',
        'DELETE_ISSUES',
        'MANAGE_SPRINTS',
        'SCHEDULE_ISSUES',
        'CREATE_ATTACHMENTS',
        'DELETE_ALL_ATTACHMENTS',
      ],
      PROJECT_ADMIN: [
        'CREATE_ISSUES',
        'EDIT_ISSUES',
        'MANAGE_SPRINTS',
        'SCHEDULE_ISSUES',
        'CREATE_ATTACHMENTS',
      ],
    };

    for (const [broadPerm, impliedPerms] of Object.entries(permissionHierarchy)) {
      if (userPermissions.includes(broadPerm)) {
        if (impliedPerms.includes('*') || impliedPerms.includes(requiredPermission)) {
          return true;
        }
      }
    }

    return false;
  }

  clearCache(): void {
    this.permissionCache.clear();
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.permissionCache.clear();
  }

  async checkResourceAccess(
    resourceType: 'project' | 'issue' | 'board',
    resourceId: string
  ): Promise<boolean> {
    try {
      switch (resourceType) {
        case 'project':
          await this.jira.projects.getProject({ projectIdOrKey: resourceId });
          return true;
        case 'issue':
          await this.jira.issues.getIssue({ issueIdOrKey: resourceId });
          return true;
        case 'board':
          // Note: This would require AgileClient
          return true; // Simplified for now
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }
}
