import { resolve, normalize } from 'path';
import { existsSync, statSync } from 'fs';

export interface FileValidationOptions {
  allowedExtensions?: string[];
  maxFileSize?: number; // in bytes
  allowedDirectories?: string[];
  blockDangerousPatterns?: boolean;
}

export class SecurityError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

export function validateFilePath(
  filePath: string,
  options: FileValidationOptions = {}
): string {
  const {
    allowedExtensions = [],
    maxFileSize = 50 * 1024 * 1024, // 50MB default
    allowedDirectories = [],
    blockDangerousPatterns = true
  } = options;

  // Normalize and resolve the path
  const normalizedPath = normalize(filePath);
  const resolvedPath = resolve(normalizedPath);

  // Check for path traversal attempts
  if (blockDangerousPatterns) {
    const dangerousPatterns = [
      '../', '..\\', '..%2F', '..%5C',
      '%2e%2e%2f', '%2e%2e%5c',
      '/./', '/..', '\\..', '\\.\\',
      'file://', 'http://', 'https://',
      'ftp://', 'sftp://'
    ];

    for (const pattern of dangerousPatterns) {
      if (normalizedPath.toLowerCase().includes(pattern.toLowerCase())) {
        throw new SecurityError(
          `Path contains dangerous pattern: ${pattern}`,
          'DANGEROUS_PATH_PATTERN'
        );
      }
    }
  }

  // Validate against allowed directories
  if (allowedDirectories.length > 0) {
    const isInAllowedDirectory = allowedDirectories.some(allowedDir => {
      const resolvedAllowedDir = resolve(allowedDir);
      return resolvedPath.startsWith(resolvedAllowedDir);
    });

    if (!isInAllowedDirectory) {
      throw new SecurityError(
        `Path is not in allowed directory. Allowed: ${allowedDirectories.join(', ')}`,
        'PATH_NOT_ALLOWED'
      );
    }
  }

  // Check if file exists
  if (!existsSync(resolvedPath)) {
    throw new SecurityError(
      `File not found: ${resolvedPath}`,
      'FILE_NOT_FOUND'
    );
  }

  // Get file stats
  const stats = statSync(resolvedPath);

  // Check if it's actually a file
  if (!stats.isFile()) {
    throw new SecurityError(
      `Path is not a file: ${resolvedPath}`,
      'NOT_A_FILE'
    );
  }

  // Check file size
  if (stats.size > maxFileSize) {
    throw new SecurityError(
      `File too large: ${stats.size} bytes (max: ${maxFileSize})`,
      'FILE_TOO_LARGE'
    );
  }

  // Check file extension
  if (allowedExtensions.length > 0) {
    const fileExtension = normalizedPath.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      throw new SecurityError(
        `File extension not allowed: ${fileExtension}. Allowed: ${allowedExtensions.join(', ')}`,
        'EXTENSION_NOT_ALLOWED'
      );
    }
  }

  return resolvedPath;
}

export function validateSavePath(
  savePath: string,
  options: FileValidationOptions = {}
): string {
  const {
    allowedDirectories = [],
    blockDangerousPatterns = true
  } = options;

  // Normalize and resolve the path
  const normalizedPath = normalize(savePath);
  const resolvedPath = resolve(normalizedPath);

  // Check for path traversal attempts
  if (blockDangerousPatterns) {
    const dangerousPatterns = [
      '../', '..\\', '..%2F', '..%5C',
      '%2e%2e%2f', '%2e%2e%5c',
      '/./', '/..', '\\..', '\\.\\',
      'file://', 'http://', 'https://',
      'ftp://', 'sftp://'
    ];

    for (const pattern of dangerousPatterns) {
      if (normalizedPath.toLowerCase().includes(pattern.toLowerCase())) {
        throw new SecurityError(
          `Save path contains dangerous pattern: ${pattern}`,
          'DANGEROUS_PATH_PATTERN'
        );
      }
    }
  }

  // Validate against allowed directories
  if (allowedDirectories.length > 0) {
    const isInAllowedDirectory = allowedDirectories.some(allowedDir => {
      const resolvedAllowedDir = resolve(allowedDir);
      return resolvedPath.startsWith(resolvedAllowedDir);
    });

    if (!isInAllowedDirectory) {
      throw new SecurityError(
        `Save path is not in allowed directory. Allowed: ${allowedDirectories.join(', ')}`,
        'PATH_NOT_ALLOWED'
      );
    }
  }

  // Check if parent directory exists
  const parentDir = resolve(resolvedPath, '..');
  if (!existsSync(parentDir)) {
    throw new SecurityError(
      `Parent directory does not exist: ${parentDir}`,
      'PARENT_DIR_NOT_FOUND'
    );
  }

  return resolvedPath;
}

export function sanitizeJQL(jql: string): string {
  // Remove potentially dangerous SQL-like patterns
  const dangerousPatterns = [
    /\b(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER|TRUNCATE)\b/gi,
    /\b(UNION|SELECT)\b.*\b(FROM|WHERE)\b/gi,
    /['"]\s*;\s*['"]/gi, // SQL injection patterns
    /\b(EXEC|EXECUTE|EVAL)\b/gi,
    /\b(SCRIPT|JAVASCRIPT|VBSCRIPT)\b/gi,
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload=/gi,
    /onerror=/gi,
    /onclick=/gi
  ];

  const sanitizedJQL = jql;
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitizedJQL)) {
      throw new SecurityError(
        `JQL contains potentially dangerous pattern: ${pattern}`,
        'DANGEROUS_JQL_PATTERN'
      );
    }
  }

  // Validate JQL length (prevent DoS)
  if (sanitizedJQL.length > 2000) {
    throw new SecurityError(
      `JQL query too long: ${sanitizedJQL.length} characters (max: 2000)`,
      'JQL_TOO_LONG'
    );
  }

  // Basic JQL syntax validation
  // Removed unused jqlKeywords - JQL validation is handled by Jira API

  // This is a basic validation - Jira's API will do more comprehensive validation
  return sanitizedJQL.trim();
}

export interface DestructiveOperationOptions {
  requireConfirmation?: boolean;
  confirmationPhrase?: string;
  auditLog?: boolean;
}

export function validateDestructiveOperation(
  operation: string,
  confirmation?: string,
  options: DestructiveOperationOptions = {}
): void {
  const {
    requireConfirmation = true,
    confirmationPhrase = 'CONFIRM_DELETE',
    auditLog = true
  } = options;

  if (requireConfirmation) {
    if (!confirmation || confirmation !== confirmationPhrase) {
      throw new SecurityError(
        `Destructive operation requires confirmation. Use: ${confirmationPhrase}`,
        'CONFIRMATION_REQUIRED'
      );
    }
  }

  if (auditLog) {
    console.warn(`[AUDIT] Destructive operation executed: ${operation} at ${new Date().toISOString()}`);
  }
}