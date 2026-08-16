/**
 * Cliente HTTP tipado, rate limiting y cache con TTL: Fase 3.
 *
 * No puede existir hasta que `docs/API.md` documente endpoints reales, así que de momento
 * este módulo sólo expone configuración.
 */

export {
  API_CONTRACT_VERIFIED,
  APP_HEADER,
  buildHeaders,
  CANDIDATE_HOSTS,
  DEFAULT_LANG,
  HOST_ENV_VAR,
  REFERER,
  requireHost,
  resolveHost,
  USER_AGENT,
  writesEnabled,
  WRITES_ENV_VAR,
} from './config.js';
export type { HeaderOptions, HostAlias, HostSelection } from './config.js';
