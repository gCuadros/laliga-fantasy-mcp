/**
 * OAuth2 + PKCE against LaLiga's Azure AD B2C tenant, token refresh and encrypted storage.
 * Blocked until `docs/API.md` documents the B2C endpoints.
 */

export {
  credentialsPath,
  credentialsStatus,
  CREDENTIALS_DIR_NAME,
  CREDENTIALS_FILE_NAME,
  REQUIRED_MODE,
} from './credentials.js';
export type { CredentialsState, CredentialsStatus } from './credentials.js';
