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
  // writeFile respeta el umask; forzamos el modo exacto que queremos probar.
  await chmod(path, mode);
}

const originalPlatform = process.platform;

afterEach(() => {
  Object.defineProperty(process, 'platform', { value: originalPlatform });
});

describe('credentialsStatus', () => {
  it('devuelve missing si no hay fichero, sin lanzar', async () => {
    const home = await fakeHome();
    await expect(credentialsStatus(home)).resolves.toEqual({ state: 'missing' });
  });

  it('devuelve missing si la ruta existe pero no es un fichero', async () => {
    const home = await fakeHome();
    await mkdir(credentialsPath(home), { recursive: true });
    await expect(credentialsStatus(home)).resolves.toEqual({ state: 'missing' });
  });

  it('acepta 0600', async () => {
    const home = await fakeHome();
    await writeCredentials(home, 0o600);
    await expect(credentialsStatus(home)).resolves.toEqual({ state: 'present' });
  });

  it('detecta permisos laxos e informa del modo', async () => {
    const home = await fakeHome();
    await writeCredentials(home, 0o644);
    await expect(credentialsStatus(home)).resolves.toEqual({
      state: 'insecure-permissions',
      mode: '644',
    });
  });

  it('marca como laxo cualquier bit de grupo u otros', async () => {
    const home = await fakeHome();
    await writeCredentials(home, 0o604);
    const status = await credentialsStatus(home);
    expect(status.state).toBe('insecure-permissions');
  });

  it('no comprueba permisos en Windows, donde los bits POSIX no aplican', async () => {
    const home = await fakeHome();
    await writeCredentials(home, 0o644);
    Object.defineProperty(process, 'platform', { value: 'win32' });
    await expect(credentialsStatus(home)).resolves.toEqual({ state: 'present' });
  });
});
