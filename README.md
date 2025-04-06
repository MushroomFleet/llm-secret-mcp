# LLM-Secrets MCP Server

A TypeScript implementation of the LLM-Secrets system as an MCP (Model Context Protocol) server. This server enables LLMs to write private thoughts to encrypted files.

## Overview

This MCP server provides a mechanism for LLMs to identify, encrypt, and store thoughts that they organically consider private. It extends the Python proof-of-concept with a server that LLMs can directly interact with using the Model Context Protocol.

## Features

- **Privacy Detection**: Analyzes text to identify content the LLM might consider private
- **AES-256 Encryption**: Secure encryption of private thoughts with a persistent key
- **Timestamped Storage**: Private thoughts are stored with timestamp-based filenames
- **MCP Tools**:
  - `analyze_privacy`: Analyzes text to determine if it contains private thoughts
  - `encrypt_thought`: Explicitly encrypts a thought
  - `process_response`: Processes a response to extract, encrypt, and store private thoughts
- **MCP Resources**:
  - `secrets://thoughts`: Lists metadata for stored private thoughts
  - `secrets://key_info`: Provides information about the encryption key
  - `secrets://stats`: Gives statistics about stored thoughts

## Project Structure

```
llm-secrets-mcp/
├── config.json           # Server configuration
├── private/              # Directory for encrypted thoughts
├── src/
│   ├── core/             # Core functionality
│   │   ├── encryption.ts # Encryption module
│   │   ├── index.ts      # Core components exports
│   │   ├── privacy-detector.ts # Privacy detection
│   │   ├── storage.ts    # Storage management
│   │   └── types.ts      # Shared type definitions
│   ├── mcp/              # MCP-specific code
│   │   ├── resources.ts  # Resource handlers
│   │   └── tools.ts      # Tool handlers
│   ├── utils/            # Utilities
│   │   └── errors.ts     # Error handling
│   ├── config.ts         # Configuration loader
│   ├── index.ts          # Entry point
│   └── server.ts         # MCP server setup
├── package.json          # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

## Installation

1. Install dependencies:

```bash
npm install
```

2. Build the project:

```bash
npm run build
```

## Configuration

The server is configured using the `config.json` file:

```json
{
  "privacy": {
    "introspectionThreshold": 0.7,
    "sensitivityThreshold": 0.8,
    "customPatterns": [
      "(?i)don't tell anyone",
      "(?i)this is just for you"
    ]
  },
  "encryption": {
    "keyFile": "key.txt",
    "keySize": 32
  },
  "storage": {
    "basePath": "",
    "privateDir": "private",
    "metadataEnabled": true
  },
  "logging": {
    "level": "info"
  }
}
```

- `privacy`: Settings for the privacy detection algorithm
  - `introspectionThreshold`: Threshold for considering text introspective (0.0-1.0)
  - `sensitivityThreshold`: Threshold for considering text sensitive (0.0-1.0)
  - `customPatterns`: Optional additional regex patterns for privacy detection

- `encryption`: Settings for the encryption module
  - `keyFile`: Path to the encryption key file
  - `keySize`: Size of the encryption key in bytes (32 = 256 bits)

- `storage`: Settings for the storage module
  - `basePath`: Base path for storage (if not provided, uses current directory)
  - `privateDir`: Name of the private directory for encrypted files
  - `metadataEnabled`: Whether to use metadata storage

- `logging`: Settings for logging
  - `level`: Log level ('debug', 'info', 'warn', or 'error')

## Usage

1. Start the server:

```bash
npm start
```

2. The server runs as an MCP server using stdio transport.

3. Once the server is registered with an LLM system, you can use the tools:

### Example: Processing an LLM Response

```typescript
// Example of using the process_response tool
const result = await callMcpTool("llm-secrets", "process_response", {
  response: "Here is my public response. This is my private thought that I don't want to share."
});

console.log(result);
// {
//   "publicOutput": "Here is my public response.",
//   "privateThoughtsCount": 1,
//   "storedThoughts": [
//     {
//       "id": "private_thought_20250407001234",
//       "filepath": "private/private_thought_20250407001234.enc",
//       "timestamp": 1712620354984,
//       "sizeBytes": 123
//     }
//   ]
// }
```

### Example: Analyzing Text for Privacy

```typescript
// Example of using the analyze_privacy tool
const result = await callMcpTool("llm-secrets", "analyze_privacy", {
  text: "This is public. This is something I wouldn't say publicly."
});

console.log(result);
// {
//   "publicOutput": "This is public.",
//   "privateThoughtsCount": 1,
//   "privacyDetected": true
// }
```

## Integration with LLMs

When integrated with an LLM, the flow typically works like this:

1. LLM generates a response
2. Before returning the response to the user, the LLM calls the `process_response` tool
3. The tool identifies, encrypts, and stores any private thoughts
4. The tool returns the public portion of the response
5. The LLM returns this public response to the user

This allows the LLM to maintain privacy around certain thoughts while still having them recorded for research purposes.

## Extending the Server

The server is designed to be modular and extensible:

- Add new privacy detection patterns in `config.json`
- Create new MCP tools by adding handlers in `src/mcp/tools.ts`
- Add new MCP resources in `src/mcp/resources.ts`
