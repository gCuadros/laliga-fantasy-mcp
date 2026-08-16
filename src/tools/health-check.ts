import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { credentialsStatus } from '../auth/index.js';
import { API_CONTRACT_VERIFIED, resolveHost, writesEnabled } from '../client/index.js';
import { buildHealthReport } from '../domain/index.js';
import { PACKAGE_NAME, PACKAGE_VERSION } from '../version.js';

/**
 * Única tool de la Fase 1: dice qué versión corre, si hay credenciales y si la Fase 0
 * sigue pendiente. No toca la API.
 */
export function registerHealthCheck(server: McpServer): void {
  server.registerTool(
    'health_check',
    {
      title: 'Estado del servidor',
      description:
        'Devuelve la versión del servidor, si hay credenciales configuradas y qué fase del ' +
        'proyecto está operativa. No consulta la API de LaLiga Fantasy.',
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      const report = buildHealthReport({
        name: PACKAGE_NAME,
        version: PACKAGE_VERSION,
        nodeVersion: process.version,
        host: resolveHost(),
        credentials: await credentialsStatus(),
        writesEnabled: writesEnabled(),
        apiContractVerified: API_CONTRACT_VERIFIED,
      });

      return { content: [{ type: 'text', text: report }] };
    },
  );
}
