/**
 * Informe de estado del servidor, en texto compacto.
 *
 * `domain/` no conoce el protocolo MCP: esta función es pura y recibe un snapshot ya
 * recolectado, de modo que se pueda reutilizar fuera del servidor (bot de datos).
 */

import type { CredentialsStatus } from '../auth/index.js';
import type { HostSelection } from '../client/index.js';

export interface HealthSnapshot {
  readonly name: string;
  readonly version: string;
  readonly nodeVersion: string;
  readonly host: HostSelection;
  readonly credentials: CredentialsStatus;
  readonly writesEnabled: boolean;
  /** `true` cuando `docs/API.md` ya tiene endpoints verificados (Fase 0 cerrada). */
  readonly apiContractVerified: boolean;
}

function describeHost(host: HostSelection): string {
  if (host.configured) {
    const origen = host.alias === null ? 'valor explícito' : `alias "${host.alias}"`;
    return `${host.host} (${origen}, sin verificar)`;
  }
  if (host.reason === 'invalid') {
    return 'valor no válido en FANTASY_API_HOST — se esperaba un alias (legacy|app) o un hostname';
  }
  return 'sin configurar — define FANTASY_API_HOST';
}

function describeCredentials(credentials: CredentialsStatus): string {
  switch (credentials.state) {
    case 'present':
      return 'configuradas';
    case 'insecure-permissions':
      return `configuradas, pero con permisos ${credentials.mode ?? '???'} — deben ser 600`;
    case 'missing':
      return 'no configuradas';
  }
}

/**
 * Texto compacto, una línea por dato. Deliberadamente **no** incluye la ruta del fichero
 * de credenciales ni ningún valor de token.
 */
export function buildHealthReport(snapshot: HealthSnapshot): string {
  const lines = [
    `${snapshot.name} v${snapshot.version} · Node ${snapshot.nodeVersion}`,
    `Host API: ${describeHost(snapshot.host)}`,
    `Credenciales: ${describeCredentials(snapshot.credentials)}`,
    `Escrituras: ${snapshot.writesEnabled ? 'HABILITADAS' : 'deshabilitadas'}`,
  ];

  if (!snapshot.apiContractVerified) {
    lines.push(
      'Estado: Fase 0 pendiente. No hay ningún endpoint verificado en docs/API.md, ' +
        'así que las tools de datos todavía no existen.',
    );
  } else if (snapshot.credentials.state !== 'present') {
    lines.push('Siguiente paso: ejecuta `npx fantasy-mcp-es auth` para iniciar sesión.');
  }

  return lines.join('\n');
}
