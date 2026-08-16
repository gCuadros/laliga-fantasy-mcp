import { pathToFileURL } from 'node:url';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerTools } from './tools/index.js';
import { PACKAGE_NAME, PACKAGE_VERSION } from './version.js';

export function createServer(): McpServer {
  const server = new McpServer(
    { name: PACKAGE_NAME, version: PACKAGE_VERSION },
    {
      instructions:
        'Servidor no oficial de LaLiga Fantasy. Usa `health_check` para comprobar el estado ' +
        'de la instalación.',
    },
  );
  registerTools(server);
  return server;
}

/**
 * Starts the stdio transport. Nothing may write to stdout: that is the protocol channel.
 * Every log goes to stderr.
 */
export async function startServer(): Promise<void> {
  const server = createServer();
  await server.connect(new StdioServerTransport());
  process.stderr.write(`${PACKAGE_NAME} v${PACKAGE_VERSION} listening on stdio\n`);
}

const entrypoint = process.argv[1];
const invokedDirectly =
  entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href;

if (invokedDirectly) {
  startServer().catch((error: unknown) => {
    const detail = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Failed to start: ${detail}\n`);
    process.exitCode = 1;
  });
}
