/**
 * Main entry point for the LLM-Secrets MCP server
 */

/// <reference types="node" />

import { startServer } from './server.js';

/**
 * Start the MCP server
 */
async function main() {
  try {
    console.log('Starting LLM-Secrets MCP server...');
    await startServer();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the server
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
