import { chmod, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  clearCredentials,
  CREDENTIALS_DIR_NAME,
  credentialsPath,
  credentialsStatus,
  keyPath,
  loadCredentials,
  PASSPHRASE_ENV_VAR,
  saveCredentials,
  type StoredCredentials,
} from './credentials.js';

async function fakeHome(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'fantasy-mcp-es-test-'));
}

async function writeCredentials(home: string, mode: number): Promise<void> {
  await mkdir(join(home, CREDENTIALS_DIR_NAME), { recursive: true });
  const path = credentialsPath(home);
  await writeFile(path, '{}', { mode });
  // writeFile honours the umask; force the exact mode under test.
  await chmod(path, mode);
}

const originalPlatform = process.platform;

afterEach(() => {
  Object.defineProperty(process, 'platform', { value: originalPlatform });
});

describe('credentialsStatus', () => {
  it('reports missing without throwing when there is no file', async () => {
    const home = await fakeHome();
    await expect(credentialsStatus(home)).resolves.toEqual({ state: 'missing' });
  });

  it('reports missing when the path exists but is not a file', async () => {
    const home = await fakeHome();
    await mkdir(credentialsPath(home), { recursive: true });
    await expect(credentialsStatus(home)).resolves.toEqual({ state: 'missing' });
  });

  it('accepts 0600', async () => {
    const home = await fakeHome();
    await writeCredentials(home, 0o600);
    await expect(credentialsStatus(home)).resolves.toEqual({ state: 'present' });
  });

  it('detects loose permissions and reports the mode', async () => {
    const home = await fakeHome();
    await writeCredentials(home, 0o644);
    await expect(credentialsStatus(home)).resolves.toEqual({
      state: 'insecure-permissions',
      mode: '644',
    });
  });

  it('flags any group or other bit as loose', async () => {
    const home = await fakeHome();
    await writeCredentials(home, 0o604);
    const status = await credentialsStatus(home);
    expect(status.state).toBe('insecure-permissions');
  });

  it('skips the permission check on Windows, where POSIX bits do not apply', async () => {
    const home = await fakeHome();
    await writeCredentials(home, 0o644);
    Object.defineProperty(process, 'platform', { value: 'win32' });
    await expect(credentialsStatus(home)).resolves.toEqual({ state: 'present' });
  });
});

const TOKEN = 'refresh-token-9b2f77e1';
const stored: StoredCredentials = { refreshToken: TOKEN, obtainedAt: '2026-08-16T10:00:00.000Z' };

/** No passphrase in the environment: exercises the key-file path. */
const keyfileEnv: NodeJS.ProcessEnv = {};

async function modeOf(path: string): Promise<string> {
  return ((await stat(path)).mode & 0o777).toString(8).padStart(3, '0');
}

describe('saveCredentials and loadCredentials', () => {
  it('round-trips through the key file', async () => {
    const home = await fakeHome();
    await saveCredentials(stored, { home, env: keyfileEnv });
    await expect(loadCredentials({ home, env: keyfileEnv })).resolves.toEqual(stored);
  });

  it('round-trips through a passphrase without writing a key file', async () => {
    const home = await fakeHome();
    const env: NodeJS.ProcessEnv = { [PASSPHRASE_ENV_VAR]: 'a passphrase' };
    await saveCredentials(stored, { home, env });
    await expect(loadCredentials({ home, env })).resolves.toEqual(stored);
    await expect(stat(keyPath(home))).rejects.toThrow();
  });

  it('never writes the refresh token in the clear', async () => {
    const home = await fakeHome();
    await saveCredentials(stored, { home, env: keyfileEnv });
    const onDisk = await readFile(credentialsPath(home), 'utf8');
    expect(onDisk).not.toContain(TOKEN);
    expect(onDisk).not.toContain('refreshToken');
  });

  it('writes the file and the key as 0600 inside a 0700 directory', async () => {
    const home = await fakeHome();
    await saveCredentials(stored, { home, env: keyfileEnv });
    expect(await modeOf(credentialsPath(home))).toBe('600');
    expect(await modeOf(keyPath(home))).toBe('600');
    expect(await modeOf(join(home, CREDENTIALS_DIR_NAME))).toBe('700');
  });

  it('leaves the resulting file readable by credentialsStatus', async () => {
    const home = await fakeHome();
    await saveCredentials(stored, { home, env: keyfileEnv });
    await expect(credentialsStatus(home)).resolves.toEqual({ state: 'present' });
  });

  it('reuses the existing key instead of clobbering it on a second save', async () => {
    const home = await fakeHome();
    await saveCredentials(stored, { home, env: keyfileEnv });
    const key = await readFile(keyPath(home), 'utf8');
    await saveCredentials({ ...stored, refreshToken: 'second' }, { home, env: keyfileEnv });
    expect(await readFile(keyPath(home), 'utf8')).toBe(key);
    await expect(loadCredentials({ home, env: keyfileEnv })).resolves.toMatchObject({
      refreshToken: 'second',
    });
  });

  it('leaves no temporary file behind', async () => {
    const home = await fakeHome();
    await saveCredentials(stored, { home, env: keyfileEnv });
    const entries = await readdir(join(home, CREDENTIALS_DIR_NAME));
    expect(entries.filter((name) => name.endsWith('.tmp'))).toEqual([]);
  });

  it('returns null when nobody has authenticated yet', async () => {
    const home = await fakeHome();
    await expect(loadCredentials({ home, env: keyfileEnv })).resolves.toBeNull();
  });

  it('explains that the key is gone rather than failing as a decryption error', async () => {
    const home = await fakeHome();
    await saveCredentials(stored, { home, env: keyfileEnv });
    await rm(keyPath(home));
    await expect(loadCredentials({ home, env: keyfileEnv })).rejects.toThrow(/key file is missing/);
  });

  it('rejects a file that is not an envelope', async () => {
    const home = await fakeHome();
    await mkdir(join(home, CREDENTIALS_DIR_NAME), { recursive: true });
    await writeFile(credentialsPath(home), '{"refreshToken":"plaintext"}');
    await expect(loadCredentials({ home, env: keyfileEnv })).rejects.toThrow(/expected format/);
  });

  it('rejects credentials encrypted for a different key', async () => {
    const home = await fakeHome();
    await saveCredentials(stored, { home, env: keyfileEnv });
    const env: NodeJS.ProcessEnv = { [PASSPHRASE_ENV_VAR]: 'a passphrase' };
    await expect(loadCredentials({ home, env })).rejects.toThrow(/encrypted with the keyfile key/);
  });
});

describe('clearCredentials', () => {
  it('removes both the credentials and the key', async () => {
    const home = await fakeHome();
    await saveCredentials(stored, { home, env: keyfileEnv });
    await clearCredentials({ home });
    await expect(credentialsStatus(home)).resolves.toEqual({ state: 'missing' });
    await expect(stat(keyPath(home))).rejects.toThrow();
  });

  it('is idempotent, so logging out twice is not an error', async () => {
    const home = await fakeHome();
    await expect(clearCredentials({ home })).resolves.toBeUndefined();
    await expect(clearCredentials({ home })).resolves.toBeUndefined();
  });
});
