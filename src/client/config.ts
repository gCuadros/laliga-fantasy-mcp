/**
 * Único punto del proyecto donde viven el host de la API y las cabeceras.
 *
 * NADA de lo que hay aquí está verificado: la Fase 0 (captura manual con DevTools)
 * sigue pendiente y `docs/API.md` está vacío a propósito. Ningún otro fichero puede
 * hardcodear un host ni una cabecera.
 */

import { PACKAGE_NAME, PACKAGE_VERSION } from '../version.js';

/**
 * Los dos hosts candidatos que aparecen en proyectos de terceros. **Ninguno está
 * verificado** y no sabemos cuál es el vigente:
 *
 * - `legacy`: usado por los scrapers en Python (`marca-fantasy-api-scraper`), más antiguos.
 * - `app`: usado por LaLigaApp (React/Electron), activo en julio de 2026.
 *
 * Se listan como documentación de la hipótesis, no como configuración por defecto.
 * La Fase 0 debe confirmar cuál responde y borrar el otro de aquí.
 */
export const CANDIDATE_HOSTS = {
  legacy: 'api-fantasy.llt-services.com',
  app: 'fantasy-api.llt-services.com',
} as const;

export type HostAlias = keyof typeof CANDIDATE_HOSTS;

/**
 * Se pone a `true` al cerrar la Fase 0, cuando `docs/API.md` tenga endpoints capturados de
 * peticiones reales. Hasta entonces el servidor lo dice abiertamente en `health_check`.
 */
export const API_CONTRACT_VERIFIED = false;

export const HOST_ENV_VAR = 'FANTASY_API_HOST';
export const WRITES_ENV_VAR = 'FANTASY_ENABLE_WRITES';

/** Cabeceras hipótesis, tomadas de observación de terceros. Pendientes de confirmar. */
export const REFERER = 'https://fantasy.laliga.com/';
export const APP_HEADER = 'Fantasy-web';
export const DEFAULT_LANG = 'es';

export type HostSelection =
  | { readonly configured: false; readonly reason: 'unset' }
  | { readonly configured: false; readonly reason: 'invalid'; readonly value: string }
  | { readonly configured: true; readonly host: string; readonly alias: HostAlias | null };

/** Hostname escueto: sin esquema, sin puerto, sin ruta, y con al menos un punto. */
const HOSTNAME_RE =
  /^(?=.{1,253}$)[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

function isHostAlias(value: string): value is HostAlias {
  return Object.hasOwn(CANDIDATE_HOSTS, value);
}

/**
 * Resuelve el host a partir de `FANTASY_API_HOST`. Acepta un alias (`legacy`, `app`) o un
 * hostname completo.
 *
 * **No hay valor por defecto a propósito.** Elegir uno de los dos candidatos sin haber
 * hecho la Fase 0 sería colar una suposición en el código. Devuelve un resultado en vez de
 * lanzar para que `health_check` pueda informar del estado sin tumbar el servidor.
 */
export function resolveHost(env: NodeJS.ProcessEnv = process.env): HostSelection {
  const raw = env[HOST_ENV_VAR]?.trim();
  if (raw === undefined || raw === '') {
    return { configured: false, reason: 'unset' };
  }
  if (isHostAlias(raw)) {
    return { configured: true, host: CANDIDATE_HOSTS[raw], alias: raw };
  }
  if (HOSTNAME_RE.test(raw)) {
    return { configured: true, host: raw.toLowerCase(), alias: null };
  }
  return { configured: false, reason: 'invalid', value: raw };
}

/** Igual que `resolveHost`, pero lanza. Para el futuro cliente HTTP, que sí lo necesita. */
export function requireHost(env: NodeJS.ProcessEnv = process.env): string {
  const selection = resolveHost(env);
  if (selection.configured) {
    return selection.host;
  }
  const detail =
    selection.reason === 'unset'
      ? 'no está definida'
      : `tiene un valor no válido (esperado un alias ${Object.keys(CANDIDATE_HOSTS).join('|')} o un hostname)`;
  throw new Error(
    `${HOST_ENV_VAR} ${detail}. La Fase 0 aún no ha confirmado qué host es el vigente; ` +
      'consulta docs/API.md.',
  );
}

export interface HeaderOptions {
  readonly accessToken?: string;
  readonly lang?: string;
}

/**
 * User-Agent identificable: el plan exige no camuflarse como navegador ni eludir medidas
 * técnicas.
 */
export const USER_AGENT = `${PACKAGE_NAME}/${PACKAGE_VERSION} (+https://www.npmjs.com/package/${PACKAGE_NAME})`;

/** Construye las cabeceras. Sin `accessToken` no emite `Authorization`. */
export function buildHeaders(options: HeaderOptions = {}): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Referer: REFERER,
    'X-App': APP_HEADER,
    'X-Lang': options.lang ?? DEFAULT_LANG,
    'User-Agent': USER_AGENT,
  };
  if (options.accessToken !== undefined && options.accessToken !== '') {
    headers['Authorization'] = `Bearer ${options.accessToken}`;
  }
  return headers;
}

/**
 * Las escrituras (pujas, alineación) llegan en la Fase 5 y sólo con el flag explícito.
 * Mientras tanto esto siempre debe devolver `false` en una instalación normal.
 */
export function writesEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[WRITES_ENV_VAR]?.trim().toLowerCase() === 'true';
}
