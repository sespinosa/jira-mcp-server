import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Version3Client } from 'jira.js';
import { z } from 'zod';
import { sanitizeJQL, SecurityError } from '../utils/security.js';
import { rateLimiters, withRateLimit } from '../utils/rateLimiter.js';
import { auditLogger } from '../utils/auditLogger.js';

export function registerSearchTools(server: McpServer, jiraClient: Version3Client) {
  // Search Users
  server.registerTool(
    'search_users',
    {
      title: 'Search Users',
      description: 'Search for users in Jira',
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
            auditLogger.logOperation('search_users', 'user', { query: args.query, maxResults: args.maxResults });
            return true;
          },
          rateLimiters.search,
          'search_users'
        );
        
        // Validate args using Zod for runtime validation
        const searchSchema = z.object({
          query: z.string(),
          maxResults: z.number().default(50),
          startAt: z.number().default(0),
        });
        const validatedArgs = searchSchema.parse(args);
        
        // Enhanced query validation
        if (validatedArgs.query.length > 100) {
          throw new Error('Search query too long (max 100 characters)');
        }
        
        // Basic sanitization for search query - prevent dangerous patterns
        const dangerousPatterns = [
          /<script[^>]*>.*?<\/script>/gi,
          /javascript:/gi,
          /vbscript:/gi,
          /onload=/gi,
          /onerror=/gi,
        ];
        
        for (const pattern of dangerousPatterns) {
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
          content: [{
            type: 'text',
            text: JSON.stringify(users, null, 2)
          }]
        };
      } catch (error) {
        // Audit failure
        auditLogger.logFailure('search_users', 'user', error instanceof Error ? error.message : 'Unknown error', { query: args.query });
        
        if (error instanceof SecurityError) {
          throw new Error(`Security violation: ${error.message}`);
        }
        throw error;
      }
    }
  );

  // Get Issue Transitions
  server.registerTool(
    'get_issue_transitions',
    {
      title: 'Get Issue Transitions',
      description: 'Get available transitions for an issue',
      inputSchema: {
        issueKey: z.string().describe('Issue key'),
      },
    },
    async (args) => {
      try {
        // Rate limiting and audit logging
        await withRateLimit(
          async () => {
            auditLogger.logOperation('get_issue_transitions', 'issue', { issueKey: args.issueKey });
            return true;
          },
          rateLimiters.standard,
          'get_issue_transitions'
        );
        
        // Validate args using Zod for runtime validation
        const transitionSchema = z.object({
          issueKey: z.string(),
        });
        const validatedArgs = transitionSchema.parse(args);
        const transitions = await jiraClient.issues.getTransitions({
          issueIdOrKey: validatedArgs.issueKey,
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(transitions, null, 2)
          }]
        };
      } catch (error) {
        // Audit failure
        auditLogger.logFailure('get_issue_transitions', 'issue', error instanceof Error ? error.message : 'Unknown error', { issueKey: args.issueKey });
        
        if (error instanceof SecurityError) {
          throw new Error(`Security violation: ${error.message}`);
        }
        throw error;
      }
    }
  );
}