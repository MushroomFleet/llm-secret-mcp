/**
 * Core components index - exports all core components for the LLM-Secrets MCP server
 */

import { ServerConfig } from '../config.js';
import { createPrivacyDetector, PrivacyDetector } from './privacy-detector.js';
import { createEncryptionManager, EncryptionManager } from './encryption.js';
import { createStorageManager, StorageManager } from './storage.js';

/**
 * Interface for all core components of the system
 */
export interface CoreComponents {
  /** Privacy detection component */
  privacyDetector: PrivacyDetector;
  /** Encryption component */
  encryptionManager: EncryptionManager;
  /** Storage component */
  storageManager: StorageManager;
}

/**
 * Create and initialize all core components
 * @param config Server configuration
 * @returns Initialized components
 */
export async function createCoreComponents(config: ServerConfig): Promise<CoreComponents> {
  // Initialize privacy detector
  const privacyDetector = await createPrivacyDetector(config.privacy);
  
  // Initialize encryption manager
  const encryptionManager = await createEncryptionManager(config.encryption);
  
  // Initialize storage manager
  const storageManager = await createStorageManager(config.storage);
  
  return {
    privacyDetector,
    encryptionManager,
    storageManager
  };
}

// Re-export all component types
export * from './types.js';
export { PrivacyDetector } from './privacy-detector.js';
export { EncryptionManager } from './encryption.js';
export { StorageManager } from './storage.js';
