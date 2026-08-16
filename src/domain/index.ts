/**
 * Business logic: trends, ratios, bargains.
 *
 * Deliberately independent of the MCP protocol — this is the layer reused outside the
 * server. It must not import from `tools/` (enforced by eslint).
 */

export { buildHealthReport } from './health.js';
export type { HealthSnapshot } from './health.js';
