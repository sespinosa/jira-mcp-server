import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Version3Client, AgileClient } from 'jira.js';
import { z } from 'zod';
import { sanitizeJQL, SecurityError } from '../utils/security.js';
import { rateLimiters, withRateLimit } from '../utils/rateLimiter.js';
import { auditLogger, logJQLSearch } from '../utils/auditLogger.js';

export function registerSprintTools(server: McpServer, jiraClient: Version3Client, jiraHost: string, auth: any) {
  const agile = new AgileClient({
    host: jiraHost,
    authentication: auth,
  });

  // Get Sprint
  server.registerTool(
    'get_sprint',
    {
      title: 'Get Sprint',
      description: 'Get detailed information about a sprint',
      inputSchema: {
        sprintId: z.number().describe('Sprint ID'),
      },
    },
    async (args) => {
      try {
        // Rate limiting and audit logging
        await withRateLimit(
          async () => {
            auditLogger.logOperation('get_sprint', 'sprint', { sprintId: args.sprintId });
            return true;
          },
          rateLimiters.standard,
          'get_sprint'
        );
        
        // Args are automatically validated by MCP SDK
        const validatedArgs = args;
        const sprint = await agile.sprint.getSprint({
          sprintId: validatedArgs.sprintId,
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(sprint, null, 2)
          }]
        };
      } catch (error) {
        // Audit failure
        auditLogger.logFailure('get_sprint', 'sprint', error instanceof Error ? error.message : 'Unknown error', { sprintId: args.sprintId });
        
        if (error instanceof SecurityError) {
          throw new Error(`Security violation: ${error.message}`);
        }
        throw error;
      }
    }
  );

  // Get Board Sprints
  server.registerTool(
    'get_board_sprints',
    {
      title: 'Get Board Sprints',
      description: 'Get all sprints for a board',
      inputSchema: {
        boardId: z.number().describe('Board ID'),
        state: z.enum(['active', 'closed', 'future']).optional().describe('Sprint state filter'),
        maxResults: z.number().default(50).describe('Maximum results'),
      },
    },
    async (args) => {
      try {
        // Rate limiting and audit logging
        await withRateLimit(
          async () => {
            auditLogger.logOperation('get_board_sprints', 'sprint', { boardId: args.boardId, state: args.state });
            return true;
          },
          rateLimiters.standard,
          'get_board_sprints'
        );
        
        // Args are automatically validated by MCP SDK
        const validatedArgs = args;
        const sprints = await agile.board.getAllSprints({
          boardId: validatedArgs.boardId,
          state: validatedArgs.state,
          maxResults: validatedArgs.maxResults,
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(sprints.values || sprints, null, 2)
          }]
        };
      } catch (error) {
        // Audit failure
        auditLogger.logFailure('get_board_sprints', 'sprint', error instanceof Error ? error.message : 'Unknown error', { boardId: args.boardId });
        
        if (error instanceof SecurityError) {
          throw new Error(`Security violation: ${error.message}`);
        }
        throw error;
      }
    }
  );

  // Get Sprint Issues
  server.registerTool(
    'get_sprint_issues',
    {
      title: 'Get Sprint Issues',
      description: 'Get all issues in a sprint',
      inputSchema: {
        sprintId: z.number().describe('Sprint ID'),
        jql: z.string().optional().describe('Additional JQL filter'),
        maxResults: z.number().default(50).describe('Maximum results'),
      },
    },
    async (args) => {
      try {
        // Rate limiting and audit logging
        await withRateLimit(
          async () => {
            auditLogger.logOperation('get_sprint_issues', 'sprint', { sprintId: args.sprintId, jql: args.jql });
            return true;
          },
          rateLimiters.search,
          'get_sprint_issues'
        );
        
        // Args are automatically validated by MCP SDK
        const validatedArgs = args;
        
        // JQL sanitization if provided
        let sanitizedJQL = validatedArgs.jql;
        if (validatedArgs.jql) {
          sanitizedJQL = sanitizeJQL(validatedArgs.jql);
        }
        
        const issues = await agile.sprint.getIssuesForSprint({
          sprintId: validatedArgs.sprintId,
          jql: sanitizedJQL,
          maxResults: validatedArgs.maxResults,
        });
        
        // Log successful search if JQL was used
        if (sanitizedJQL) {
          logJQLSearch(sanitizedJQL, issues.issues?.length || 0, true);
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(issues, null, 2)
          }]
        };
      } catch (error) {
        // Audit failure
        auditLogger.logFailure('get_sprint_issues', 'sprint', error instanceof Error ? error.message : 'Unknown error', { sprintId: args.sprintId, jql: args.jql });
        
        // Log JQL search failure if JQL was used
        if (args.jql) {
          logJQLSearch(args.jql, 0, false, error instanceof Error ? error.message : 'Unknown error');
        }
        
        if (error instanceof SecurityError) {
          throw new Error(`Security violation: ${error.message}`);
        }
        throw error;
      }
    }
  );

  // Create Sprint
  server.registerTool(
    'create_sprint',
    {
      title: 'Create Sprint',
      description: 'Create a new sprint in a Scrum board',
      inputSchema: {
        boardId: z.number().describe('Board ID'),
        name: z.string().describe('Sprint name'),
        goal: z.string().optional().describe('Sprint goal'),
        startDate: z.string().optional().describe('Start date (ISO format)'),
        endDate: z.string().optional().describe('End date (ISO format)'),
      },
    },
    async (args) => {
      try {
        // Rate limiting and audit logging
        await withRateLimit(
          async () => {
            auditLogger.logOperation('create_sprint', 'sprint', { boardId: args.boardId, name: args.name }, {
              riskLevel: 'high'
            });
            return true;
          },
          rateLimiters.standard,
          'create_sprint'
        );
        
        // Args are automatically validated by MCP SDK
        const validatedArgs = args;
        
        // Validate sprint name and goal for dangerous content
        const dangerousPatterns = [
          /<script[^>]*>.*?<\/script>/gi,
          /javascript:/gi,
          /vbscript:/gi,
          /onload=/gi,
          /onerror=/gi,
        ];
        
        for (const pattern of dangerousPatterns) {
          if (pattern.test(validatedArgs.name)) {
            throw new SecurityError(
              `Sprint name contains dangerous pattern: ${pattern}`,
              'DANGEROUS_CONTENT_PATTERN'
            );
          }
          if (validatedArgs.goal && pattern.test(validatedArgs.goal)) {
            throw new SecurityError(
              `Sprint goal contains dangerous pattern: ${pattern}`,
              'DANGEROUS_CONTENT_PATTERN'
            );
          }
        }
        const sprint = await agile.sprint.createSprint({
          name: validatedArgs.name,
          originBoardId: validatedArgs.boardId,
          goal: validatedArgs.goal,
          startDate: validatedArgs.startDate,
          endDate: validatedArgs.endDate,
        });

        // Log successful creation
        auditLogger.logSuccess('create_sprint', 'sprint', { sprintId: sprint.id, boardId: validatedArgs.boardId, name: validatedArgs.name });
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: sprint,
            }, null, 2)
          }]
        };
      } catch (error) {
        // Audit failure
        auditLogger.logFailure('create_sprint', 'sprint', error instanceof Error ? error.message : 'Unknown error', { boardId: args.boardId, name: args.name });
        
        if (error instanceof SecurityError) {
          throw new Error(`Security violation: ${error.message}`);
        }
        throw error;
      }
    }
  );
}