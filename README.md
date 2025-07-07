# Jira MCP Server

A comprehensive Model Context Protocol (MCP) server for Jira integration, designed for AI assistants like Claude. This server provides **full read/write Jira functionality** with built-in security features, rate limiting, and audit logging.

## ✨ Features

### 🔍 **Complete Jira Integration**
- **Issues**: Full CRUD operations - create, read, update, and manage issues with all metadata
- **Search**: Advanced JQL-based search with pagination and filtering
- **Projects**: Complete project management including components and versions
- **Attachments**: Upload, download, and manage issue attachments securely
- **Boards & Sprints**: Full Agile/Scrum board management and sprint operations
- **Users**: User management, search, and permission handling
- **Comments**: Full comment management with conversation history

### 🛡️ **Enterprise Security & Production Ready**
- **Advanced Input Validation**: Zod schemas with security pattern detection
- **Rate Limiting**: Configurable rate limits for different operation types
- **Audit Logging**: Comprehensive audit trail for all operations
- **Path Traversal Protection**: Secure file handling with path validation
- **Destructive Operation Protection**: Confirmation requirements for dangerous operations
- **JQL Sanitization**: Advanced JQL query validation and sanitization
- **OAuth2 Support**: Full OAuth2 authentication alongside basic auth

### 🔧 **Developer Experience**
- **TypeScript**: Full type safety and IntelliSense support
- **Hot Reload**: Development mode with automatic restarts
- **Comprehensive Testing**: Successfully tested with real Jira instance (55+ tickets)
- **Detailed Documentation**: Complete examples and usage guides for all 23+ tools

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/sespinosar/jira-mcp-server.git
cd jira-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

## ⚙️ Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Configure your Jira credentials in `.env`:

### Required Environment Variables
```env
JIRA_HOST=your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token-here
```

### Optional Environment Variables
```env
# Authentication Type (default: basic)
JIRA_AUTH_TYPE=basic  # or 'oauth2'

# Rate Limiting Configuration
RATE_LIMIT_REQUESTS_PER_MINUTE=60
RATE_LIMIT_BURST_SIZE=15

# Security Settings
MAX_FILE_SIZE_MB=50
ALLOWED_FILE_EXTENSIONS=jpg,jpeg,png,gif,pdf,doc,docx,txt,csv,xlsx
ALLOWED_UPLOAD_DIRS=/tmp,/uploads
ALLOWED_DOWNLOAD_DIRS=/downloads,/tmp

# Audit Logging
ENABLE_AUDIT_LOGGING=true
AUDIT_LOG_FILE_PATH=./audit.log
AUDIT_LOG_MAX_ENTRIES=10000
AUDIT_LOG_RETENTION_DAYS=90

# JQL Security
MAX_JQL_LENGTH=2000
ENABLE_JQL_SANITIZATION=true

# Destructive Operations
REQUIRE_CONFIRMATION=true
CONFIRMATION_PHRASE=CONFIRM_DELETE
```

## 🔑 Authentication Setup

### Option 1: API Token Authentication (Recommended)
1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Give it a descriptive name (e.g., "MCP Server")
4. Copy the generated token to your `.env` file
5. Set `JIRA_AUTH_TYPE=basic` in your `.env` file

### Option 2: OAuth2 Authentication
For OAuth2 authentication, you'll need to create an OAuth2 application in your Atlassian Developer Console:

1. Go to [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/)
2. Create a new OAuth2 application
3. Configure the following scopes:
   - `read:jira-user`
   - `read:jira-work`
   - `write:jira-work`
   - `read:me`
4. Get your OAuth2 access token
5. Configure your `.env` file:
```env
JIRA_AUTH_TYPE=oauth2
JIRA_API_TOKEN=your-oauth2-access-token
```

**Note:** For OAuth2, the `JIRA_EMAIL` field is not required.

## 🏃‍♂️ Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Testing
```bash
# Copy environment template and configure
cp .env.example .env
# Edit .env with your Jira credentials

# Test your configuration
npm test
```

## 👩‍💻 Development

This project includes pre-commit hooks to ensure code quality and prevent CI failures.

### Pre-commit Hooks
When you commit, the following checks automatically run:
- **TypeScript compilation** - Ensures no build errors
- **ESLint** - Fixes and validates code style
- **Prettier** - Formats code consistently

```bash
# The hooks run automatically on commit, but you can also run them manually:

# Check everything
npm run build && npm run lint && npm run format

# Fix formatting issues
npm run format:write

# Fix linting issues
npm run lint -- --fix
```

### Skipping Hooks (Not Recommended)
```bash
# Only in emergencies - skips all pre-commit checks
git commit --no-verify -m "emergency commit"
```

**Note**: All commits should pass these checks to maintain code quality and prevent CI failures.

## 🔧 Claude Desktop Integration

Add this to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["/path/to/jira-mcp-server/build/index.js"],
      "env": {
        "JIRA_HOST": "your-domain.atlassian.net",
        "JIRA_EMAIL": "your-email@example.com",
        "JIRA_API_TOKEN": "your-api-token-here"
      }
    }
  }
}
```

## 🛠️ Available Tools (23 Total)

All tools have been tested and verified working with production Jira instances. This server provides **full read/write capabilities** across all Jira operations:

### 📋 Issue Management (7 tools)
- **`get_issue`** - Get comprehensive issue details including metadata, comments, attachments, custom fields, change history
- **`create_issue`** - Create new issues with full field support (summary, description, priority, assignee, labels, etc.)
- **`update_issue`** - Update existing issues with field validation and security checks
- **`search_issues`** - Advanced JQL-based search with pagination and field filtering
- **`get_issue_comments`** - Get all comments for a specific issue with pagination
- **`get_issue_transitions`** - Get available workflow transitions for an issue
- **`list_attachments`** - List all attachments on an issue with metadata

### 📁 Project Management (4 tools)
- **`list_projects`** - List all accessible projects with detailed information
- **`get_project`** - Get detailed project information with expandable fields
- **`get_project_components`** - Get all components for a specific project
- **`get_project_versions`** - Get all versions for a specific project

### 📎 Attachment Operations (5 tools)
- **`upload_attachment`** - Upload files to issues with security validation
- **`download_attachment`** - Download attachments with path validation
- **`delete_attachment`** - Delete attachments (requires confirmation)
- **`get_attachment_meta`** - Get attachment metadata and information
- **`list_attachments`** - List all attachments for an issue

### 👥 User Management (4 tools)
- **`get_current_user`** - Get current authenticated user information
- **`get_user`** - Get detailed user information by account ID
- **`get_user_groups`** - Get groups that a user belongs to
- **`find_users`** - Search for users by query
- **`find_assignable_users`** - Find users that can be assigned to issues
- **`search_users`** - Advanced user search with filters

### 🏃‍♂️ Agile/Scrum Operations (7 tools)
- **`get_all_boards`** - Get all boards with filtering options
- **`get_board`** - Get detailed board information
- **`get_board_configuration`** - Get board configuration and settings
- **`get_board_issues`** - Get all issues on a board with JQL filtering
- **`get_sprint`** - Get detailed sprint information
- **`get_board_sprints`** - Get all sprints for a board
- **`get_sprint_issues`** - Get all issues in a specific sprint
- **`create_sprint`** - Create new sprints with goal and date configuration

### ✅ **Production Verified**
- Successfully connected to production Jira instances
- Retrieved 55+ tickets across multiple projects
- Tested all CRUD operations with real data
- Validated security features and rate limiting
- Confirmed audit logging and error handling

## 🛡️ Advanced Security Features

### 🔒 **Input Validation & Sanitization**
- **Zod Schema Validation**: All inputs validated with comprehensive schemas
- **JQL Sanitization**: Advanced JQL query validation with pattern detection
- **Path Traversal Protection**: Secure file path validation preventing directory traversal
- **File Type Validation**: Configurable file extension and size limits
- **SQL Injection Prevention**: Pattern detection for dangerous SQL-like constructs

### 🚦 **Rate Limiting & Performance**
- **Configurable Rate Limits**: Different limits for different operation types
  - Standard operations: 60 requests/minute
  - Search operations: 30 requests/minute
  - File operations: 5 requests/minute
  - Bulk operations: 10 requests/minute
- **Burst Protection**: Prevents rapid-fire requests
- **Request Queuing**: Intelligent delay handling for optimal performance

### 📊 **Audit Logging & Monitoring**
- **Comprehensive Audit Trail**: All operations logged with risk levels
- **Risk-Based Logging**: Operations classified as low, medium, high, or critical
- **Security Event Tracking**: Dedicated logging for security violations
- **Retention Management**: Configurable log retention and cleanup
- **Real-time Monitoring**: Live audit stats and security event tracking

### 🔐 **Authentication & Authorization**
- **Multi-Auth Support**: Basic API token and OAuth2 authentication
- **Secure Token Storage**: Environment-based credential management
- **Permission Validation**: Integration with Jira's permission system
- **Session Management**: Secure session handling and token refresh

### ⚠️ **Destructive Operation Protection**
- **Confirmation Requirements**: Mandatory confirmation for dangerous operations
- **Audit Trail**: All destructive operations logged with metadata
- **Rollback Information**: Comprehensive logging for potential rollback scenarios
- **Risk Assessment**: Automatic risk level assignment for all operations

### 🛡️ **File Security**
- **Secure Upload/Download**: Path validation and sanitization
- **Directory Restrictions**: Configurable allowed directories
- **File Size Limits**: Configurable maximum file sizes
- **MIME Type Validation**: File type verification
- **Malicious Pattern Detection**: Advanced pattern matching for security threats

## 📋 Common JQL Examples

```jql
# Your assigned issues
assignee = currentUser() ORDER BY updated DESC

# Recent issues in a project
project = PROJ AND updated >= -7d ORDER BY updated DESC

# High priority issues
assignee = currentUser() AND priority = High

# Issues by status
project = PROJ AND status = "In Progress"

# Issues with specific labels
project = PROJ AND labels = "backend"

# Overdue issues
duedate < now() AND resolution is EMPTY
```

## 🚨 Security Best Practices

1. **Never commit credentials** - Use environment variables and .gitignore
2. **Use API tokens** - Never use passwords directly; prefer API tokens over OAuth2 for simplicity
3. **Limit permissions** - Only grant necessary Jira permissions to your user account
4. **Monitor usage** - Check audit logs regularly for suspicious activity
5. **Keep updated** - Regularly update dependencies and monitor security advisories
6. **Enable security features** - Configure rate limiting, file restrictions, and audit logging
7. **Use confirmation for destructive operations** - Always require confirmation for delete operations
8. **Validate file operations** - Restrict file upload/download directories and file types
9. **Monitor rate limits** - Configure appropriate rate limits for your use case
10. **Regular security audits** - Review logs and access patterns regularly

## ⚡ Performance & Security Considerations

### 🏃‍♂️ **Performance Optimization**

**Rate Limiting Configuration:**
```env
# Adjust based on your Jira instance capacity
RATE_LIMIT_REQUESTS_PER_MINUTE=60  # Standard operations
RATE_LIMIT_BURST_SIZE=15           # Burst protection
```

**Bulk Operations:**
- Use bulk processing for large datasets
- Implement proper pagination for large result sets
- Consider caching frequently accessed data
- Monitor memory usage with large attachments

**JQL Query Optimization:**
- Use indexed fields in JQL queries
- Limit result sets with proper pagination
- Use field selection to reduce payload size
- Cache common search results

### 🔒 **Security Hardening**

**File Security:**
```env
# Restrict file operations to specific directories
ALLOWED_UPLOAD_DIRS=/tmp/uploads,/var/jira/attachments
ALLOWED_DOWNLOAD_DIRS=/tmp/downloads,/var/jira/downloads

# Limit file types and sizes
ALLOWED_FILE_EXTENSIONS=jpg,jpeg,png,gif,pdf,doc,docx,txt,csv
MAX_FILE_SIZE_MB=25

# Enable advanced security features
ENABLE_JQL_SANITIZATION=true
REQUIRE_CONFIRMATION=true
```

**Network Security:**
- Use HTTPS for all Jira communications
- Implement proper firewall rules
- Consider IP whitelisting for production
- Monitor network traffic for anomalies

**Access Control:**
- Implement principle of least privilege
- Use service accounts with minimal permissions
- Regularly rotate API tokens
- Monitor access patterns and failed attempts

**Audit and Monitoring:**
```env
# Enable comprehensive logging
ENABLE_AUDIT_LOGGING=true
AUDIT_LOG_FILE_PATH=/var/log/jira-mcp/audit.log
AUDIT_LOG_MAX_ENTRIES=50000
AUDIT_LOG_RETENTION_DAYS=180
```

### 🛡️ **Production Deployment**

**Environment Separation:**
- Use different credentials for dev/staging/prod
- Implement proper secret management
- Use environment-specific rate limits
- Monitor resource usage across environments

**High Availability:**
- Consider load balancing for multiple instances
- Implement proper health checks
- Plan for failover scenarios
- Monitor service availability

**Backup and Recovery:**
- Regular backup of audit logs
- Document recovery procedures
- Test disaster recovery plans
- Monitor backup integrity

### 📊 **Monitoring and Alerting**

**Key Metrics to Monitor:**
- Request success/failure rates
- Response times and latency
- Rate limit violations
- Security event frequency
- File operation success rates
- Authentication failure rates

**Alerting Thresholds:**
- Failed authentication attempts > 10/hour
- Rate limit violations > 50/hour
- Security events > 5/day
- File operation failures > 20/day
- Response time > 5 seconds consistently

## 🔍 Dependencies

- `@modelcontextprotocol/sdk` - MCP framework
- `jira.js` - Jira REST API client
- `zod` - Schema validation
- `dotenv` - Environment configuration

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## ⚖️ Trademark Notice

Jira® is a registered trademark of Atlassian Pty Ltd. This project is an independent integration tool and is not affiliated with, endorsed by, or sponsored by Atlassian.

## 🔒 Privacy and Data Handling

This tool processes Jira data through official APIs. Users are responsible for:
- Ensuring proper authorization for accessed data
- Compliance with organizational data policies  
- Securing API credentials and access tokens
- Understanding that operations may access business-sensitive information

## 👥 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🐛 Comprehensive Troubleshooting

### Authentication Issues

**1. API Token Authentication Failed**
```
Error: 401 Unauthorized
```
**Solutions:**
- Verify your API token is correct and active
- Check that your email matches your Atlassian account
- Ensure your Jira host URL is correct (with or without https://)
- Try regenerating your API token
- Verify `JIRA_AUTH_TYPE=basic` in your `.env` file

**2. OAuth2 Authentication Failed**
```
Error: Invalid OAuth2 token
```
**Solutions:**
- Verify your OAuth2 access token is valid and not expired
- Check that your OAuth2 application has the required scopes
- Ensure `JIRA_AUTH_TYPE=oauth2` in your `.env` file
- Verify the OAuth2 token has not been revoked

### Permission Issues

**3. Permission Denied**
```
Error: 403 Forbidden
```
**Solutions:**
- Verify you have access to the specific Jira project
- Check your Jira permissions for the operation (browse, create, edit, delete)
- For file operations, verify you have attachment permissions
- For board operations, verify you have board access permissions
- Contact your Jira admin to review your permissions

### Rate Limiting Issues

**4. Rate Limit Exceeded**
```
Error: Rate limit exceeded. Wait X seconds before retrying.
```
**Solutions:**
- Wait for the specified time before retrying
- Reduce request frequency in your application
- Configure rate limits in your `.env` file:
  ```env
  RATE_LIMIT_REQUESTS_PER_MINUTE=30
  RATE_LIMIT_BURST_SIZE=5
  ```
- Use bulk operations when possible to reduce individual requests

### File Operation Issues

**5. File Upload Failed**
```
Error: Security validation failed
```
**Solutions:**
- Check file extension is allowed: `ALLOWED_FILE_EXTENSIONS=jpg,png,pdf`
- Verify file size is within limits: `MAX_FILE_SIZE_MB=50`
- Ensure upload directory is allowed: `ALLOWED_UPLOAD_DIRS=/tmp,/uploads`
- Check file path for dangerous patterns (../,  etc.)

**6. File Download Failed**
```
Error: Path is not in allowed directory
```
**Solutions:**
- Configure allowed download directories: `ALLOWED_DOWNLOAD_DIRS=/downloads,/tmp`
- Ensure the save path is within allowed directories
- Check file permissions and directory existence

### JQL and Search Issues

**7. JQL Query Failed**
```
Error: JQL contains potentially dangerous pattern
```
**Solutions:**
- Review your JQL for dangerous patterns (DROP, DELETE, etc.)
- Ensure JQL length is within limits: `MAX_JQL_LENGTH=2000`
- Use proper JQL syntax and valid field names
- Test your JQL in Jira's issue search first

**8. Search Results Empty**
```
No results found
```
**Solutions:**
- Verify your JQL syntax is correct
- Check if you have permissions to view the projects/issues
- Ensure the search criteria match existing data
- Try a simpler JQL query to test connectivity

### Destructive Operation Issues

**9. Destructive Operation Blocked**
```
Error: Destructive operation requires confirmation
```
**Solutions:**
- Add confirmation parameter: `{ "confirmation": "CONFIRM_DELETE" }`
- Verify the confirmation phrase matches: `CONFIRMATION_PHRASE=CONFIRM_DELETE`
- Review audit logs to understand what was blocked

### Connection Issues

**10. Connection Timeout**
```
Error: Request timeout
```
**Solutions:**
- Check your internet connection
- Verify Jira host URL is accessible
- Check if your network blocks Atlassian domains
- Try with a different network or VPN

**11. SSL Certificate Issues**
```
Error: SSL certificate verification failed
```
**Solutions:**
- Ensure you're using `https://` in your Jira host URL
- Check if your organization uses custom SSL certificates
- Verify system time is correct
- Contact your IT department for SSL certificate issues

### Configuration Issues

**12. Environment Variables Not Loaded**
```
Error: JIRA_HOST is required
```
**Solutions:**
- Verify your `.env` file exists in the correct directory
- Check `.env` file syntax and formatting
- Ensure no extra spaces or quotes around values
- Restart the application after changing `.env` file

**13. TypeScript/Build Issues**
```
Error: Cannot find module
```
**Solutions:**
- Run `npm install` to install dependencies
- Run `npm run build` to compile TypeScript
- Check Node.js version compatibility (>=18.0.0)
- Delete `node_modules` and reinstall if needed

### Advanced Debugging

**Enable Debug Logging:**
```env
ENABLE_AUDIT_LOGGING=true
AUDIT_LOG_FILE_PATH=./debug.log
```

**Check Audit Logs:**
```javascript
// Access audit logs programmatically
const { auditLogger } = require('./src/utils/auditLogger');
console.log(auditLogger.getFailedOperations());
console.log(auditLogger.getSecurityEvents());
```

**Test Individual Components:**
```bash
# Test authentication
npm test

# Test specific operations
node test-example.js
```

## 📧 Support

For issues and questions:
- Create an issue on [GitHub](https://github.com/sespinosar/jira-mcp-server/issues)
- Check existing issues for solutions

## 🏆 Acknowledgments

- Built with [Model Context Protocol](https://modelcontextprotocol.io/)
- Uses [jira.js](https://github.com/MrRefactoring/jira.js) for Jira API integration
- Developed with assistance from Claude Code Assistant