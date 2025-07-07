import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Version3Client, AgileClient } from 'jira.js';
import { z } from 'zod';

export function registerBoardTools(server: McpServer, jira: Version3Client, jiraHost: string, jiraAuth: any) {
  // Create AgileClient with separate configuration
  const agile = new AgileClient({
    host: jiraHost,
    authentication: jiraAuth,
  });

  // Get all boards tool
  server.registerTool(
    'get_all_boards',
    {
      title: 'Get All Boards',
      description: 'Get all Jira boards',
      inputSchema: {
        startAt: z.number().default(0).describe('Starting index for pagination'),
        maxResults: z.number().default(50).describe('Maximum results to return'),
        type: z.enum(['scrum', 'kanban']).optional().describe('Board type filter'),
        name: z.string().optional().describe('Board name filter'),
        projectKeyOrId: z.string().optional().describe('Project key or ID filter'),
      },
    },
    async (args) => {
      // Args are automatically validated by MCP SDK
      const validatedArgs = args;
      const boards = await agile.board.getAllBoards({
        startAt: validatedArgs.startAt,
        maxResults: validatedArgs.maxResults,
        type: validatedArgs.type,
        name: validatedArgs.name,
        projectKeyOrId: validatedArgs.projectKeyOrId,
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: boards,
          }, null, 2)
        }]
      };
    }
  );

  // Get board tool
  server.registerTool(
    'get_board',
    {
      title: 'Get Board',
      description: 'Get a specific Jira board',
      inputSchema: {
        boardId: z.number().describe('Board ID'),
      },
    },
    async (args) => {
      // Args are automatically validated by MCP SDK
      const validatedArgs = args;
      const board = await agile.board.getBoard({
        boardId: validatedArgs.boardId,
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: board,
          }, null, 2)
        }]
      };
    }
  );

  // Get board configuration tool
  server.registerTool(
    'get_board_configuration',
    {
      title: 'Get Board Configuration',
      description: 'Get board configuration',
      inputSchema: {
        boardId: z.number().describe('Board ID'),
      },
    },
    async (args) => {
      // Args are automatically validated by MCP SDK
      const validatedArgs = args;
      const config = await agile.board.getConfiguration({
        boardId: validatedArgs.boardId,
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: config,
          }, null, 2)
        }]
      };
    }
  );

  // Get board issues tool
  server.registerTool(
    'get_board_issues',
    {
      title: 'Get Board Issues',
      description: 'Get issues on a board',
      inputSchema: {
        boardId: z.number().describe('Board ID'),
        startAt: z.number().default(0).describe('Starting index for pagination'),
        maxResults: z.number().default(50).describe('Maximum results to return'),
        jql: z.string().optional().describe('JQL filter'),
      },
    },
    async (args) => {
      // Args are automatically validated by MCP SDK
      const validatedArgs = args;
      const issues = await agile.board.getIssuesForBoard({
        boardId: validatedArgs.boardId,
        startAt: validatedArgs.startAt,
        maxResults: validatedArgs.maxResults,
        jql: validatedArgs.jql,
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: issues,
          }, null, 2)
        }]
      };
    }
  );
}