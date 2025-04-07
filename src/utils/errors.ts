/**
 * Base error class for the LLM-Secrets project
 */

// Import actual MCP types from the SDK
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

// Extend NodeJS namespace to include captureStackTrace
declare global {
  interface ErrorConstructor {
    captureStackTrace(targetObject: object, constructorOpt?: Function): void;
  }
}

/**
 * Base error class for the LLM-Secrets project
 */
export class LlmSecretsError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'LlmSecretsError';
    
    // Maintain proper stack trace in Node.js
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Convert to MCP error
   */
  public toMcpError(): McpError {
    const mcpErrorCode = this.getMcpErrorCode();
    return new McpError(mcpErrorCode, this.message);
  }
  
  /**
   * Map internal error codes to MCP error codes
   */
  private getMcpErrorCode(): ErrorCode {
    switch (this.code) {
      case 'INVALID_INPUT':
        return ErrorCode.InvalidParams;
      case 'NOT_FOUND':
        return ErrorCode.MethodNotFound;
      case 'UNAUTHORIZED':
        return ErrorCode.InvalidRequest;
      case 'RATE_LIMITED':
        return ErrorCode.InvalidRequest;
      default:
        return ErrorCode.InternalError;
    }
  }
}

/**
 * Error related to privacy detection
 */
export class PrivacyError extends LlmSecretsError {
  constructor(message: string, code: string, details?: any) {
    super(message, `PRIVACY_${code}`, details);
    this.name = 'PrivacyError';
  }
}

/**
 * Error related to encryption
 */
export class EncryptionError extends LlmSecretsError {
  constructor(message: string, code: string, details?: any) {
    super(message, `ENCRYPTION_${code}`, details);
    this.name = 'EncryptionError';
  }
}

/**
 * Error related to storage
 */
export class StorageError extends LlmSecretsError {
  constructor(message: string, code: string, details?: any) {
    super(message, `STORAGE_${code}`, details);
    this.name = 'StorageError';
  }
}

// Re-export the types from the SDK
export { ErrorCode, McpError };
