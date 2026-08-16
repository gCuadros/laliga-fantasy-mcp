import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

interface PackageManifest {
  readonly name: string;
  readonly version: string;
}

function readManifest(): PackageManifest {
  // Resolves both from `src/` (tsx) and from `dist/` (compiled): in both cases the
  // package.json sits one level up.
  const raw: unknown = require('../package.json');
  if (
    typeof raw !== 'object' ||
    raw === null ||
    typeof (raw as PackageManifest).name !== 'string' ||
    typeof (raw as PackageManifest).version !== 'string'
  ) {
    throw new Error('Unreadable package.json: `name` or `version` is missing');
  }
  return raw as PackageManifest;
}

const manifest = readManifest();

export const PACKAGE_NAME = manifest.name;
export const PACKAGE_VERSION = manifest.version;
