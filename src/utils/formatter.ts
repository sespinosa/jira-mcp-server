import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export interface MCPResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

export function formatResponse(response: MCPResponse): CallToolResult {
  if (response.success) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              data: response.data,
              message: response.message,
            },
            null,
            2
          ),
        },
      ],
    };
  } else {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: response.error,
              message: response.message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}

