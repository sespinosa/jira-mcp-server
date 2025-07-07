# Jira MCP Server

A modern Model Context Protocol (MCP) server for Jira using the `jira.js` library. This server enables natural language interactions with Jira through AI assistants like Claude.

## Features

- 🔄 Complete Jira Cloud API integration
- 🎫 Issue management (create, read, update, link)
- 📋 Project and component management
- 🏃‍♂️ Sprint and Agile board operations
- 📎 Attachment handling
- 👥 User and permission management
- 🔍 Advanced JQL search capabilities
- 🔐 OAuth 2.0 and API token authentication
- 📝 TypeScript-first implementation
- ⚡ Modern jira.js library (actively maintained)
- 🖥️ Cross-platform support (Windows, macOS, Linux)

## System Requirements

- Node.js 18.x or higher
- npm or yarn
- Windows, macOS, or Linux operating system
- Jira Cloud instance (does not work with Jira Server/Data Center)

## Quick Start

### 1. Installation

```bash
npm install
```

### 2. Configuration

Create a `.env` file in the project root and configure your Jira settings:

**For Windows (PowerShell):**
```powershell
New-Item -Path .env -ItemType File
```

**For macOS/Linux:**
```bash
touch .env
```

Edit `.env` with your Jira details:

```env
JIRA_HOST=your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token-here
JIRA_AUTH_TYPE=basic
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

Or for development:

```bash
npm run dev
```

## Available Tools

### Issue Management
- `create_issue` - Create new issues or subtasks
- `get_issue` - Get detailed issue information
- `update_issue` - Update issue fields, add comments, or transition
- `bulk_update_issues` - Update multiple issues at once
- `link_issues` - Create links between issues

### Search & Discovery
- `search_issues` - Advanced JQL-based issue search
- `search_users` - Find users in Jira
- `search_projects` - Search for projects
- `get_issue_transitions` - Get available transitions for an issue
- `get_issue_comments` - Get comments on an issue

### Project Management
- `get_project` - Get project details
- `get_all_projects` - List all accessible projects
- `get_project_components` - Get project components
- `get_project_versions` - Get project versions
- `create_project_component` - Create new components
- `create_project_version` - Create new versions
- `get_project_issue_types` - Get issue types for a project
- `get_project_roles` - Get project roles

### Sprint & Agile
- `create_sprint` - Create new sprints
- `start_sprint` - Start a sprint
- `complete_sprint` - Complete/close a sprint
- `move_issues_to_sprint` - Move issues to a sprint
- `get_sprint_issues` - Get all issues in a sprint
- `get_board_sprints` - Get sprints for a board
- `get_sprint` - Get sprint details
- `update_sprint` - Update sprint information

### Board Management
- `get_all_boards` - Get all accessible boards
- `get_board` - Get board details
- `get_board_issues` - Get issues on a board
- `get_board_backlog` - Get backlog issues
- `get_board_configuration` - Get board configuration
- `create_board` - Create new boards
- `get_board_projects` - Get projects for a board
- `get_board_versions` - Get versions for a board

### Attachments
- `upload_attachment` - Upload files to issues
- `download_attachment` - Download attachments
- `list_attachments` - List issue attachments
- `delete_attachment` - Delete attachments
- `get_attachment_meta` - Get attachment metadata

### User Management
- `get_user` - Get user information
- `get_current_user` - Get current authenticated user
- `find_assignable_users` - Find users that can be assigned
- `find_users_with_permissions` - Find users with specific permissions
- `get_user_groups` - Get user group memberships
- `get_all_users` - Get all users (admin required)

## Example Usage

### Creating an Issue
```javascript
await callTool('create_issue', {
  projectKey: 'PROJ',
  summary: 'Fix login bug',
  description: 'Users cannot log in with special characters in password',
  issueType: 'Bug',
  priority: 'High'
});
```

### Searching Issues
```javascript
await callTool('search_issues', {
  jql: 'project = PROJ AND status = "In Progress" AND assignee = currentUser()',
  maxResults: 20
});
```

### Sprint Management
```javascript
// Create a sprint
await callTool('create_sprint', {
  boardId: 123,
  name: 'Sprint 24',
  goal: 'Complete user authentication features'
});

// Move issues to sprint
await callTool('move_issues_to_sprint', {
  sprintId: 456,
  issueKeys: ['PROJ-1', 'PROJ-2', 'PROJ-3']
});
```

## Configuration for Claude Desktop

### Windows Configuration

1. Open Claude Desktop settings
2. Navigate to MCP server configuration
3. Add the following configuration (adjust the path to match your installation):

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["C:\\Users\\YourUsername\\jira-mcp-server\\build\\index.js"],
      "env": {
        "JIRA_HOST": "your-domain.atlassian.net",
        "JIRA_EMAIL": "your-email@example.com",
        "JIRA_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

**Note:** Use double backslashes (`\\`) in Windows paths or use forward slashes (`/`) which also work on Windows.

### macOS/Linux Configuration

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["/home/username/jira-mcp-server/build/index.js"],
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

### Basic Authentication (Recommended)
Uses email + API token. This is the most common and secure method for Jira Cloud.

### OAuth 2.0
For more advanced use cases. Set `JIRA_AUTH_TYPE=oauth2` and provide an access token.

## Error Handling

The server includes comprehensive error handling:
- Invalid credentials
- Network timeouts
- Rate limiting
- Invalid JQL queries
- Missing permissions
- Non-existent resources

All errors are returned in a structured format with helpful messages.

## Development

### Building
```bash
npm run build
```

### Type Checking
```bash
npx tsc --noEmit
```

### Linting
```bash
npm run lint
```

## Windows-Specific Instructions

### Installation on Windows

1. **Install Node.js:**
   - Download from [nodejs.org](https://nodejs.org/)
   - Choose the LTS version
   - The installer will automatically add Node.js to your PATH

2. **Clone or download the project:**
   ```powershell
   git clone https://github.com/your-repo/jira-mcp-server.git
   cd jira-mcp-server
   ```

3. **Install dependencies:**
   ```powershell
   npm install
   ```

4. **Build the project:**
   ```powershell
   npm run build
   ```

### Running on Windows

The server runs locally on your Windows machine and communicates with Claude Desktop via standard input/output.

**Test the server manually:**
```powershell
node build\index.js
```

**Common Windows Issues:**

1. **Path not found errors:**
   - Use forward slashes `/` even on Windows, or escape backslashes `\\`
   - Ensure no spaces in the installation path, or wrap paths in quotes

2. **Permission errors:**
   - Run PowerShell as Administrator if needed
   - Check Windows Defender or antivirus settings

3. **Environment variables not loading:**
   - Ensure `.env` file is in the project root
   - Use full absolute paths in Claude Desktop config

### Windows Service (Optional)

To run the MCP server as a Windows service:

1. Install `node-windows`:
   ```powershell
   npm install -g node-windows
   ```

2. Create a service script (see documentation for details)

## License

ISC

## Support

For issues and feature requests, please check the Jira documentation and the jira.js library documentation.