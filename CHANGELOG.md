# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-07-07

### 🔧 Fixed
- **BREAKING:** Complete rewrite to fix MCP SDK compatibility issues
- Fixed server failing to start due to incorrect MCP SDK usage patterns
- Removed invalid `telemetry` field from jira.js client configuration
- Fixed TypeScript compilation errors
- Updated to use correct `ListToolsRequestSchema` and `CallToolRequestSchema` patterns

### 🎯 Changed
- **BREAKING:** Simplified tool set to 5 core tools for stability
- **BREAKING:** Updated tool names to use `jira_` prefix for consistency
- **BREAKING:** Removed complex features that were causing stability issues
- Updated to Modern MCP SDK patterns following current best practices
- Improved error handling with proper MCP error types

### ✨ Current Tools (Working & Tested)
- `jira_create_issue` - Create new issues with basic fields
- `jira_get_issue` - Get detailed issue information
- `jira_update_issue` - Update issue summary and description
- `jira_search_issues` - Search issues using JQL queries
- `jira_list_projects` - List all accessible projects

### 🛠️ Technical Details
- Built on latest Model Context Protocol (MCP) SDK
- Uses jira.js v3 for Jira REST API integration
- TypeScript with ES modules compilation
- Simplified architecture for better maintainability
- Comprehensive error handling and validation

### 📚 Documentation
- Updated README to reflect actual working features
- Added troubleshooting section
- Simplified setup instructions
- Updated Claude Desktop configuration examples

## [0.0.1] - 2025-07-07

### Added
- 🎉 Initial release (had compatibility issues, see v2.0.0)
- Basic Jira integration attempt
- Complex tool set (many tools had issues)
- TypeScript implementation
- MCP SDK integration (incorrect patterns)

### Issues in 0.0.1 (Fixed in 2.0.0)
- Server failed to start due to MCP SDK incompatibility
- TypeScript compilation errors
- Invalid jira.js configuration
- Overly complex tool registration patterns

[2.0.0]: https://github.com/sespinosa/jira-mcp-server/releases/tag/v2.0.0
[0.0.1]: https://github.com/sespinosa/jira-mcp-server/releases/tag/v0.0.1