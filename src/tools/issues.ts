import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Version3Client } from 'jira.js';
import { z } from 'zod';
import { validateIssueFields, safeFieldSets, FieldValidationError } from '../utils/fieldValidation.js';
import { rateLimiters, withRateLimit } from '../utils/rateLimiter.js';
import { auditLogger } from '../utils/auditLogger.js';
import { SecurityError } from '../utils/security.js';

export function registerIssueTools(server: McpServer, jiraClient: Version3Client) {
  // Create Issue
  server.registerTool(
    'create_issue',
    {
      title: 'Create Issue',
      description: 'Create a new Jira issue',
      inputSchema: {
        projectKey: z.string().describe('Project key'),
        summary: z.string().describe('Issue summary'),
        description: z.string().optional().describe('Issue description'),
        issueType: z.string().default('Task').describe('Issue type'),
        priority: z.string().optional().describe('Priority'),
        assignee: z.string().optional().describe('Assignee account ID'),
        labels: z.array(z.string()).optional().describe('Labels'),
      },
    },
    async (args) => {
      try {
        // Rate limiting and audit logging
        await withRateLimit(
          async () => {
            auditLogger.logOperation('create_issue', 'issue', { projectKey: args.projectKey, summary: args.summary });
            return true;
          },
          rateLimiters.standard,
          'create_issue'
        );
        
        // Validate args using Zod for runtime validation
        const createSchema = z.object({
          projectKey: z.string(),
          summary: z.string(),
          description: z.string().optional(),
          issueType: z.string().default('Task'),
          priority: z.string().optional(),
          assignee: z.string().optional(),
          labels: z.array(z.string()).optional(),
        });
        const validatedArgs = createSchema.parse(args);
        // Prepare fields for validation
        const issueFields: Record<string, any> = {
          project: { key: validatedArgs.projectKey },
          summary: validatedArgs.summary,
          issuetype: { name: validatedArgs.issueType },
        };
        
        if (validatedArgs.description) {
          issueFields.description = {
            type: 'doc',
            version: 1,
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: validatedArgs.description }]
            }]
          };
        }
        
        if (validatedArgs.priority) issueFields.priority = { name: validatedArgs.priority };
        if (validatedArgs.assignee) issueFields.assignee = { accountId: validatedArgs.assignee };
        if (validatedArgs.labels) issueFields.labels = validatedArgs.labels;
        
        // Validate fields for security
        const validatedFields = validateIssueFields(issueFields, {
          allowedFields: safeFieldSets.basic,
          blockDangerousValues: true
        });
        
        const issue = await jiraClient.issues.createIssue({
          fields: validatedFields as any,
        });
        
        // Log successful creation
        auditLogger.logSuccess('create_issue', 'issue', { issueKey: issue.key, projectKey: validatedArgs.projectKey });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: {
                key: issue.key,
                id: issue.id,
                self: issue.self,
              },
            }, null, 2)
          }]
        };
      } catch (error) {
        // Audit failure
        auditLogger.logFailure('create_issue', 'issue', error instanceof Error ? error.message : 'Unknown error', { projectKey: args.projectKey });
        
        if (error instanceof FieldValidationError) {
          throw new Error(`Field validation failed: ${error.message}`);
        }
        if (error instanceof SecurityError) {
          throw new Error(`Security violation: ${error.message}`);
        }
        throw error;
      }
    }
  );

  // Update Issue  
  server.registerTool(
    'update_issue',
    {
      title: 'Update Issue',
      description: 'Update a Jira issue',
      inputSchema: {
        issueKey: z.string().describe('Issue key'),
        summary: z.string().optional().describe('New summary'),
        description: z.string().optional().describe('New description'),
        priority: z.string().optional().describe('New priority'),
        assignee: z.string().optional().describe('New assignee account ID'),
        labels: z.array(z.string()).optional().describe('New labels'),
      },
    },
    async (args) => {
      try {
        // Rate limiting and audit logging
        await withRateLimit(
          async () => {
            auditLogger.logOperation('update_issue', 'issue', { issueKey: args.issueKey });
            return true;
          },
          rateLimiters.standard,
          'update_issue'
        );
        
        // Validate args using Zod for runtime validation
        const updateSchema = z.object({
          issueKey: z.string(),
          summary: z.string().optional(),
          description: z.string().optional(),
          priority: z.string().optional(),
          assignee: z.string().optional(),
          labels: z.array(z.string()).optional(),
        });
        const validatedArgs = updateSchema.parse(args);
        const fields: any = {};
        
        if (validatedArgs.summary) fields.summary = validatedArgs.summary;
        if (validatedArgs.description) {
          fields.description = {
            type: 'doc',
            version: 1,
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: validatedArgs.description }]
            }]
          };
        }
        if (validatedArgs.priority) fields.priority = { name: validatedArgs.priority };
        if (validatedArgs.assignee) fields.assignee = { accountId: validatedArgs.assignee };
        if (validatedArgs.labels) fields.labels = validatedArgs.labels;

        // Validate fields for security
        const validatedFields = validateIssueFields(fields, {
          allowedFields: safeFieldSets.basic,
          blockDangerousValues: true
        });

        await jiraClient.issues.editIssue({
          issueIdOrKey: validatedArgs.issueKey,
          fields: validatedFields,
        });
        
        // Log successful update
        auditLogger.logSuccess('update_issue', 'issue', { issueKey: validatedArgs.issueKey, updatedFields: Object.keys(validatedFields) });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Issue ${validatedArgs.issueKey} updated successfully`,
            }, null, 2)
          }]
        };
      } catch (error) {
        // Audit failure
        auditLogger.logFailure('update_issue', 'issue', error instanceof Error ? error.message : 'Unknown error', { issueKey: args.issueKey });
        
        if (error instanceof FieldValidationError) {
          throw new Error(`Field validation failed: ${error.message}`);
        }
        if (error instanceof SecurityError) {
          throw new Error(`Security violation: ${error.message}`);
        }
        throw error;
      }
    }
  );
}