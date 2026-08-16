/**
 * Location and state of the credentials file.
 *
 * The OAuth2 + PKCE flow against LaLiga's B2C tenant is not implemented yet. This module
 * only checks whether the file exists and whether its permissions are safe: **it never
 * reads the contents**, so no token can end up in a log or in a tool response.
 */

import { stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const CREDENTIALS_DIR_NAME = '.fantasy-mcp-es';
export const CREDENTIALS_FILE_NAME = 'credentials.json';

/** Required permissions: owner read/write only. */
export const REQUIRED_MODE = 0o600;

export function credentialsPath(home: string = homedir()): string {
  return join(home, CREDENTIALS_DIR_NAME, CREDENTIALS_FILE_NAME);
}

export type CredentialsState = 'missing' | 'insecure-permissions' | 'present';

export interface CredentialsStatus {
  readonly state: CredentialsState;
  /** Only set when permissions are too broad, so we can say what needs fixing. */
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
 * State of the credentials file. Does not throw when it is missing: that is a normal state
 * (nobody has run `auth` yet).
 */
export async function credentialsStatus(home: string = homedir()): Promise<CredentialsStatus> {
  try {
    const info = await stat(credentialsPath(home));
    if (!info.isFile()) {
      return { state: 'missing' };
    }
    // POSIX mode bits are not meaningful on Windows; checking them would false-positive.
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
