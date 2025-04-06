/**
 * Encryption module for LLM-Secrets MCP server
 * Implements AES-256 encryption using Node.js crypto module
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import { EncryptionConfig } from '../config.js';
import { KeyInfo } from './types.js';
import { EncryptionError } from '../utils/errors.js';

/**
 * Manages encryption for private thoughts using AES-256
 */
export class EncryptionManager {
  private key: Buffer = Buffer.alloc(0);
  private readonly config: EncryptionConfig;
  
  /**
   * Create a new EncryptionManager
   * @param config Encryption configuration
   */
  constructor(config: EncryptionConfig) {
    this.config = config;
  }
  
  /**
   * Initialize the encryption manager
   * Must be called before using any other methods
   */
  public async initialize(): Promise<void> {
    try {
      this.key = await this.loadOrCreateKey();
    } catch (error) {
      throw new EncryptionError(
        `Failed to initialize encryption: ${(error as Error).message}`,
        'INIT_FAILED'
      );
    }
  }
  
  /**
   * Load existing key or create a new one if it doesn't exist
   */
  private async loadOrCreateKey(): Promise<Buffer> {
    try {
      // Check if key file exists
      await fsPromises.access(this.config.keyFile, fs.constants.R_OK);
      
      // Load existing key
      const keyBase64 = await fsPromises.readFile(this.config.keyFile, 'utf-8');
      const key = Buffer.from(keyBase64.trim(), 'base64');
      
      // Validate key size
      if (key.length !== this.config.keySize) {
        throw new EncryptionError(
          `Invalid key size: expected ${this.config.keySize} bytes, got ${key.length}`,
          'INVALID_KEY_SIZE'
        );
      }
      
      return key;
    } catch (error) {
      // If error is not about file not existing, rethrow
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT' && !(error instanceof EncryptionError)) {
        throw error;
      }
      
      // Generate new key if file doesn't exist or key size is invalid
      const key = crypto.randomBytes(this.config.keySize);
      
      // Save key in base64 format for readability
      await fsPromises.writeFile(this.config.keyFile, key.toString('base64'));
      
      return key;
    }
  }
  
  /**
   * Encrypt data using AES-256
   * @param data The data to encrypt (string or Buffer)
   * @returns Buffer containing encrypted data with IV prepended
   */
  public async encrypt(data: string | Buffer): Promise<Buffer> {
    try {
      // Ensure we have a key
      if (this.key.length === 0) {
        throw new EncryptionError(
          'Encryption key not initialized',
          'KEY_NOT_INITIALIZED'
        );
      }
      
      // Convert string to Buffer if needed
      const dataBuffer = typeof data === 'string' ? 
        Buffer.from(data, 'utf-8') : data;
      
      // Generate random IV (Initialization Vector)
      const iv = crypto.randomBytes(16);
      
      // Create cipher with AES-256-CBC
      const cipher = crypto.createCipheriv('aes-256-cbc', this.key, iv);
      
      // Encrypt
      const encryptedData = Buffer.concat([
        cipher.update(dataBuffer),
        cipher.final()
      ]);
      
      // Prepend IV to encrypted data (needed for decryption)
      return Buffer.concat([iv, encryptedData]);
    } catch (error) {
      if (error instanceof EncryptionError) {
        throw error;
      }
      throw new EncryptionError(
        `Encryption failed: ${(error as Error).message}`,
        'ENCRYPTION_FAILED'
      );
    }
  }
  
  /**
   * Decrypt data that was encrypted with this manager
   * @param encryptedData Buffer containing encrypted data with IV prepended
   * @returns Decrypted data as a string
   */
  public async decrypt(encryptedData: Buffer): Promise<string> {
    try {
      // Ensure we have a key
      if (this.key.length === 0) {
        throw new EncryptionError(
          'Encryption key not initialized',
          'KEY_NOT_INITIALIZED'
        );
      }
      
      // Validate input
      if (encryptedData.length < 16) {
        throw new EncryptionError(
          'Encrypted data too short (missing IV)',
          'INVALID_ENCRYPTED_DATA'
        );
      }
      
      // Extract IV (first 16 bytes)
      const iv = encryptedData.slice(0, 16);
      const ciphertext = encryptedData.slice(16);
      
      // Create decipher
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.key, iv);
      
      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
      ]);
      
      // Return as UTF-8 string
      return decrypted.toString('utf-8');
    } catch (error) {
      if (error instanceof EncryptionError) {
        throw error;
      }
      throw new EncryptionError(
        `Decryption failed: ${(error as Error).message}`,
        'DECRYPTION_FAILED'
      );
    }
  }
  
  /**
   * Get information about the encryption key
   */
  public getKeyInfo(): KeyInfo {
    return {
      algorithm: 'AES-256',
      keyFile: this.config.keyFile,
      keySizeBits: this.config.keySize * 8
    };
  }
}

/**
 * Factory function to create and initialize an EncryptionManager
 */
export async function createEncryptionManager(
  config: EncryptionConfig
): Promise<EncryptionManager> {
  const manager = new EncryptionManager(config);
  await manager.initialize();
  return manager;
}
