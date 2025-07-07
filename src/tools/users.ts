import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Version3Client } from 'jira.js';
import { z } from 'zod';
import { rateLimiters, withRateLimit } from '../utils/rateLimiter.js';
import { auditLogger } from '../utils/auditLogger.js';
import { SecurityError, DANGEROUS_SCRIPT_PATTERNS } from '../utils/security.js';

export function registerUserTools(server: McpServer, jiraClient: Version3Client) {
  // Get User
  server.registerTool(
    'get_user',
    {
      title: 'Get User',
      description: 'Get detailed information about a user',
      inputSchema: {
        accountId: z.string().describe('User account ID'),
        expand: z.array(z.string()).optional().describe('Fields to expand'),
      },
    },
    async (args) => {
      try {
        // Rate limiting and audit logging
        await withRateLimit(
          async () => {
            auditLogger.logOperation('get_user', 'user', { accountId: args.accountId });
            return true;
          },
          rateLimiters.standard,
          'get_user'
        );

        // Args are automatically validated by MCP SDK
        const validatedArgs = args;
        const user = await jiraClient.users.getUser({
          accountId: validatedArgs.accountId,
          expand: validatedArgs.expand?.join(','),
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(user, null, 2),
            },
          ],
        };
      } catch (error) {
        // Audit failure
        auditLogger.logFailure(
          'get_user',
          'user',
          error instanceof Error ? error.message : 'Unknown error',
          { accountId: args.accountId }
        );

        if (error instanceof SecurityError) {
          throw new Error(`Security violation: ${error.message}`);
        }
        throw error;
      }
    }
  );

  // Get User Groups
  server.registerTool(
    'get_user_groups',
    {
      title: 'Get User Groups',
      description: 'Get groups that a user belongs to',
      inputSchema: {
        accountId: z.string().describe('User account ID'),
      },
    },
    async (args) => {
      try {
        // Rate limiting and audit logging
        await withRateLimit(
          async () => {
            auditLogger.logOperation('get_user_groups', 'user', { accountId: args.accountId });
            return true;
          },
          rateLimiters.standard,
          'get_user_groups'
        );

        // Args are automatically validated by MCP SDK
        const validatedArgs = args;
        const groups = await jiraClient.users.getUserGroups({
          accountId: validatedArgs.accountId,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(groups, null, 2),
            },
          ],
        };
      } catch (error) {
        // Audit failure
        auditLogger.logFailure(
          'get_user_groups',
          'user',
          error instanceof Error ? error.message : 'Unknown error',
          { accountId: args.accountId }
        );

        if (error instanceof SecurityError) {
          throw new Error(`Security violation: ${error.message}`);
        }
        throw error;
      }
    }
  );

  // Find Users by Query
  server.registerTool(
    'find_users',
    {
      title: 'Find Users',
      description: 'Find users by search query',
      inputSchema: {
        query: z.string().describe('Search query'),
        maxResults: z.number().default(50).describe('Maximum results'),
        startAt: z.number().default(0).describe('Starting index'),
      },
    },
    async (args) => {
      try {
        // Rate limiting and audit logging
        await withRateLimit(
          async () => {
            auditLogger.logOperation('find_users', 'user', {
              query: args.query,
              maxResults: args.maxResults,
            });
            return true;
          },
          rateLimiters.search,
          'find_users'
        );

        // Args are automatically validated by MCP SDK
        const validatedArgs = args;

        // Enhanced query validation
        if (validatedArgs.query.length > 100) {
          throw new Error('Search query too long (max 100 characters)');
        }

        // Basic sanitization for search query - prevent dangerous patterns
        for (const pattern of DANGEROUS_SCRIPT_PATTERNS) {
          if (pattern.test(validatedArgs.query)) {
            throw new SecurityError(
              `Search query contains dangerous pattern: ${pattern}`,
              'DANGEROUS_SEARCH_PATTERN'
            );
          }
        }

        const users = await jiraClient.userSearch.findUsers({
          query: validatedArgs.query,
          maxResults: validatedArgs.maxResults,
          startAt: validatedArgs.startAt,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(users, null, 2),
            },
          ],
        };
      } catch (error) {
        // Audit failure
        auditLogger.logFailure(
          'find_users',
          'user',
          error instanceof Error ? error.message : 'Unknown error',
          { query: args.query }
        );

        if (error instanceof SecurityError) {
          throw new Error(`Security violation: ${error.message}`);
        }
        throw error;
      }
    }
  );

  // Find Assignable Users
  server.registerTool(
    'find_assignable_users',
    {
      title: 'Find Assignable Users',
      description: 'Find users that can be assigned to issues',
      inputSchema: {
        query: z.string().optional().describe('Search query'),
        project: z.string().optional().describe('Project key'),
        issueKey: z.string().optional().describe('Issue key'),
        maxResults: z.number().default(50).describe('Maximum results'),
        startAt: z.number().default(0).describe('Starting index'),
      },
    },
    async (args) => {
      try {
        // Rate limiting and audit logging
        await withRateLimit(
          async () => {
            auditLogger.logOperation('find_assignable_users', 'user', {
              query: args.query,
              project: args.project,
              issueKey: args.issueKey,
            });
            return true;
          },
          rateLimiters.search,
          'find_assignable_users'
        );

        // Args are automatically validated by MCP SDK
        const validatedArgs = args;

        // Query validation if provided
        if (validatedArgs.query && validatedArgs.query.length > 100) {
          throw new Error('Search query too long (max 100 characters)');
        }

        // Basic sanitization for search query if provided
        if (validatedArgs.query) {
          for (const pattern of DANGEROUS_SCRIPT_PATTERNS) {
            if (pattern.test(validatedArgs.query)) {
              throw new SecurityError(
                `Search query contains dangerous pattern: ${pattern}`,
                'DANGEROUS_SEARCH_PATTERN'
              );
            }
          }
        }
        const users = await jiraClient.userSearch.findAssignableUsers({
          query: validatedArgs.query,
          project: validatedArgs.project,
          issueKey: validatedArgs.issueKey,
          maxResults: validatedArgs.maxResults,
          startAt: validatedArgs.startAt,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(users, null, 2),
            },
          ],
        };
      } catch (error) {
        // Audit failure
        auditLogger.logFailure(
          'find_assignable_users',
          'user',
          error instanceof Error ? error.message : 'Unknown error',
          { query: args.query, project: args.project, issueKey: args.issueKey }
        );

        if (error instanceof SecurityError) {
          throw new Error(`Security violation: ${error.message}`);
        }
        throw error;
      }
    }
  );
}
