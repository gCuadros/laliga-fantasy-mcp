/**
 * Ubicación y estado del fichero de credenciales.
 *
 * El flujo OAuth2 + PKCE contra el B2C de LaLiga es la Fase 2. Aquí sólo se comprueba si
 * el fichero existe y si sus permisos son seguros: **nunca se lee su contenido**, para que
 * ningún token pueda acabar en un log o en la respuesta de una tool.
 */

import { stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const CREDENTIALS_DIR_NAME = '.fantasy-mcp-es';
export const CREDENTIALS_FILE_NAME = 'credentials.json';

/** Permisos exigidos: sólo el propietario puede leer/escribir. */
export const REQUIRED_MODE = 0o600;

export function credentialsPath(home: string = homedir()): string {
  return join(home, CREDENTIALS_DIR_NAME, CREDENTIALS_FILE_NAME);
}

export type CredentialsState = 'missing' | 'insecure-permissions' | 'present';

export interface CredentialsStatus {
  readonly state: CredentialsState;
  /** Presente sólo si los permisos son laxos, para poder decir qué hay que corregir. */
  readonly mode?: string;
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as NodeJS.ErrnoException).code !== undefined &&
    ['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')
  );
}

/**
 * Estado del fichero de credenciales. No lanza si falta: la ausencia es un estado normal
 * (nadie ha ejecutado `auth` todavía).
 */
export async function credentialsStatus(home: string = homedir()): Promise<CredentialsStatus> {
  try {
    const info = await stat(credentialsPath(home));
    if (!info.isFile()) {
      return { state: 'missing' };
    }
    // En Windows los bits POSIX no son significativos: comprobarlos daría un falso positivo.
    if (process.platform !== 'win32') {
      const permissions = info.mode & 0o777;
      if ((permissions & ~REQUIRED_MODE) !== 0) {
        return { state: 'insecure-permissions', mode: permissions.toString(8).padStart(3, '0') };
      }
    }
    return { state: 'present' };
  } catch (error) {
    if (isNotFound(error)) {
      return { state: 'missing' };
    }
    throw error;
  }
}
