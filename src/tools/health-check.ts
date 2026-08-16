import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { credentialsStatus } from '../auth/index.js';
import { API_CONTRACT_VERIFIED, resolveHost, writesEnabled } from '../client/index.js';
import { buildHealthReport } from '../domain/index.js';
import { PACKAGE_NAME, PACKAGE_VERSION } from '../version.js';

/**
 * Reports which version is running, whether credentials are configured and whether the API
 * contract has been verified. Never touches the API.
 */
export function registerHealthCheck(server: McpServer): void {
  server.registerTool(
    'health_check',
    {
      title: 'Estado del servidor',
      description:
        'Devuelve la versión del servidor, si hay credenciales configuradas y qué consultas ' +
        'están disponibles. No consulta la API de LaLiga Fantasy.',
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
