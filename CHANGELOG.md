# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2025-07-07

### Added
- 🎉 First public release of Jira MCP Server (untested in production)
- **Core Tools (Production Tested):**
  - `get_issue` - Retrieve comprehensive issue details with metadata, comments, attachments
  - `search_issues` - Search issues using JQL with pagination (tested with 55+ tickets)
  - `list_projects` - List all accessible projects (tested with 31 projects)
  - `get_current_user` - Get authenticated user information  
  - `get_issue_comments` - Retrieve issue comments with pagination

- **Security Features:**
  - Input validation with Zod schemas
  - JQL query length limits (1000 characters)
  - Secure API token authentication
  - Environment variable credential management

- **Developer Experience:**
  - TypeScript support with full type safety
  - Environment-based configuration
  - Comprehensive error handling
  - Development mode with hot reload
  - ESLint and Prettier configuration

- **Documentation:**
  - Complete setup and usage guide
  - JQL query examples
  - Claude Desktop integration instructions
  - Security best practices
  - Contributing guidelines

### Technical Details
- Built on Model Context Protocol (MCP) SDK
- Uses jira.js for Jira REST API v3 integration
- ES modules with TypeScript compilation
- Node.js 18+ requirement
- MIT license for open source use

### Supported Operations
- **Read Operations:** Issues, projects, users, comments, search
- **Metadata Access:** Attachments, custom fields, change history, time tracking
- **Authentication:** Basic auth with API tokens
- **Pagination:** Full pagination support for large datasets

[0.0.1]: https://github.com/sespinosar/jira-mcp-server/releases/tag/v0.0.1