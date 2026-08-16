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
 * Arranca el transporte stdio. Nada puede escribir en stdout: es el canal del protocolo.
 * Todo log va a stderr.
 */
export async function startServer(): Promise<void> {
  const server = createServer();
  await server.connect(new StdioServerTransport());
  process.stderr.write(`${PACKAGE_NAME} v${PACKAGE_VERSION} escuchando en stdio\n`);
}

const entrypoint = process.argv[1];
const invokedDirectly =
  entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href;

if (invokedDirectly) {
  startServer().catch((error: unknown) => {
    const detail = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Error al arrancar: ${detail}\n`);
    process.exitCode = 1;
  });
}
