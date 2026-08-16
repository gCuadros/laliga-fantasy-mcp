/**
 * MCP tool definitions. Deliberately thin: they delegate to `domain/`.
 *
 * The read tools of the MVP land once there is a verified API contract.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { registerHealthCheck } from './health-check.js';

export function registerTools(server: McpServer): void {
  registerHealthCheck(server);
}

export { registerHealthCheck } from './health-check.js';
