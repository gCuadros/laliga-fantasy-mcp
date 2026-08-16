/**
 * OAuth2 + PKCE against LaLiga's Azure AD B2C tenant, token refresh and encrypted storage.
 * Blocked until `docs/API.md` documents the B2C endpoints.
 */

export {
  clearCredentials,
  credentialsPath,
  credentialsStatus,
  CREDENTIALS_DIR_NAME,
  CREDENTIALS_FILE_NAME,
  keyPath,
  KEY_FILE_NAME,
  loadCredentials,
  PASSPHRASE_ENV_VAR,
  REQUIRED_DIR_MODE,
  REQUIRED_MODE,
  saveCredentials,
} from './credentials.js';
export type {
  CredentialsState,
  CredentialsStatus,
  StoredCredentials,
  StoreOptions,
} from './credentials.js';
