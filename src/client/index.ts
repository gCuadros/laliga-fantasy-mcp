/**
 * Typed HTTP client, rate limiting and TTL cache.
 *
 * None of that can exist until `docs/API.md` documents real endpoints, so for now this
 * module only exposes configuration.
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
