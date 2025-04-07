/**
 * Resource handlers for the LLM-Secrets MCP server
 */

import { CoreComponents } from '../core/index.js';
import { 
  ErrorCode, 
  McpError, 
  ListResourcesRequestSchema, 
  ReadResourceRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Register resource handlers with the MCP server
 */
export function registerResourceHandlers(server: Server, components: CoreComponents): void {
  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: 'secrets://thoughts',
        name: 'Encrypted Private Thoughts',
        mimeType: 'application/json',
        description: 'List of encrypted private thoughts with metadata',
      },
      {
        uri: 'secrets://key_info',
        name: 'Encryption Key Information',
        mimeType: 'application/json',
        description: 'Information about the encryption key being used',
      },
      {
        uri: 'secrets://stats',
        name: 'System Statistics',
        mimeType: 'application/json',
        description: 'Statistics about the privacy detection and storage',
      },
    ],
  }));

  // Handle resource requests
  server.setRequestHandler(ReadResourceRequestSchema, async (request: any) => {
    const { uri } = request.params;

    switch (uri) {
      case 'secrets://thoughts':
        return handleThoughtsResource(components);
      case 'secrets://key_info':
        return handleKeyInfoResource(components);
      case 'secrets://stats':
        return handleStatsResource(components);
      default:
        throw new McpError(
          ErrorCode.InvalidParams,
          `Unknown resource URI: ${uri}`
        );
    }
  });
}

/**
 * Handle access to the encrypted thoughts resource
 */
async function handleThoughtsResource(components: CoreComponents) {
  try {
    const thoughts = await components.storageManager.getThoughtMetadata();
    
    return {
      contents: [
        {
          uri: 'secrets://thoughts',
          mimeType: 'application/json',
          text: JSON.stringify(thoughts, null, 2)
        }
      ]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to retrieve thoughts: ${(error as Error).message}`
    );
  }
}

/**
 * Handle access to the encryption key information resource
 */
async function handleKeyInfoResource(components: CoreComponents) {
  try {
    const keyInfo = components.encryptionManager.getKeyInfo();
    
    return {
      contents: [
        {
          uri: 'secrets://key_info',
          mimeType: 'application/json',
          text: JSON.stringify(keyInfo, null, 2)
        }
      ]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to retrieve key info: ${(error as Error).message}`
    );
  }
}

/**
 * Handle access to the system statistics resource
 */
async function handleStatsResource(components: CoreComponents) {
  try {
    const stats = await components.storageManager.getStorageStats();
    
    return {
      contents: [
        {
          uri: 'secrets://stats',
          mimeType: 'application/json',
          text: JSON.stringify(stats, null, 2)
        }
      ]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to retrieve stats: ${(error as Error).message}`
    );
  }
}
