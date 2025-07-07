#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Version3Client } from 'jira.js';
import { z } from 'zod';
import dotenv from 'dotenv';

import { envSchema, getJiraAuthentication, getJiraHost } from './utils/auth.js';
import { sanitizeJQL, SecurityError } from './utils/security.js';
import { rateLimiters, withRateLimit } from './utils/rateLimiter.js';
import { auditLogger, logJQLSearch } from './utils/auditLogger.js';
import { registerAttachmentTools } from './tools/attachments.js';
import { registerBoardTools } from './tools/boards.js';
import { registerIssueTools } from './tools/issues.js';
import { registerProjectTools } from './tools/projects.js';
import { registerSearchTools } from './tools/search.js';
import { registerUserTools } from './tools/users.js';
import { registerSprintTools } from './tools/sprints.js';

dotenv.config();

class JiraMCPServer {
  private server: McpServer;
  private jiraClient: Version3Client;
  private env: z.infer<typeof envSchema>;

  constructor() {
    this.env = envSchema.parse(process.env);

    // Initialize Jira client
    this.jiraClient = new Version3Client({
      host: getJiraHost(this.env),
      authentication: getJiraAuthentication(this.env),
    });

    // Initialize MCP server
    this.server = new McpServer({
      name: 'jira-mcp-server',
      version: '0.0.1',
    });

    this.setupHandlers();
    this.registerTools();
  }

  private setupHandlers() {
    // Global error handlers for unhandled promises
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('SIGINT', async () => {
      void this.server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      void this.server.close();
      process.exit(0);
    });
  }

  private registerTools() {
    // Get issue with all metadata
    this.server.registerTool(
      'get_issue',
      {
        title: 'Get Issue Details',
        description:
          'Get comprehensive issue details including comments, attachments, and all metadata',
        inputSchema: {
          issueKey: z.string().describe('Issue key (e.g., PROJ-123)'),
          includeComments: z.boolean().default(true).describe('Include issue comments'),
          includeAttachments: z.boolean().default(true).describe('Include attachment metadata'),
          includeWorklog: z.boolean().default(false).describe('Include work logs'),
          includeHistory: z.boolean().default(false).describe('Include change history'),
        },
      },
      async (args) => {
        try {
          // Rate limiting and audit logging
          await withRateLimit(
            async () => {
              auditLogger.logOperation('get_issue', 'issue', { issueKey: args.issueKey });
              return true;
            },
            rateLimiters.standard,
            'get_issue'
          );

          // Validate args with Zod
          const getIssueSchema = z.object({
            issueKey: z.string(),
            includeComments: z.boolean().default(true),
            includeAttachments: z.boolean().default(true),
            includeWorklog: z.boolean().default(false),
            includeHistory: z.boolean().default(false),
          });
          const validatedArgs = getIssueSchema.parse(args);
          // Build expand fields based on what's requested
          const expandFields = [
            'renderedFields',
            'names',
            'schema',
            'transitions',
            'operations',
            'editmeta',
          ];
          if (validatedArgs.includeHistory) expandFields.push('changelog');

          // Get issue with expanded fields
          const issue = await this.jiraClient.issues.getIssue({
            issueIdOrKey: validatedArgs.issueKey,
            expand: expandFields.join(','),
          });

          // Get comments if requested
          let comments = null;
          if (validatedArgs.includeComments) {
            const commentsResponse = await this.jiraClient.issueComments.getComments({
              issueIdOrKey: validatedArgs.issueKey,
              maxResults: 100,
              orderBy: 'created',
            });
            comments = commentsResponse.comments;
          }

          // Get worklogs if requested
          let worklogs = null;
          if (validatedArgs.includeWorklog) {
            const worklogResponse = await this.jiraClient.issueWorklogs.getIssueWorklog({
              issueIdOrKey: validatedArgs.issueKey,
              maxResults: 100,
            });
            worklogs = worklogResponse.worklogs;
          }

          // Structure the response with all metadata
          const response = {
            key: issue.key,
            id: issue.id,
            self: issue.self,
            fields: {
              summary: issue.fields.summary,
              description: issue.fields.description,
              status: issue.fields.status,
              priority: issue.fields.priority,
              issueType: issue.fields.issuetype,
              reporter: issue.fields.reporter,
              assignee: issue.fields.assignee,
              creator: issue.fields.creator,
              created: issue.fields.created,
              updated: issue.fields.updated,
              duedate: issue.fields.duedate,
              resolutiondate: issue.fields.resolutiondate,
              project: issue.fields.project,
              components: issue.fields.components,
              fixVersions: issue.fields.fixVersions,
              affectedVersions: issue.fields.versions,
              labels: issue.fields.labels,
              resolution: issue.fields.resolution,
              environment: issue.fields.environment,
              timetracking: issue.fields.timetracking,
              timeSpent: issue.fields.timespent,
              timeEstimate: issue.fields.timeestimate,
              aggregateTimeSpent: issue.fields.aggregatetimespent,
              aggregateTimeOriginalEstimate: issue.fields.aggregatetimeoriginalestimate,
              attachments: issue.fields.attachment?.map((att) => ({
                id: att.id,
                filename: att.filename,
                size: att.size,
                mimeType: att.mimeType,
                created: att.created,
                author: att.author,
                thumbnail: att.thumbnail,
              })),
              issuelinks: issue.fields.issuelinks,
              parent: issue.fields.parent,
              subtasks: issue.fields.subtasks,
              ...Object.entries(issue.fields)
                .filter(([key]) => key.startsWith('customfield_'))
                .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
            },
            comments: comments,
            worklogs: worklogs,
            transitions: issue.transitions,
            changelog: issue.changelog,
            renderedFields: issue.renderedFields,
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response, null, 2),
              },
            ],
          };
        } catch (error) {
          // Audit failure
          auditLogger.logFailure(
            'get_issue',
            'issue',
            error instanceof Error ? error.message : 'Unknown error',
            { issueKey: args.issueKey }
          );

          if (error instanceof SecurityError) {
            throw new Error(`Security violation: ${error.message}`);
          }
          throw error;
        }
      }
    );

    // Search issues
    this.server.registerTool(
      'search_issues',
      {
        title: 'Search Issues',
        description: 'Search for issues using JQL (Jira Query Language)',
        inputSchema: {
          jql: z.string().describe('JQL query (e.g., "project = PROJ AND status = Open")'),
          startAt: z.number().default(0).describe('Starting index for pagination'),
          maxResults: z.number().min(1).max(100).default(50).describe('Maximum results (1-100)'),
          fields: z.array(z.string()).optional().describe('Fields to include'),
          expand: z.array(z.string()).optional().describe('Fields to expand'),
        },
      },
      async (args) => {
        try {
          // Rate limiting and audit logging
          await withRateLimit(
            async () => {
              auditLogger.logOperation('search_issues', 'search', {
                jql: args.jql,
                maxResults: args.maxResults,
              });
              return true;
            },
            rateLimiters.search,
            'search_issues'
          );

          // Validate args with Zod
          const searchIssuesSchema = z.object({
            jql: z.string(),
            startAt: z.number().default(0),
            maxResults: z.number().min(1).max(100).default(50),
            fields: z.array(z.string()).optional(),
            expand: z.array(z.string()).optional(),
          });
          const validatedArgs = searchIssuesSchema.parse(args);

          // JQL sanitization
          const sanitizedJQL = sanitizeJQL(validatedArgs.jql);

          const results = await this.jiraClient.issueSearch.searchForIssuesUsingJql({
            jql: sanitizedJQL,
            startAt: validatedArgs.startAt,
            maxResults: validatedArgs.maxResults,
            fields: validatedArgs.fields,
            expand: validatedArgs.expand?.join(','),
          });

          // Log successful search
          logJQLSearch(sanitizedJQL, results.total || 0, true);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    total: results.total,
                    startAt: results.startAt,
                    maxResults: results.maxResults,
                    issues: results.issues,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (error) {
          // Audit failure
          auditLogger.logFailure(
            'search_issues',
            'search',
            error instanceof Error ? error.message : 'Unknown error',
            { jql: args.jql }
          );
          logJQLSearch(
            args.jql,
            0,
            false,
            error instanceof Error ? error.message : 'Unknown error'
          );

          if (error instanceof SecurityError) {
            throw new Error(`Security violation: ${error.message}`);
          }
          throw error;
        }
      }
    );

    // List projects
    this.server.registerTool(
      'list_projects',
      {
        title: 'List Projects',
        description: 'List all accessible projects',
        inputSchema: {
          startAt: z.number().default(0).describe('Starting index'),
          maxResults: z.number().default(50).describe('Maximum results'),
          includeArchived: z.boolean().default(false).describe('Include archived projects'),
        },
      },
      async (args) => {
        try {
          // Rate limiting and audit logging
          await withRateLimit(
            async () => {
              auditLogger.logOperation('list_projects', 'project', { maxResults: args.maxResults });
              return true;
            },
            rateLimiters.standard,
            'list_projects'
          );

          // Validate args with Zod
          const listProjectsSchema = z.object({
            startAt: z.number().default(0),
            maxResults: z.number().default(50),
            includeArchived: z.boolean().default(false),
          });
          const validatedArgs = listProjectsSchema.parse(args);
          const projects = await this.jiraClient.projects.searchProjects({
            startAt: validatedArgs.startAt,
            maxResults: validatedArgs.maxResults,
            expand: 'description,lead,url',
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(projects.values || projects, null, 2),
              },
            ],
          };
        } catch (error) {
          // Audit failure
          auditLogger.logFailure(
            'list_projects',
            'project',
            error instanceof Error ? error.message : 'Unknown error'
          );

          if (error instanceof SecurityError) {
            throw new Error(`Security violation: ${error.message}`);
          }
          throw error;
        }
      }
    );

    // Get current user
    this.server.registerTool(
      'get_current_user',
      {
        title: 'Get Current User',
        description: 'Get information about the currently authenticated user',
        inputSchema: {},
      },
      async () => {
        try {
          // Rate limiting and audit logging
          await withRateLimit(
            async () => {
              auditLogger.logOperation('get_current_user', 'user', {});
              return true;
            },
            rateLimiters.standard,
            'get_current_user'
          );

          const user = await this.jiraClient.myself.getCurrentUser();
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
            'get_current_user',
            'user',
            error instanceof Error ? error.message : 'Unknown error'
          );

          if (error instanceof SecurityError) {
            throw new Error(`Security violation: ${error.message}`);
          }
          throw error;
        }
      }
    );

    // Get issue comments
    this.server.registerTool(
      'get_issue_comments',
      {
        title: 'Get Issue Comments',
        description: 'Get all comments for an issue',
        inputSchema: {
          issueKey: z.string().describe('Issue key'),
          maxResults: z.number().default(50).describe('Maximum results to return'),
          startAt: z.number().default(0).describe('Starting index for pagination'),
        },
      },
      async (args) => {
        try {
          // Rate limiting and audit logging
          await withRateLimit(
            async () => {
              auditLogger.logOperation('get_issue_comments', 'comment', {
                issueKey: args.issueKey,
                maxResults: args.maxResults,
              });
              return true;
            },
            rateLimiters.standard,
            'get_issue_comments'
          );

          // Validate args with Zod
          const getCommentsSchema = z.object({
            issueKey: z.string(),
            maxResults: z.number().default(50),
            startAt: z.number().default(0),
          });
          const validatedArgs = getCommentsSchema.parse(args);
          const comments = await this.jiraClient.issueComments.getComments({
            issueIdOrKey: validatedArgs.issueKey,
            maxResults: validatedArgs.maxResults,
            startAt: validatedArgs.startAt,
            orderBy: 'created',
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(comments, null, 2),
              },
            ],
          };
        } catch (error) {
          // Audit failure
          auditLogger.logFailure(
            'get_issue_comments',
            'comment',
            error instanceof Error ? error.message : 'Unknown error',
            { issueKey: args.issueKey }
          );

          if (error instanceof SecurityError) {
            throw new Error(`Security violation: ${error.message}`);
          }
          throw error;
        }
      }
    );

    // Register additional tools
    registerAttachmentTools(this.server, this.jiraClient);
    registerBoardTools(
      this.server,
      this.jiraClient,
      getJiraHost(this.env),
      getJiraAuthentication(this.env)
    );
    registerIssueTools(this.server, this.jiraClient);
    registerProjectTools(this.server, this.jiraClient);
    registerSearchTools(this.server, this.jiraClient);
    registerUserTools(this.server, this.jiraClient);
    registerSprintTools(
      this.server,
      this.jiraClient,
      getJiraHost(this.env),
      getJiraAuthentication(this.env)
    );
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Jira MCP server running on stdio - ready for connections');
  }
}

const server = new JiraMCPServer();
server.run().catch(console.error);
