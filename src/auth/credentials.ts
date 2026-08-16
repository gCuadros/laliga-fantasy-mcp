/**
 * Location, state and persistence of the credentials file.
 *
 * Only the refresh token is stored, encrypted, with `0600` permissions inside a `0700`
 * directory. `credentialsStatus` deliberately never reads the contents: reporting state must
 * be impossible to turn into a token leak. Reading is confined to `loadCredentials`, the one
 * function whose job it is.
 */

import { chmod, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { isEnvelope, KEY_BYTES, open, seal, type KeyMaterial } from './crypto.js';

export const CREDENTIALS_DIR_NAME = '.fantasy-mcp-es';
export const CREDENTIALS_FILE_NAME = 'credentials.json';
export const KEY_FILE_NAME = 'key';

/** Passphrase that keeps the encryption key off disk. Optional. */
export const PASSPHRASE_ENV_VAR = 'FANTASY_ENCRYPTION_KEY';

/** Required permissions: owner read/write only. */
export const REQUIRED_MODE = 0o600;
/** Required directory permissions: owner only. */
export const REQUIRED_DIR_MODE = 0o700;

export function credentialsPath(home: string = homedir()): string {
  return join(home, CREDENTIALS_DIR_NAME, CREDENTIALS_FILE_NAME);
}

export function keyPath(home: string = homedir()): string {
  return join(home, CREDENTIALS_DIR_NAME, KEY_FILE_NAME);
}

export type CredentialsState = 'missing' | 'insecure-permissions' | 'present';

export interface CredentialsStatus {
  readonly state: CredentialsState;
  /** Only set when permissions are too broad, so we can say what needs fixing. */
  readonly mode?: string;
}

/**
 * What we persist. Access tokens are short-lived and stay in memory; putting them on disk
 * would widen the blast radius for no benefit.
 */
export interface StoredCredentials {
  readonly refreshToken: string;
  /** ISO 8601. Lets the auth layer tell a stale refresh token from a fresh one. */
  readonly obtainedAt: string;
}

export interface StoreOptions {
  readonly home?: string;
  readonly env?: NodeJS.ProcessEnv;
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

/** Validates the decrypted payload without trusting what was on disk. */
function isStoredCredentials(value: unknown): value is StoredCredentials {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate: Record<string, unknown> = { ...value };
  return (
    typeof candidate['refreshToken'] === 'string' && typeof candidate['obtainedAt'] === 'string'
  );
}

function passphraseFrom(env: NodeJS.ProcessEnv): string | null {
  const value = env[PASSPHRASE_ENV_VAR]?.trim();
  return value === undefined || value === '' ? null : value;
}

async function readKeyFile(home: string): Promise<Buffer> {
  const raw = await readFile(keyPath(home), 'utf8');
  const key = Buffer.from(raw.trim(), 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `The key file is corrupted (expected ${String(KEY_BYTES)} bytes). ` +
        'Delete it and run the auth command again.',
    );
  }
  return key;
}

async function createKeyFile(home: string): Promise<Buffer> {
  await mkdir(join(home, CREDENTIALS_DIR_NAME), { recursive: true, mode: REQUIRED_DIR_MODE });
  const key = randomBytes(KEY_BYTES);
  try {
    // `wx` fails rather than overwriting: clobbering the key would strand the credentials.
    await writeFile(keyPath(home), key.toString('base64'), { mode: REQUIRED_MODE, flag: 'wx' });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'EEXIST') {
      return readKeyFile(home);
    }
    throw error;
  }
  // writeFile honours the umask, so the mode above is a ceiling, not a guarantee.
  await chmod(keyPath(home), REQUIRED_MODE);
  return key;
}

/** Key material for writing: creates the key file when there is none. */
async function keyMaterialForWrite(home: string, env: NodeJS.ProcessEnv): Promise<KeyMaterial> {
  const passphrase = passphraseFrom(env);
  if (passphrase !== null) {
    return { source: 'passphrase', passphrase };
  }
  try {
    return { source: 'keyfile', key: await readKeyFile(home) };
  } catch (error) {
    if (isNotFound(error)) {
      return { source: 'keyfile', key: await createKeyFile(home) };
    }
    throw error;
  }
}

/** Key material for reading: never creates anything. */
async function keyMaterialForRead(home: string, env: NodeJS.ProcessEnv): Promise<KeyMaterial> {
  const passphrase = passphraseFrom(env);
  if (passphrase !== null) {
    return { source: 'passphrase', passphrase };
  }
  try {
    return { source: 'keyfile', key: await readKeyFile(home) };
  } catch (error) {
    if (isNotFound(error)) {
      throw new Error(
        'The credentials exist but their key file is missing, so they cannot be decrypted. ' +
          'Run the auth command again.',
      );
    }
    throw error;
  }
}

/**
 * Encrypts and persists the credentials. Writes to a temporary file and renames, so an
 * interrupted run leaves the previous credentials intact rather than a truncated file.
 */
export async function saveCredentials(
  credentials: StoredCredentials,
  options: StoreOptions = {},
): Promise<void> {
  const home = options.home ?? homedir();
  const env = options.env ?? process.env;

  const material = await keyMaterialForWrite(home, env);
  const envelope = await seal(JSON.stringify(credentials), material);

  await mkdir(join(home, CREDENTIALS_DIR_NAME), { recursive: true, mode: REQUIRED_DIR_MODE });
  const target = credentialsPath(home);
  const temporary = `${target}.${randomBytes(6).toString('hex')}.tmp`;

  await writeFile(temporary, JSON.stringify(envelope, null, 2), { mode: REQUIRED_MODE });
  await chmod(temporary, REQUIRED_MODE);
  await rename(temporary, target);
}

/** Returns `null` when nobody has authenticated yet; throws when the file is unusable. */
export async function loadCredentials(
  options: StoreOptions = {},
): Promise<StoredCredentials | null> {
  const home = options.home ?? homedir();
  const env = options.env ?? process.env;

  let raw: string;
  try {
    raw = await readFile(credentialsPath(home), 'utf8');
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }
    throw error;
  }

  const parsed: unknown = JSON.parse(raw);
  if (!isEnvelope(parsed)) {
    throw new Error(
      'The credentials file is not in the expected format. Run the auth command again.',
    );
  }

  const material = await keyMaterialForRead(home, env);
  const decrypted: unknown = JSON.parse(await open(parsed, material));
  if (!isStoredCredentials(decrypted)) {
    throw new Error('The stored credentials are incomplete. Run the auth command again.');
  }
  return { refreshToken: decrypted.refreshToken, obtainedAt: decrypted.obtainedAt };
}

/**
 * Removes credentials and key. Idempotent: logging out twice is not an error. The key goes
 * too, so nothing is left that could decrypt a stale backup of the credentials file.
 */
export async function clearCredentials(options: StoreOptions = {}): Promise<void> {
  const home = options.home ?? homedir();
  await rm(credentialsPath(home), { force: true });
  await rm(keyPath(home), { force: true });
}
