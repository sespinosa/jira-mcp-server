# Jira MCP Server

A Model Context Protocol (MCP) server for Jira integration. This server enables AI assistants like Claude to interact with Jira Cloud instances.

## Features

- 🎫 Issue management (create, read, update, search)
- 📋 Project listing
- 🔍 JQL search capabilities
- 🔐 API token authentication
- 📝 TypeScript implementation
- 🖥️ Cross-platform support (Windows, macOS, Linux)

## System Requirements

- Node.js 18.x or higher
- npm or yarn
- Jira Cloud instance (does not work with Jira Server/Data Center)

## Quick Start

### 1. Installation

```bash
npm install
```

### 2. Configuration

Create a `.env` file in the project root:

```env
JIRA_HOST=your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token-here
```

### 3. Generate API Token

1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Give it a meaningful label
4. Copy the token to your `.env` file

### 4. Build and Run

```bash
npm run build
npm start
```

## Available Tools

### Issue Management
- `jira_create_issue` - Create new issues
- `jira_get_issue` - Get detailed issue information
- `jira_update_issue` - Update issue fields
- `jira_search_issues` - Search issues using JQL
- `jira_list_projects` - List all accessible projects

## Example Usage

### Creating an Issue
```javascript
{
  "projectKey": "PROJ",
  "summary": "Fix login bug",
  "description": "Users cannot log in with special characters in password",
  "issueType": "Bug"
}
```

### Searching Issues
```javascript
{
  "jql": "project = PROJ AND status = \"In Progress\" AND assignee = currentUser()",
  "maxResults": 20
}
```

### Getting Issue Details
```javascript
{
  "issueKey": "PROJ-123"
}
```

## Configuration for Claude Desktop

Add this to your Claude Desktop MCP configuration:

### macOS/Linux
```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["/path/to/jira-mcp-server/build/index.js"],
      "env": {
        "JIRA_HOST": "your-domain.atlassian.net",
        "JIRA_EMAIL": "your-email@example.com",
        "JIRA_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

### Windows
```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["C:\\path\\to\\jira-mcp-server\\build\\index.js"],
      "env": {
        "JIRA_HOST": "your-domain.atlassian.net",
        "JIRA_EMAIL": "your-email@example.com",
        "JIRA_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

## Authentication

Uses Basic Authentication with email + API token. This is the most secure method for Jira Cloud.

## Error Handling

The server includes comprehensive error handling for:
- Invalid credentials
- Network timeouts
- Invalid JQL queries
- Missing permissions
- Non-existent resources

All errors are returned in a structured format with helpful messages.

## Development

### Building
```bash
npm run build
```

### Testing
```bash
# Test the server
node build/index.js
```

## Troubleshooting

### Common Issues

1. **Server won't start:**
   - Check your `.env` file is properly configured
   - Verify your API token is valid
   - Ensure Node.js version is 18+

2. **Permission errors:**
   - Verify your Jira user has appropriate permissions
   - Check that the project key exists and is accessible

3. **Connection issues:**
   - Verify your Jira host URL is correct
   - Check network connectivity to Jira Cloud

## License

ISC

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute to this project.

## Support

For issues and feature requests, please use the GitHub issue tracker.