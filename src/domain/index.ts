/**
 * Lógica de negocio: tendencias, ratios, chollos (Fase 3).
 *
 * Independiente del protocolo MCP a propósito — es la capa que se reutiliza fuera del
 * servidor. No puede importar de `tools/` (lo comprueba eslint).
 */

export { buildHealthReport } from './health.js';
export type { HealthSnapshot } from './health.js';
