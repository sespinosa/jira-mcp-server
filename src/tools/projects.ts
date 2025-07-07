import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Version3Client } from 'jira.js';
import { z } from 'zod';
import { rateLimiters, withRateLimit } from '../utils/rateLimiter.js';
import { auditLogger } from '../utils/auditLogger.js';
import { SecurityError } from '../utils/security.js';

export function registerProjectTools(server: McpServer, jiraClient: Version3Client) {
  // Get Project
  server.registerTool(
    'get_project',
    {
      title: 'Get Project',
      description: 'Get detailed information about a project',
      inputSchema: {
        projectKey: z.string().describe('Project key'),
        expand: z.array(z.string()).optional().describe('Fields to expand'),
      },
    },
    async (args) => {
      try {
        // Rate limiting and audit logging
        await withRateLimit(
          async () => {
            auditLogger.logOperation('get_project', 'project', { projectKey: args.projectKey });
            return true;
          },
          rateLimiters.standard,
          'get_project'
        );
        
        // Args are automatically validated by MCP SDK
        const validatedArgs = args;
        const project = await jiraClient.projects.getProject({
          projectIdOrKey: validatedArgs.projectKey,
          expand: validatedArgs.expand?.join(','),
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(project, null, 2)
          }]
        };
      } catch (error) {
        // Audit failure
        auditLogger.logFailure('get_project', 'project', error instanceof Error ? error.message : 'Unknown error', { projectKey: args.projectKey });
        
        if (error instanceof SecurityError) {
          throw new Error(`Security violation: ${error.message}`);
        }
        throw error;
      }
    }
  );

  // Get Project Components
  server.registerTool(
    'get_project_components',
    {
      title: 'Get Project Components',
      description: 'Get all components for a project',
      inputSchema: {
        projectKey: z.string().describe('Project key'),
      },
    },
    async (args) => {
      try {
        // Rate limiting and audit logging
        await withRateLimit(
          async () => {
            auditLogger.logOperation('get_project_components', 'project', { projectKey: args.projectKey });
            return true;
          },
          rateLimiters.standard,
          'get_project_components'
        );
        
        // Args are automatically validated by MCP SDK
        const validatedArgs = args;
        const components = await jiraClient.projectComponents.getProjectComponents({
          projectIdOrKey: validatedArgs.projectKey,
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(components, null, 2)
          }]
        };
      } catch (error) {
        // Audit failure
        auditLogger.logFailure('get_project_components', 'project', error instanceof Error ? error.message : 'Unknown error', { projectKey: args.projectKey });
        
        if (error instanceof SecurityError) {
          throw new Error(`Security violation: ${error.message}`);
        }
        throw error;
      }
    }
  );

  // Get Project Versions
  server.registerTool(
    'get_project_versions',
    {
      title: 'Get Project Versions',
      description: 'Get all versions for a project',
      inputSchema: {
        projectKey: z.string().describe('Project key'),
      },
    },
    async (args) => {
      try {
        // Rate limiting and audit logging
        await withRateLimit(
          async () => {
            auditLogger.logOperation('get_project_versions', 'project', { projectKey: args.projectKey });
            return true;
          },
          rateLimiters.standard,
          'get_project_versions'
        );
        
        // Args are automatically validated by MCP SDK
        const validatedArgs = args;
        const versions = await jiraClient.projectVersions.getProjectVersions({
          projectIdOrKey: validatedArgs.projectKey,
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(versions, null, 2)
          }]
        };
      } catch (error) {
        // Audit failure
        auditLogger.logFailure('get_project_versions', 'project', error instanceof Error ? error.message : 'Unknown error', { projectKey: args.projectKey });
        
        if (error instanceof SecurityError) {
          throw new Error(`Security violation: ${error.message}`);
        }
        throw error;
      }
    }
  );
}