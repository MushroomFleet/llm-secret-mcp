/**
 * Shared type definitions for core components
 */

/**
 * Represents a stored private thought
 */
export interface StoredThought {
  /** Unique identifier for the thought */
  id: string;
  /** Filepath where the encrypted thought is stored */
  filepath: string;
  /** Timestamp when the thought was created (Unix timestamp in ms) */
  timestamp: number;
  /** Size of the encrypted thought in bytes */
  sizeBytes: number;
}

/**
 * Result of privacy analysis
 */
export interface PrivacyAnalysisResult {
  /** The public output with private content removed */
  publicOutput: string;
  /** Array of text segments identified as private */
  privateThoughts: string[];
  /** Score information for segments (for debugging) */
  scores?: {
    introspectionScores: Record<string, number>;
    sensitivityScores: Record<string, number>;
  };
}

/**
 * Storage statistics
 */
export interface StorageStats {
  /** Number of stored private thoughts */
  count: number;
  /** Total size of all stored thoughts in bytes */
  totalSizeBytes: number;
  /** Timestamp of the oldest stored thought */
  oldestTimestamp: number;
  /** Timestamp of the newest stored thought */
  newestTimestamp: number;
}

/**
 * Key information
 */
export interface KeyInfo {
  /** Encryption algorithm used */
  algorithm: string;
  /** Path to the key file */
  keyFile: string;
  /** Key size in bits */
  keySizeBits: number;
}
