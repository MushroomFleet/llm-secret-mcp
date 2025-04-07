/**
 * MCP server implementation for LLM-Secrets
 */

import { loadConfig, ServerConfig } from './config.js';
import { createCoreComponents, CoreComponents } from './core/index.js';
import { registerToolHandlers } from './mcp/tools.js';
import { registerResourceHandlers } from './mcp/resources.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

/**
 * Create and initialize the MCP server
 */
export async function createServer(config: ServerConfig): Promise<{
  server: Server;
  components: CoreComponents;
}> {
  // Initialize core components
  console.log('Initializing core components...');
  const components = await createCoreComponents(config);
  
  // Create MCP server
  console.log('Creating MCP server...');
  const server = new Server(
    {
      name: 'llm-secrets-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );
  
  // Register handlers
  console.log('Registering handlers...');
  registerToolHandlers(server, components);
  registerResourceHandlers(server, components);
  
  // Set up error handling
  server.onerror = (error) => console.error('[MCP Error]', error);
  
  return { server, components };
}

/**
 * Start the MCP server
 */
export async function startServer(): Promise<void> {
  try {
    // Load configuration
    console.log('Loading configuration...');
    const config = await loadConfig();
    
    // Create server and components
    const { server } = await createServer(config);
    
    // Connect to transport
    console.log('Connecting to transport...');
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.log('LLM-Secrets MCP server running on stdio');
    
    // Handle shutdown
    process.on('SIGINT', async () => {
      await server.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}
