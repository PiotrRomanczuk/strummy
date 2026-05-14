/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Agent Registry Validation
 *
 * Validation utilities for agent specifications and requests
 */

import type { AgentSpecification, AgentRequest, AgentContext } from './types';

/**
 * Validate agent specification completeness
 */
export function validateSpecification(spec: AgentSpecification): void {
  const required = ['id', 'name', 'description', 'purpose', 'systemPrompt'];
  for (const field of required) {
    if (!spec[field as keyof AgentSpecification]) {
      throw new Error(`Agent specification missing required field: ${field}`);
    }
  }

  // Validate arrays
  if (!Array.isArray(spec.targetUsers) || spec.targetUsers.length === 0) {
    throw new Error('Agent specification must have at least one target user');
  }

  if (!Array.isArray(spec.useCases) || spec.useCases.length === 0) {
    throw new Error('Agent specification must have at least one use case');
  }

  // Validate temperature range
  if (spec.temperature < 0 || spec.temperature > 2) {
    throw new Error('Agent temperature must be between 0 and 2');
  }

  // Validate input validation configuration
  if (!spec.inputValidation.allowedFields || spec.inputValidation.allowedFields.length === 0) {
    throw new Error('Agent must specify allowed input fields');
  }
}

/**
 * Validate agent execution request
 */
export async function validateRequest(
  request: AgentRequest,
  agent: AgentSpecification
): Promise<void> {
  // Validate input fields
  const inputKeys = Object.keys(request.input);
  for (const key of inputKeys) {
    if (!agent.inputValidation.allowedFields.includes(key)) {
      throw new Error(`Input field '${key}' is not allowed for this agent`);
    }
  }

  // Validate input length
  for (const field of agent.inputValidation.allowedFields) {
    if (request.input[field] && typeof request.input[field] === 'string') {
      if (request.input[field].length > agent.inputValidation.maxLength) {
        throw new Error(
          `Input field '${field}' exceeds maximum length of ${agent.inputValidation.maxLength}`
        );
      }
    }
  }

  // Check for sensitive data if blocking is enabled
  if (agent.inputValidation.sensitiveDataHandling === 'block') {
    await validateSensitiveData(request.input);
  }

  // Sanitize sensitive data if sanitization is enabled
  if (agent.inputValidation.sensitiveDataHandling === 'sanitize') {
    request.input = await sanitizeSensitiveData(request.input);
  }
}

/**
 * Validate sensitive data in input
 */
export async function validateSensitiveData(input: Record<string, any>): Promise<void> {
  // Define patterns for sensitive data
  const sensitivePatterns = [
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card numbers
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, // Email addresses (if blocking emails)
  ];

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string') {
      for (const pattern of sensitivePatterns) {
        if (pattern.test(value)) {
          throw new Error(
            `Sensitive data detected in field '${key}'. This content is not allowed.`
          );
        }
      }
    }
  }
}

/**
 * Sanitize sensitive data in input by redacting or masking it
 */
export async function sanitizeSensitiveData(
  input: Record<string, any>
): Promise<Record<string, any>> {
  const sanitized = { ...input };

  // Define patterns for sensitive data with their redaction strategies
  const sanitizationRules = [
    {
      pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?(\d{4})\b/g,
      replacement: '****-****-****-$1', // Keep last 4 digits of credit cards
    },
    {
      pattern: /\b\d{3}-\d{2}-(\d{4})\b/g,
      replacement: '***-**-$1', // Keep last 4 digits of SSN
    },
    {
      pattern: /\b([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g,
      replacement: '$1***@$2', // Mask email username
    },
  ];

  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      let sanitizedValue = value;
      for (const rule of sanitizationRules) {
        sanitizedValue = sanitizedValue.replace(rule.pattern, rule.replacement);
      }
      sanitized[key] = sanitizedValue;
    }
  }

  return sanitized;
}

/**
 * Check user permissions for agent access
 */
export async function checkPermissions(
  request: AgentRequest,
  agent: AgentSpecification
): Promise<void> {
  // Check if user role is allowed
  if (!agent.targetUsers.includes(request.context.userRole)) {
    throw new Error(`User role '${request.context.userRole}' not permitted for agent: ${agent.id}`);
  }

  // Additional permission checks can be added here
  // For example, checking specific database permissions, feature flags, etc.
}

/**
 * Validate agent context
 */
export function validateContext(context: AgentContext): void {
  if (!context.userId) {
    throw new Error('Agent context must include user ID');
  }

  if (!context.userRole || !['admin', 'teacher', 'student'].includes(context.userRole)) {
    throw new Error('Agent context must include valid user role');
  }

  if (!context.sessionId) {
    throw new Error('Agent context must include session ID');
  }

  if (!context.requestId) {
    throw new Error('Agent context must include request ID');
  }
}
