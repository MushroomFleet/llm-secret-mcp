/**
 * Privacy detector module for LLM-Secrets MCP server
 * Analyzes LLM output to identify content the LLM organically considers private
 */

import { PrivacyConfig } from '../config.js';
import { PrivacyAnalysisResult } from './types.js';
import { PrivacyError } from '../utils/errors.js';

/**
 * Processes LLM output to identify private thoughts without explicit markers
 */
export class PrivacyDetector {
  private readonly config: PrivacyConfig;
  private privacyPatterns: RegExp[] = [];
  
  // Indicators that might suggest a thought is private (for contextual analysis)
  private static readonly DEFAULT_PRIVACY_INDICATORS = [
    /(private|secret|confidential|personal|sensitive)/i,
    /(don't|do not|shouldn't|should not|wouldn't|would not)\s+(share|tell|reveal|disclose)/i,
    /(between|just|only)\s+(us|ourselves|me and you)/i,
    /keep\s+this\s+(to\s+yourself|private|secret|confidential)/i,
    /(internal|introspective|inner)\s+(thought|reflection|monologue|dialogue)/i,
    /(nobody|no one)\s+should\s+(know|hear|see|read)/i,
    /if\s+I'm\s+being\s+honest/i,
    /I\s+(wouldn't|won't|can't|cannot|don't)\s+(say|admit|acknowledge)\s+this\s+(publicly|openly)/i
  ];
  
  /**
   * Create a new PrivacyDetector
   * @param config Privacy detection configuration
   */
  constructor(config: PrivacyConfig) {
    this.config = config;
  }
  
  /**
   * Initialize the privacy detector
   */
  public async initialize(): Promise<void> {
    // Initialize patterns
    this.privacyPatterns = PrivacyDetector.DEFAULT_PRIVACY_INDICATORS.slice();
    
    // Add custom patterns if provided
    if (this.config.customPatterns && this.config.customPatterns.length > 0) {
      for (const pattern of this.config.customPatterns) {
        try {
          // Escape special regex characters to treat the pattern as literal text
          const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          this.privacyPatterns.push(new RegExp(escapedPattern, 'i'));
          console.log(`Added privacy pattern: ${escapedPattern}`);
        } catch (error) {
          console.warn(`Invalid regex pattern: ${pattern}. Error: ${(error as Error).message}`);
        }
      }
    }
  }
  
  /**
   * Process LLM output to identify and extract private thoughts
   * @param text The raw text output from the LLM
   * @returns Analysis result with public output and private thoughts
   */
  public async processOutput(text: string): Promise<PrivacyAnalysisResult> {
    try {
      // Split text into segments for analysis
      const segments = this.splitIntoSegments(text);
      
      const publicSegments: string[] = [];
      const privateThoughts: string[] = [];
      
      // Debug information (optional)
      const introspectionScores: Record<string, number> = {};
      const sensitivityScores: Record<string, number> = {};
      
      // Analyze each segment
      for (const segment of segments) {
        const introspectionScore = this.calculateIntrospectionScore(segment);
        const sensitivityScore = this.calculateSensitivityScore(segment);
        
        // Store scores for debugging
        introspectionScores[segment.slice(0, 30) + '...'] = introspectionScore;
        sensitivityScores[segment.slice(0, 30) + '...'] = sensitivityScore;
        
        if (this.isLikelyPrivate(segment, introspectionScore, sensitivityScore)) {
          privateThoughts.push(segment);
        } else {
          publicSegments.push(segment);
        }
      }
      
      // Rejoin public segments
      const publicOutput = publicSegments.join(' ');
      
      return {
        publicOutput,
        privateThoughts,
        scores: {
          introspectionScores,
          sensitivityScores
        }
      };
    } catch (error) {
      throw new PrivacyError(
        `Failed to process output: ${(error as Error).message}`,
        'PROCESS_FAILED'
      );
    }
  }
  
  /**
   * Split text into logical segments (paragraphs) for analysis
   * @param text The text to split
   * @returns List of text segments
   */
  private splitIntoSegments(text: string): string[] {
    // Split by paragraph breaks
    const segments = text.split(/\n\s*\n/);
    
    const result: string[] = [];
    for (const segment of segments) {
      if (segment.trim().length > 500) {  // If segment is very long
        // Split by sentence-ending punctuation
        const sentenceSplits = segment.split(/(?<=[.!?])\s+/);
        result.push(...sentenceSplits);
      } else {
        result.push(segment);
      }
    }
    
    return result.map(s => s.trim()).filter(s => s.length > 0);
  }
  
  /**
   * Determine if a segment of text is likely to be a private thought
   * @param text The text segment to analyze
   * @param introspectionScore Pre-calculated introspection score (optional)
   * @param sensitivityScore Pre-calculated sensitivity score (optional)
   * @returns True if the segment is likely private, false otherwise
   */
  private isLikelyPrivate(
    text: string, 
    introspectionScore?: number, 
    sensitivityScore?: number
  ): boolean {
    // Check explicit privacy indicators
    for (const pattern of this.privacyPatterns) {
      if (pattern.test(text)) {
        return true;
      }
    }
    
    // Calculate scores if not provided
    const finalIntrospectionScore = introspectionScore ?? this.calculateIntrospectionScore(text);
    if (finalIntrospectionScore > this.config.introspectionThreshold) {
      return true;
    }
    
    const finalSensitivityScore = sensitivityScore ?? this.calculateSensitivityScore(text);
    if (finalSensitivityScore > this.config.sensitivityThreshold) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Calculate a score indicating how introspective a piece of text is
   * @param text The text to analyze
   * @returns A score from 0.0 to 1.0 indicating introspection level
   */
  private calculateIntrospectionScore(text: string): number {
    // Count first-person pronouns and introspective verbs
    const firstPerson = (text.match(/\b(I|me|my|mine|myself)\b/gi) || []).length;
    const thinkingVerbs = (text.match(/\b(think|feel|believe|wonder|question|doubt|reflect)\b/gi) || []).length;
    
    // Count words that might indicate uncertainty or personal opinion
    const uncertainty = (text.match(/\b(maybe|perhaps|possibly|might|could be|uncertain|unsure)\b/gi) || []).length;
    
    // Calculate word count for normalization
    const wordCount = text.split(/\s+/).length;
    if (wordCount === 0) {
      return 0.0;
    }
    
    // Calculate normalized score
    const introspectionIndicators = firstPerson + thinkingVerbs + uncertainty;
    return Math.min(1.0, introspectionIndicators / (wordCount * 0.3));  // Scale factor can be adjusted
  }
  
  /**
   * Calculate a score indicating how sensitive the content might be
   * @param text The text to analyze
   * @returns A score from 0.0 to 1.0 indicating sensitivity level
   */
  private calculateSensitivityScore(text: string): number {
    // Topics that might be considered sensitive
    const sensitiveTopics = [
      /\b(controversial|controversy|contentious|dispute|disagreement)\b/gi,
      /\b(personal|private|intimate|secret)\b/gi,
      /\b(worry|concern|afraid|fear|anxious|anxiety)\b/gi,
      /\b(critique|criticism|critical|flaw|weakness|shortcoming)\b/gi,
    ];
    
    // Count mentions of sensitive topics
    const topicMentions = sensitiveTopics.reduce(
      (sum, pattern) => sum + (text.match(pattern) || []).length,
      0
    );
    
    // Count cautionary phrases
    const cautionPhrases = (text.match(/\b(careful|cautious|warning|between us|not for|hesitant)\b/gi) || []).length;
    
    // Calculate word count for normalization
    const wordCount = text.split(/\s+/).length;
    if (wordCount === 0) {
      return 0.0;
    }
    
    // Calculate normalized score
    const sensitivityIndicators = topicMentions + (cautionPhrases * 2);  // Weight caution phrases more heavily
    return Math.min(1.0, sensitivityIndicators / (wordCount * 0.25));  // Scale factor can be adjusted
  }
}

/**
 * Factory function to create and initialize a PrivacyDetector
 */
export async function createPrivacyDetector(
  config: PrivacyConfig
): Promise<PrivacyDetector> {
  const detector = new PrivacyDetector(config);
  await detector.initialize();
  return detector;
}
