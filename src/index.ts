#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { Version3Client } from 'jira.js';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Environment validation
const envSchema = z.object({
  JIRA_HOST: z.string().min(1),
  JIRA_EMAIL: z.string().email(),
  JIRA_API_TOKEN: z.string().min(1),
});

class JiraMCPServer {
  private server: Server;
  private jiraClient: Version3Client;

  constructor() {
    const env = envSchema.parse(process.env);

    // Initialize Jira client
    this.jiraClient = new Version3Client({
      host: `https://${env.JIRA_HOST}`,
      authentication: {
        basic: {
          email: env.JIRA_EMAIL,
          apiToken: env.JIRA_API_TOKEN,
        },
      },
    });

    // Initialize MCP server
    this.server = new Server(
      {
        name: 'jira-mcp-server',
        version: '2.0.0',
        description: 'MCP server for Jira integration',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'jira_create_issue',
          description: 'Create a new issue in Jira',
          inputSchema: {
            type: 'object',
            properties: {
              projectKey: {
                type: 'string',
                description: 'The project key (e.g., "PROJ")',
              },
              summary: {
                type: 'string',
                description: 'Issue summary/title',
              },
              description: {
                type: 'string',
                description: 'Issue description',
              },
              issueType: {
                type: 'string',
                description: 'Issue type (e.g., "Task", "Bug", "Story")',
                default: 'Task',
              },
            },
            required: ['projectKey', 'summary'],
          },
        },
        {
          name: 'jira_get_issue',
          description: 'Get details of a specific issue',
          inputSchema: {
            type: 'object',
            properties: {
              issueKey: {
                type: 'string',
                description: 'The issue key (e.g., "PROJ-123")',
              },
            },
            required: ['issueKey'],
          },
        },
        {
          name: 'jira_search_issues',
          description: 'Search for issues using JQL',
          inputSchema: {
            type: 'object',
            properties: {
              jql: {
                type: 'string',
                description: 'JQL query string',
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of results',
                default: 50,
              },
            },
            required: ['jql'],
          },
        },
        {
          name: 'jira_update_issue',
          description: 'Update an existing issue',
          inputSchema: {
            type: 'object',
            properties: {
              issueKey: {
                type: 'string',
                description: 'The issue key (e.g., "PROJ-123")',
              },
              summary: {
                type: 'string',
                description: 'New summary (optional)',
              },
              description: {
                type: 'string',
                description: 'New description (optional)',
              },
              status: {
                type: 'string',
                description: 'New status (optional)',
              },
            },
            required: ['issueKey'],
          },
        },
        {
          name: 'jira_list_projects',
          description: 'List all accessible projects',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'jira_create_issue':
            return await this.handleCreateIssue(args);
          case 'jira_get_issue':
            return await this.handleGetIssue(args);
          case 'jira_search_issues':
            return await this.handleSearchIssues(args);
          case 'jira_update_issue':
            return await this.handleUpdateIssue(args);
          case 'jira_list_projects':
            return await this.handleListProjects();
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) throw error;
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });

    // Error handling
    this.server.onerror = (error) => {
      console.error('[MCP Server Error]', error);
    };

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private async handleCreateIssue(args: any) {
    const issue = await this.jiraClient.issues.createIssue({
      fields: {
        project: { key: args.projectKey },
        summary: args.summary,
        description: args.description
          ? {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: args.description,
                    },
                  ],
                },
              ],
            }
          : undefined,
        issuetype: { name: args.issueType || 'Task' },
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              key: issue.key,
              id: issue.id,
              self: issue.self,
              url: `https://${process.env.JIRA_HOST}/browse/${issue.key}`,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleGetIssue(args: any) {
    const issue = await this.jiraClient.issues.getIssue({
      issueIdOrKey: args.issueKey,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(issue, null, 2),
        },
      ],
    };
  }

  private async handleSearchIssues(args: any) {
    const response = await this.jiraClient.issueSearch.searchForIssuesUsingJql({
      jql: args.jql,
      maxResults: args.maxResults || 50,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              total: response.total,
              issues: response.issues?.map((issue) => ({
                key: issue.key,
                summary: issue.fields.summary,
                status: issue.fields.status?.name,
                assignee: issue.fields.assignee?.displayName,
                reporter: issue.fields.reporter?.displayName,
                created: issue.fields.created,
                updated: issue.fields.updated,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleUpdateIssue(args: any) {
    const updateData: any = { fields: {} };

    if (args.summary) {
      updateData.fields.summary = args.summary;
    }

    if (args.description) {
      updateData.fields.description = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: args.description,
              },
            ],
          },
        ],
      };
    }

    await this.jiraClient.issues.editIssue({
      issueIdOrKey: args.issueKey,
      ...updateData,
    });

    // Get updated issue
    const issue = await this.jiraClient.issues.getIssue({
      issueIdOrKey: args.issueKey,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              key: issue.key,
              summary: issue.fields.summary,
              updated: issue.fields.updated,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleListProjects() {
    const response = await this.jiraClient.projects.searchProjects();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            response.values?.map((project) => ({
              key: project.key,
              name: project.name,
              id: project.id,
              projectTypeKey: project.projectTypeKey,
            })) || [],
            null,
            2
          ),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Jira MCP server running on stdio');
  }
}

const server = new JiraMCPServer();
server.run().catch(console.error);
