import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Version3Client } from 'jira.js';
import { z } from 'zod';
import { createReadStream, writeFileSync } from 'fs';
import {
  validateFilePath,
  validateSavePath,
  validateDestructiveOperation,
  SecurityError,
} from '../utils/security.js';
import { logFileOperation, logDestructiveOperation } from '../utils/auditLogger.js';

export function registerAttachmentTools(server: McpServer, jira: Version3Client) {
  // Upload attachment tool
  server.registerTool(
    'upload_attachment',
    {
      title: 'Upload Attachment',
      description: 'Upload a file attachment to a Jira issue',
      inputSchema: {
        issueKey: z.string().describe('Issue key (e.g., PROJ-123)'),
        filePath: z.string().describe('Path to the file to upload'),
        fileName: z.string().optional().describe('Optional custom filename'),
        allowedExtensions: z.array(z.string()).optional().describe('Allowed file extensions'),
        maxFileSize: z.number().optional().describe('Maximum file size in bytes'),
        allowedDirectories: z.array(z.string()).optional().describe('Allowed source directories'),
      },
    },
    async (args) => {
      try {
        // Args are automatically validated by MCP SDK
        const validatedArgs = args;
        // Validate file path securely
        const validatedPath = validateFilePath(validatedArgs.filePath, {
          allowedExtensions: validatedArgs.allowedExtensions,
          maxFileSize: validatedArgs.maxFileSize,
          allowedDirectories: validatedArgs.allowedDirectories,
        });

        const attachment = await jira.issueAttachments.addAttachment({
          issueIdOrKey: validatedArgs.issueKey,
          attachment: {
            filename: validatedArgs.fileName || validatedPath.split('/').pop()!,
            file: createReadStream(validatedPath),
          },
        });

        logFileOperation('upload_attachment', validatedPath, true);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  data: attachment,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        if (error instanceof SecurityError) {
          throw new Error(`Security validation failed: ${error.message}`);
        }
        throw error;
      }
    }
  );

  // Download attachment tool
  server.registerTool(
    'download_attachment',
    {
      title: 'Download Attachment',
      description: 'Download an attachment from Jira',
      inputSchema: {
        attachmentId: z.string().describe('Attachment ID'),
        savePath: z.string().describe('Path to save the file'),
        allowedDirectories: z
          .array(z.string())
          .optional()
          .describe('Allowed directories for saving'),
      },
    },
    async (args) => {
      try {
        // Args are automatically validated by MCP SDK
        const validatedArgs = args;
        // Validate save path securely
        const validatedSavePath = validateSavePath(validatedArgs.savePath, {
          allowedDirectories: validatedArgs.allowedDirectories,
        });

        // Get attachment metadata first
        const attachment = await jira.issueAttachments.getAttachment({
          id: validatedArgs.attachmentId,
        });

        // Download the actual file content using the attachment's content URL
        // Note: For a complete implementation, you would need to:
        // 1. Use fetch/axios to download from attachment.content URL
        // 2. Handle authentication headers
        // 3. Stream the response to file for large files
        // For now, we save the metadata and inform user about limitation
        const attachmentInfo = {
          id: attachment.id,
          filename: attachment.filename,
          size: attachment.size,
          mimeType: attachment.mimeType,
          contentUrl: attachment.content,
          note: 'This saves attachment metadata. For actual file download, use the contentUrl directly.',
        };
        
        writeFileSync(validatedSavePath, JSON.stringify(attachmentInfo, null, 2));

        logFileOperation('download_attachment', validatedSavePath, true);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  data: {
                    fileName: attachment.filename,
                    size: attachment.size,
                    mimeType: attachment.mimeType,
                    savedTo: validatedSavePath,
                    contentUrl: attachment.content,
                    note: 'Metadata saved. Use contentUrl for actual file download.',
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        if (error instanceof SecurityError) {
          throw new Error(`Security validation failed: ${error.message}`);
        }
        throw error;
      }
    }
  );

  // List attachments tool
  server.registerTool(
    'list_attachments',
    {
      title: 'List Attachments',
      description: 'List all attachments on a Jira issue',
      inputSchema: {
        issueKey: z.string().describe('Issue key (e.g., PROJ-123)'),
      },
    },
    async (args) => {
      // Args are automatically validated by MCP SDK
      const validatedArgs = args;
      const issue = await jira.issues.getIssue({
        issueIdOrKey: validatedArgs.issueKey,
        fields: ['attachment'],
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                data: issue.fields.attachment || [],
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // Delete attachment tool
  server.registerTool(
    'delete_attachment',
    {
      title: 'Delete Attachment',
      description: 'Delete an attachment from Jira (DESTRUCTIVE - requires confirmation)',
      inputSchema: {
        attachmentId: z.string().describe('Attachment ID'),
        confirmation: z
          .string()
          .optional()
          .describe('Required confirmation phrase: CONFIRM_DELETE'),
      },
    },
    async (args) => {
      try {
        // Args are automatically validated by MCP SDK
        const validatedArgs = args;
        // Validate destructive operation
        validateDestructiveOperation(
          `delete_attachment:${validatedArgs.attachmentId}`,
          validatedArgs.confirmation
        );

        await jira.issueAttachments.removeAttachment({
          id: validatedArgs.attachmentId,
        });

        logDestructiveOperation(
          'delete_attachment',
          'attachment',
          validatedArgs.attachmentId,
          true
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Attachment deleted successfully',
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        if (error instanceof SecurityError) {
          throw new Error(`Security validation failed: ${error.message}`);
        }
        throw error;
      }
    }
  );

  // Get attachment metadata tool
  server.registerTool(
    'get_attachment_meta',
    {
      title: 'Get Attachment Metadata',
      description: 'Get attachment metadata',
      inputSchema: {
        attachmentId: z.string().describe('Attachment ID'),
      },
    },
    async (args) => {
      // Args are automatically validated by MCP SDK
      const validatedArgs = args;

      const attachment = await jira.issueAttachments.getAttachment({
        id: validatedArgs.attachmentId,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                data: attachment,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
