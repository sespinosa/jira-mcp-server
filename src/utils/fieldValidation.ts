import { z } from 'zod';

export interface FieldValidationOptions {
  allowedFields?: string[];
  maxStringLength?: number;
  maxArrayLength?: number;
  allowedCustomFieldTypes?: string[];
  blockDangerousValues?: boolean;
}

export class FieldValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'FieldValidationError';
  }
}

// Common Jira field types and their validation schemas
const jiraFieldSchemas = {
  // Text fields
  summary: z.string().max(255),
  description: z.string().max(32767),
  environment: z.string().max(32767),
  
  // User fields
  assignee: z.object({
    accountId: z.string(),
  }).or(z.null()),
  reporter: z.object({
    accountId: z.string(),
  }),
  
  // Selection fields
  priority: z.object({
    id: z.string(),
  }).or(z.object({
    name: z.string(),
  })),
  issuetype: z.object({
    id: z.string(),
  }).or(z.object({
    name: z.string(),
  })),
  
  // Array fields
  labels: z.array(z.string().max(255)).max(20),
  components: z.array(z.object({
    id: z.string(),
  }).or(z.object({
    name: z.string(),
  }))).max(20),
  fixVersions: z.array(z.object({
    id: z.string(),
  }).or(z.object({
    name: z.string(),
  }))).max(20),
  
  // Date fields
  duedate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  
  // Time tracking
  timetracking: z.object({
    originalEstimate: z.string().optional(),
    remainingEstimate: z.string().optional(),
  }),
  
  // Security
  security: z.object({
    id: z.string(),
  }).or(z.object({
    name: z.string(),
  })),
};

export function validateCustomField(value: any, fieldType?: string): any {
  // Block potentially dangerous values
  if (typeof value === 'string') {
    const dangerousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload=/gi,
      /onerror=/gi,
      /onclick=/gi,
      /data:text\/html/gi,
      /eval\s*\(/gi,
      /Function\s*\(/gi,
      /setTimeout\s*\(/gi,
      /setInterval\s*\(/gi,
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(value)) {
        throw new FieldValidationError(
          `Custom field value contains dangerous pattern: ${pattern}`,
          'custom_field'
        );
      }
    }
    
    // Limit string length
    if (value.length > 32767) {
      throw new FieldValidationError(
        `Custom field value too long: ${value.length} characters (max: 32767)`,
        'custom_field'
      );
    }
  }
  
  // Validate based on field type
  if (fieldType) {
    switch (fieldType.toLowerCase()) {
      case 'string':
      case 'text':
        return z.string().max(32767).parse(value);
      case 'number':
        return z.number().parse(value);
      case 'boolean':
        return z.boolean().parse(value);
      case 'date':
        return z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(value);
      case 'datetime':
        return z.string().datetime().parse(value);
      case 'array':
        return z.array(z.any()).max(50).parse(value);
      case 'object':
        return z.object({}).passthrough().parse(value);
      default:
        // For unknown types, apply basic validation
        return z.any().parse(value);
    }
  }
  
  return value;
}

export function validateIssueFields(
  fields: Record<string, any>,
  options: FieldValidationOptions = {}
): Record<string, any> {
  const {
    allowedFields = [],
    maxStringLength = 32767,
    maxArrayLength = 50,
    allowedCustomFieldTypes = ['string', 'text', 'number', 'boolean', 'date', 'datetime', 'array', 'object'],
    blockDangerousValues = true
  } = options;
  
  const validatedFields: Record<string, any> = {};
  
  for (const [fieldName, fieldValue] of Object.entries(fields)) {
    try {
      // Check if field is allowed
      if (allowedFields.length > 0 && !allowedFields.includes(fieldName)) {
        throw new FieldValidationError(
          `Field not allowed: ${fieldName}. Allowed fields: ${allowedFields.join(', ')}`,
          fieldName
        );
      }
      
      // Validate known Jira fields
      if (fieldName in jiraFieldSchemas) {
        const schema = jiraFieldSchemas[fieldName as keyof typeof jiraFieldSchemas];
        validatedFields[fieldName] = schema.parse(fieldValue);
        continue;
      }
      
      // Handle custom fields (usually start with customfield_)
      if (fieldName.startsWith('customfield_')) {
        validatedFields[fieldName] = validateCustomField(fieldValue);
        continue;
      }
      
      // For unknown fields, apply basic validation
      if (blockDangerousValues && typeof fieldValue === 'string') {
        const dangerousPatterns = [
          /<script[^>]*>.*?<\/script>/gi,
          /javascript:/gi,
          /vbscript:/gi,
          /onload=/gi,
          /onerror=/gi,
          /onclick=/gi,
          /data:text\/html/gi,
        ];
        
        for (const pattern of dangerousPatterns) {
          if (pattern.test(fieldValue)) {
            throw new FieldValidationError(
              `Field value contains dangerous pattern: ${pattern}`,
              fieldName
            );
          }
        }
        
        if (fieldValue.length > maxStringLength) {
          throw new FieldValidationError(
            `Field value too long: ${fieldValue.length} characters (max: ${maxStringLength})`,
            fieldName
          );
        }
      }
      
      if (Array.isArray(fieldValue) && fieldValue.length > maxArrayLength) {
        throw new FieldValidationError(
          `Array field too long: ${fieldValue.length} items (max: ${maxArrayLength})`,
          fieldName
        );
      }
      
      validatedFields[fieldName] = fieldValue;
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new FieldValidationError(
          `Invalid value for field '${fieldName}': ${error.message}`,
          fieldName
        );
      }
      throw error;
    }
  }
  
  return validatedFields;
}

// Predefined safe field sets for different operations
export const safeFieldSets = {
  // Basic fields that are generally safe to update
  basic: [
    'summary', 'description', 'labels', 'priority', 'assignee',
    'reporter', 'environment', 'duedate', 'components', 'fixVersions'
  ],
  
  // Extended set including time tracking
  extended: [
    'summary', 'description', 'labels', 'priority', 'assignee',
    'reporter', 'environment', 'duedate', 'components', 'fixVersions',
    'timetracking', 'security'
  ],
  
  // Administrative fields (require higher privileges)
  admin: [
    'summary', 'description', 'labels', 'priority', 'assignee',
    'reporter', 'environment', 'duedate', 'components', 'fixVersions',
    'timetracking', 'security', 'issuetype', 'project'
  ]
};

export function getFieldValidationSchema(fieldSet: 'basic' | 'extended' | 'admin' = 'basic') {
  return z.record(z.any()).refine((fields) => {
    return validateIssueFields(fields, {
      allowedFields: safeFieldSets[fieldSet],
      blockDangerousValues: true
    });
  });
}