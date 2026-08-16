/**
 * Definiciones MCP. Son finas a propósito: delegan en `domain/`.
 *
 * Las 7 tools de lectura del MVP llegan en la Fase 4, cuando haya contrato verificado.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { registerHealthCheck } from './health-check.js';

export function registerTools(server: McpServer): void {
  registerHealthCheck(server);
}

export { registerHealthCheck } from './health-check.js';
