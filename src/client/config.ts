/**
 * The single place in the project where the API host and headers live.
 *
 * Nothing here is verified: the manual DevTools capture is still pending and `docs/API.md`
 * is intentionally empty. No other file may hardcode a host or a header.
 */

import { PACKAGE_NAME, PACKAGE_VERSION } from '../version.js';

/**
 * The two candidate hosts found in third-party projects. **Neither is verified** and we do
 * not know which one is current:
 *
 * - `legacy`: used by the older Python scrapers (`marca-fantasy-api-scraper`).
 * - `app`: used by LaLigaApp (React/Electron), active as of July 2026.
 *
 * They are listed as documentation of the hypothesis, not as a default. Once the contract
 * is verified, the one that does not respond should be deleted from here.
 */
export const CANDIDATE_HOSTS = {
  legacy: 'api-fantasy.llt-services.com',
  app: 'fantasy-api.llt-services.com',
} as const;

export type HostAlias = keyof typeof CANDIDATE_HOSTS;

/**
 * Flipped to `true` once `docs/API.md` documents endpoints captured from real requests.
 * Until then the server says so openly in `health_check`.
 */
export const API_CONTRACT_VERIFIED = false;

export const HOST_ENV_VAR = 'FANTASY_API_HOST';
export const WRITES_ENV_VAR = 'FANTASY_ENABLE_WRITES';

/** Hypothesised headers, taken from third-party observation. Not confirmed. */
export const REFERER = 'https://fantasy.laliga.com/';
export const APP_HEADER = 'Fantasy-web';
export const DEFAULT_LANG = 'es';

export type HostSelection =
  | { readonly configured: false; readonly reason: 'unset' }
  | { readonly configured: false; readonly reason: 'invalid'; readonly value: string }
  | { readonly configured: true; readonly host: string; readonly alias: HostAlias | null };

/** Bare hostname: no scheme, no port, no path, and at least one dot. */
const HOSTNAME_RE =
  /^(?=.{1,253}$)[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

function isHostAlias(value: string): value is HostAlias {
  return Object.hasOwn(CANDIDATE_HOSTS, value);
}

/**
 * Resolves the host from `FANTASY_API_HOST`. Accepts an alias (`legacy`, `app`) or a full
 * hostname.
 *
 * **There is deliberately no default.** Picking one of the two candidates before the
 * contract is verified would bake a guess into the code. Returns a result instead of
 * throwing so that `health_check` can report the state without taking the server down.
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

/** Same as `resolveHost`, but throws. For the HTTP client, which does need a host. */
export function requireHost(env: NodeJS.ProcessEnv = process.env): string {
  const selection = resolveHost(env);
  if (selection.configured) {
    return selection.host;
  }
  const detail =
    selection.reason === 'unset'
      ? 'is not set'
      : `holds an invalid value (expected one of ${Object.keys(CANDIDATE_HOSTS).join('|')} or a hostname)`;
  throw new Error(
    `${HOST_ENV_VAR} ${detail}. The current API host has not been verified yet; see docs/API.md.`,
  );
}

export interface HeaderOptions {
  readonly accessToken?: string;
  readonly lang?: string;
}

/**
 * Identifiable User-Agent: this project does not disguise itself as a browser and does not
 * circumvent technical measures.
 */
export const USER_AGENT = `${PACKAGE_NAME}/${PACKAGE_VERSION} (+https://www.npmjs.com/package/${PACKAGE_NAME})`;

/** Builds the request headers. Without an `accessToken` no `Authorization` is emitted. */
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
 * Writes (bids, lineup) ship behind an explicit flag. Until then this must return `false`
 * on any normal installation.
 */
export function writesEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[WRITES_ENV_VAR]?.trim().toLowerCase() === 'true';
}
