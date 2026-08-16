import { describe, expect, it } from 'vitest';

import { PACKAGE_NAME, PACKAGE_VERSION } from './version.js';

// La versión se lee del package.json en tiempo de ejecución, con una ruta relativa que debe
// funcionar tanto desde `src/` como desde `dist/`. Si alguien cambia rootDir o outDir, esto
// es lo que se rompe.
describe('metadatos del paquete', () => {
  it('resuelve el package.json real', () => {
    expect(PACKAGE_NAME).toBe('fantasy-mcp-es');
    expect(PACKAGE_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
