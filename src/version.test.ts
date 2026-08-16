import { describe, expect, it } from 'vitest';

import { PACKAGE_NAME, PACKAGE_VERSION } from './version.js';

// The version is read from package.json at runtime, through a relative path that has to
// work both from `src/` and from `dist/`. Change rootDir or outDir and this is what breaks.
describe('package metadata', () => {
  it('resolves the real package.json', () => {
    expect(PACKAGE_NAME).toBe('fantasy-mcp-es');
    expect(PACKAGE_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
