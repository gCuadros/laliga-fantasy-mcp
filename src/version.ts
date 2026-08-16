import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

interface PackageManifest {
  readonly name: string;
  readonly version: string;
}

function readManifest(): PackageManifest {
  // Resuelve tanto desde `src/` (tsx) como desde `dist/` (compilado): en ambos
  // casos el package.json queda un nivel por encima.
  const raw: unknown = require('../package.json');
  if (
    typeof raw !== 'object' ||
    raw === null ||
    typeof (raw as PackageManifest).name !== 'string' ||
    typeof (raw as PackageManifest).version !== 'string'
  ) {
    throw new Error('package.json ilegible: faltan `name` o `version`');
  }
  return raw as PackageManifest;
}

const manifest = readManifest();

export const PACKAGE_NAME = manifest.name;
export const PACKAGE_VERSION = manifest.version;
