/**
 * Configuration module for the LLM-Secrets MCP server
 */
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';

/**
 * Privacy detection configuration
 */
export interface PrivacyConfig {
  /** Threshold for considering text introspective (0.0-1.0) */
  introspectionThreshold: number;
  /** Threshold for considering text sensitive (0.0-1.0) */
  sensitivityThreshold: number;
  /** Optional custom privacy detection patterns */
  customPatterns?: string[];
}

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  /** Path to the encryption key file */
  keyFile: string;
  /** Size of the encryption key in bytes (32 = 256 bits) */
  keySize: number;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  /** Base path for storage (if not provided, uses current directory) */
  basePath: string;
  /** Name of the private directory for encrypted files */
  privateDir: string;
  /** Whether to use metadata storage */
  metadataEnabled: boolean;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  /** Log level */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** Optional path to log file */
  file?: string;
}

/**
 * Complete server configuration
 */
export interface ServerConfig {
  /** Privacy detection configuration */
  privacy: PrivacyConfig;
  /** Encryption configuration */
  encryption: EncryptionConfig;
  /** Storage configuration */
  storage: StorageConfig;
  /** Logging configuration */
  logging: LoggingConfig;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: ServerConfig = {
  privacy: {
    introspectionThreshold: 0.7,
    sensitivityThreshold: 0.8,
  },
  encryption: {
    keyFile: 'key.txt',
    keySize: 32, // 256 bits
  },
  storage: {
    basePath: '',
    privateDir: 'private',
    metadataEnabled: true,
  },
  logging: {
    level: 'info',
  },
};

/**
 * Load configuration from a JSON file, with defaults for missing values
 */
export async function loadConfig(configPath = 'config.json'): Promise<ServerConfig> {
  try {
    const data = await fsPromises.readFile(configPath, 'utf-8');
    const userConfig = JSON.parse(data);
    
    // Deep merge with default config
    return deepMerge(DEFAULT_CONFIG, userConfig);
  } catch (error) {
    console.warn(`Config file not found or invalid, using defaults: ${(error as Error).message}`);
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Deep merge of objects - combines source into target
 */
function deepMerge<T>(target: T, source: Partial<T>): T {
  const output = { ...target } as Record<string, any>;
  
  if (!source || typeof source !== 'object') {
    return output as T;
  }
  
  Object.keys(source).forEach(key => {
    const sourceValue = (source as Record<string, any>)[key];
    const targetValue = (target as Record<string, any>)[key];
    
    if (
      targetValue && 
      sourceValue && 
      typeof targetValue === 'object' && 
      typeof sourceValue === 'object' &&
      !Array.isArray(targetValue) &&
      !Array.isArray(sourceValue)
    ) {
      // Recursively merge nested objects
      output[key] = deepMerge(targetValue, sourceValue);
    } else if (sourceValue !== undefined) {
      // Use source value if it exists
      output[key] = sourceValue;
    }
  });
  
  return output as T;
}
