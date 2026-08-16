/**
 * OAuth2 + PKCE contra el tenant Azure AD B2C de LaLiga, refresco y almacenamiento
 * cifrado: Fase 2. Bloqueada hasta que `docs/API.md` documente los endpoints del B2C.
 */

export {
  credentialsPath,
  credentialsStatus,
  CREDENTIALS_DIR_NAME,
  CREDENTIALS_FILE_NAME,
  REQUIRED_MODE,
} from './credentials.js';
export type { CredentialsState, CredentialsStatus } from './credentials.js';
