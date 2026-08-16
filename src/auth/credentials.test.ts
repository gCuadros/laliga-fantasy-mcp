import { chmod, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { CREDENTIALS_DIR_NAME, credentialsPath, credentialsStatus } from './credentials.js';

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
