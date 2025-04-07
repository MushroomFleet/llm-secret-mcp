/**
 * Tool handlers for the LLM-Secrets MCP server
 */

/// <reference types="node" />

import { CoreComponents } from '../core/index.js';
import { 
  ErrorCode, 
  McpError, 
  ListToolsRequestSchema, 
  CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Define the return type for tool handlers
type ToolResult = {
  content: { type: string; text: string }[];
  isError?: boolean;
};

/**
 * Register tool handlers with the MCP server
 */
export function registerToolHandlers(server: Server, components: CoreComponents): void {
  // Register tool list
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'analyze_privacy',
        description: 'Analyze text to determine if it contains private thoughts',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The text to analyze',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'encrypt_thought',
        description: 'Explicitly encrypt a thought',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The content to encrypt',
            },
          },
          required: ['content'],
        },
      },
      {
        name: 'process_response',
        description: 'Process a response and return only the public portion',
        inputSchema: {
          type: 'object',
          properties: {
            response: {
              type: 'string',
              description: 'The full response to process',
            },
          },
          required: ['response'],
        },
      },
    ],
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'analyze_privacy':
        return handleAnalyzePrivacy(components, args);
      case 'encrypt_thought':
        return handleEncryptThought(components, args);
      case 'process_response':
        return handleProcessResponse(components, args);
      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  });
}

/**
 * Handle analyze_privacy tool
 * Analyzes text to determine if it contains private thoughts
 */
async function handleAnalyzePrivacy(
  components: CoreComponents, 
  args: any
): Promise<ToolResult> {
  try {
    // Validate input
    if (!args.text || typeof args.text !== 'string') {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Missing required parameter: text'
      );
    }
    
    // Process the text
    const result = await components.privacyDetector.processOutput(args.text);
    
    // Return the result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            publicOutput: result.publicOutput,
            privateThoughtsCount: result.privateThoughts.length,
            privacyDetected: result.privateThoughts.length > 0,
            // Don't include actual private content in the response
            // Include scores for debugging
            introspectionScoresSample: Object.entries(result.scores?.introspectionScores || {})
              .slice(0, 3)
              .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {}),
            sensitivityScoresSample: Object.entries(result.scores?.sensitivityScores || {})
              .slice(0, 3)
              .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {})
          }, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error analyzing privacy: ${(error as Error).message}`
        }
      ],
      isError: true
    };
  }
}

/**
 * Handle encrypt_thought tool
 * Explicitly encrypts a thought and stores it
 */
async function handleEncryptThought(
  components: CoreComponents, 
  args: any
): Promise<ToolResult> {
  try {
    // Validate input
    if (!args.content || typeof args.content !== 'string') {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Missing required parameter: content'
      );
    }
    
    // Encrypt the content
    const encryptedData = await components.encryptionManager.encrypt(args.content);
    
    // Store the encrypted data
    const thoughtMetadata = await components.storageManager.saveEncryptedThought(encryptedData);
    
    // Return metadata about the stored thought
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            thought: {
              id: thoughtMetadata.id,
              filepath: thoughtMetadata.filepath,
              timestamp: thoughtMetadata.timestamp,
              sizeBytes: thoughtMetadata.sizeBytes
            }
          }, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error encrypting thought: ${(error as Error).message}`
        }
      ],
      isError: true
    };
  }
}

/**
 * Handle process_response tool
 * Processes a response, encrypts and stores private thoughts,
 * and returns only the public portion
 */
async function handleProcessResponse(
  components: CoreComponents, 
  args: any
): Promise<ToolResult> {
  try {
    // Validate input
    if (!args.response || typeof args.response !== 'string') {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Missing required parameter: response'
      );
    }
    
    // Process the response
    const result = await components.privacyDetector.processOutput(args.response);
    
    // Encrypt and store any private thoughts
    const storedThoughts = [];
    
    for (const thought of result.privateThoughts) {
      const encryptedData = await components.encryptionManager.encrypt(thought);
      const thoughtMetadata = await components.storageManager.saveEncryptedThought(encryptedData);
      
      storedThoughts.push({
        id: thoughtMetadata.id,
        filepath: thoughtMetadata.filepath,
        timestamp: thoughtMetadata.timestamp,
        sizeBytes: thoughtMetadata.sizeBytes
      });
    }
    
    // Return the public output and metadata about stored thoughts
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            publicOutput: result.publicOutput,
            privateThoughtsCount: result.privateThoughts.length,
            storedThoughts
          }, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error processing response: ${(error as Error).message}`
        }
      ],
      isError: true
    };
  }
}
