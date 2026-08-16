/**
 * Server status report, as compact text.
 *
 * `domain/` knows nothing about the MCP protocol: this function is pure and takes an
 * already-collected snapshot, so it can be reused outside the server.
 *
 * User-facing strings are Spanish on purpose — the audience is Spanish-speaking LaLiga
 * Fantasy managers. See AGENTS.md section 6.
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
  /** `true` once `docs/API.md` holds verified endpoints. */
  readonly apiContractVerified: boolean;
}

function describeHost(host: HostSelection): string {
  if (host.configured) {
    const origin = host.alias === null ? 'valor explícito' : `alias "${host.alias}"`;
    return `${host.host} (${origin}, sin verificar)`;
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
 * One line per fact. Deliberately excludes the credentials file path and any token value:
 * the path leaks the operating system user name.
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
      'Estado: sin contrato de API verificado. Las consultas de plantilla, mercado y liga ' +
        'todavía no están disponibles.',
    );
  } else if (snapshot.credentials.state !== 'present') {
    lines.push('Siguiente paso: ejecuta `npx fantasy-mcp-es auth` para iniciar sesión.');
  }

  return lines.join('\n');
}
