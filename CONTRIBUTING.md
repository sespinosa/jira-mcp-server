# Contributing to Jira MCP Server

Thank you for your interest in contributing to Jira MCP Server! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- A Jira instance for testing

### Development Setup

1. Fork and clone the repository:
```bash
git clone https://github.com/sespinosar/jira-mcp-server.git
cd jira-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Set up your environment:
```bash
cp .env.example .env
# Edit .env with your Jira credentials
```

4. Start development:
```bash
npm run dev
```

## 📝 Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow existing code formatting (Prettier configuration included)
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Testing
- Write tests for new features
- Ensure existing tests pass: `npm test`
- Test with actual Jira instance when possible

### Security
- Never commit credentials or sensitive data
- Use environment variables for configuration
- Validate all inputs with Zod schemas
- Follow principle of least privilege

## 🐛 Reporting Issues

### Bug Reports
Include:
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node.js version, OS)
- Jira version and configuration (if relevant)

### Feature Requests
Include:
- Clear description of the feature
- Use cases and benefits
- Proposed implementation approach (if any)

## 🔄 Pull Request Process

1. **Create a Feature Branch**
```bash
git checkout -b feature/your-feature-name
```

2. **Make Your Changes**
- Follow coding standards
- Add tests if applicable
- Update documentation

3. **Test Your Changes**
```bash
npm run lint
npm run build
npm test
```

4. **Commit Your Changes**
Use conventional commit format:
```
feat: add new Jira board management tools
fix: resolve authentication timeout issue
docs: update installation instructions
```

5. **Submit Pull Request**
- Provide clear description of changes
- Link related issues
- Include screenshots for UI changes

## 🏗️ Project Structure

```
src/
├── index.ts          # Main server entry point
├── tools/            # MCP tool implementations
│   ├── issues.ts     # Issue management tools
│   ├── projects.ts   # Project tools
│   └── ...
├── utils/            # Utility functions
│   ├── auth.ts       # Authentication helpers
│   ├── security.ts   # Security utilities
│   └── ...
└── types/            # TypeScript type definitions
```

## 🔐 Security Considerations

- All user inputs must be validated
- Use rate limiting for API calls
- Implement proper error handling
- Log security-relevant events
- Follow OWASP guidelines

## 📚 Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for new functions
- Update examples for new features
- Keep changelog updated

## 🤝 Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow the golden rule

## 💬 Getting Help

- Create an issue for questions
- Check existing issues and discussions
- Be specific about your environment and problem

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing! 🎉