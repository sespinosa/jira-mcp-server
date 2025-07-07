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
          text: JSON.stringify({
            success: true,
            data: response.data,
            message: response.message,
          }, null, 2),
        },
      ],
    };
  } else {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: response.error,
            message: response.message,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}

export function handleError(error: any): CallToolResult {
  console.error('[Jira MCP Error]', error);
  
  let errorMessage = 'An unknown error occurred';
  
  if (error?.response?.data?.errorMessages) {
    errorMessage = error.response.data.errorMessages.join('; ');
  } else if (error?.response?.data?.message) {
    errorMessage = error.response.data.message;
  } else if (error?.message) {
    errorMessage = error.message;
  }
  
  return formatResponse({
    success: false,
    error: errorMessage,
  });
}