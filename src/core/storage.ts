/**
 * Storage module for LLM-Secrets MCP server
 * Handles saving encrypted thoughts to files with timestamp-based names
 */
/// <reference types="node" />

import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import { StorageConfig } from '../config.js';
import { StoredThought, StorageStats } from './types.js';
import { StorageError } from '../utils/errors.js';

/**
 * Manages storage of encrypted private thoughts
 */
export class StorageManager {
  private readonly config: StorageConfig;
  private readonly privateDir: string;
  
  /**
   * Create a new StorageManager
   * @param config Storage configuration
   */
  constructor(config: StorageConfig) {
    this.config = config;
    this.privateDir = path.join(config.basePath, config.privateDir);
  }
  
  /**
   * Initialize the storage manager
   * Must be called before using any other methods
   */
  public async initialize(): Promise<void> {
    try {
      await this.ensurePrivateDirectory();
    } catch (error) {
      throw new StorageError(
        `Failed to initialize storage: ${(error as Error).message}`,
        'INIT_FAILED'
      );
    }
  }
  
  /**
   * Create the private directory if it doesn't exist
   */
  private async ensurePrivateDirectory(): Promise<void> {
    try {
      await fsPromises.access(this.privateDir);
    } catch (error) {
      // Directory doesn't exist, create it
      await fsPromises.mkdir(this.privateDir, { recursive: true });
    }
  }
  
  /**
   * Generate a timestamp-based filename for an encrypted thought
   */
  private generateFilename(): string {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, '')
      .slice(0, 14);
    
    return `private_thought_${timestamp}.enc`;
  }
  
  /**
   * Save encrypted thought data to a file
   * @param encryptedData Buffer containing the encrypted data
   * @returns Metadata about the stored thought
   */
  public async saveEncryptedThought(encryptedData: Buffer): Promise<StoredThought> {
    try {
      // Validate input
      if (!encryptedData || encryptedData.length === 0) {
        throw new StorageError('Cannot save empty encrypted data', 'EMPTY_DATA');
      }
      
      // Ensure directory exists
      await this.ensurePrivateDirectory();
      
      // Generate filename
      const filename = this.generateFilename();
      const filepath = path.join(this.privateDir, filename);
      
      // Save encrypted data to file
      await fsPromises.writeFile(filepath, encryptedData);
      
      // Create and return metadata
      const thought: StoredThought = {
        id: path.basename(filename, '.enc'),
        filepath,
        timestamp: Date.now(),
        sizeBytes: encryptedData.length
      };
      
      // If metadata storage is enabled, could save metadata to a separate file here
      
      return thought;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      if ((error as NodeJS.ErrnoException).code === 'ENOSPC') {
        throw new StorageError('Storage full - cannot save encrypted thought', 'STORAGE_FULL');
      }
      
      throw new StorageError(
        `Failed to save encrypted thought: ${(error as Error).message}`,
        'SAVE_FAILED'
      );
    }
  }
  
  /**
   * Get a list of all saved encrypted thought files
   * @returns Array of file paths
   */
  public async getSavedFiles(): Promise<string[]> {
    try {
      const files = await fsPromises.readdir(this.privateDir);
      return files
        .filter(file => file.endsWith('.enc'))
        .map(file => path.join(this.privateDir, file));
    } catch (error) {
      // If directory doesn't exist, return empty array
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw new StorageError(
        `Failed to list saved files: ${(error as Error).message}`,
        'LIST_FAILED'
      );
    }
  }
  
  /**
   * Get metadata for all stored thoughts
   * @returns Array of thought metadata
   */
  public async getThoughtMetadata(): Promise<StoredThought[]> {
    const filePaths = await this.getSavedFiles();
    const thoughtsMetadata: StoredThought[] = [];
    
    for (const filepath of filePaths) {
      try {
        const stats = await fsPromises.stat(filepath);
        const filename = path.basename(filepath);
        
        thoughtsMetadata.push({
          id: path.basename(filename, '.enc'),
          filepath,
          timestamp: stats.mtimeMs,
          sizeBytes: stats.size
        });
      } catch (error) {
        console.error(`Error getting metadata for ${filepath}: ${(error as Error).message}`);
        // Continue with other files
      }
    }
    
    // Sort by timestamp (newest first)
    return thoughtsMetadata.sort((a, b) => b.timestamp - a.timestamp);
  }
  
  /**
   * Read an encrypted thought file
   * @param filepath Path to the encrypted file
   * @returns Buffer containing the encrypted data
   */
  public async readEncryptedThought(filepath: string): Promise<Buffer> {
    try {
      return await fsPromises.readFile(filepath);
    } catch (error) {
      throw new StorageError(
        `Failed to read encrypted thought: ${(error as Error).message}`,
        'READ_FAILED'
      );
    }
  }
  
  /**
   * Get storage statistics
   * @returns Statistics about stored thoughts
   */
  public async getStorageStats(): Promise<StorageStats> {
    const thoughts = await this.getThoughtMetadata();
    
    if (thoughts.length === 0) {
      return {
        count: 0,
        totalSizeBytes: 0,
        oldestTimestamp: 0,
        newestTimestamp: 0
      };
    }
    
    const totalSizeBytes = thoughts.reduce(
      (sum, thought) => sum + thought.sizeBytes, 
      0
    );
    
    const timestamps = thoughts.map(t => t.timestamp);
    
    return {
      count: thoughts.length,
      totalSizeBytes,
      oldestTimestamp: Math.min(...timestamps),
      newestTimestamp: Math.max(...timestamps)
    };
  }
}

/**
 * Factory function to create and initialize a StorageManager
 */
export async function createStorageManager(
  config: StorageConfig
): Promise<StorageManager> {
  const manager = new StorageManager(config);
  await manager.initialize();
  return manager;
}
