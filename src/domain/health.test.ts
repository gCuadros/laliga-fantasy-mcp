import { describe, expect, it } from 'vitest';

import { buildHealthReport, type HealthSnapshot } from './health.js';

const base: HealthSnapshot = {
  name: 'fantasy-mcp-es',
  version: '0.1.0',
  nodeVersion: 'v22.14.0',
  host: { configured: false, reason: 'unset' },
  credentials: { state: 'missing' },
  writesEnabled: false,
  apiContractVerified: false,
};

function report(overrides: Partial<HealthSnapshot> = {}): string {
  return buildHealthReport({ ...base, ...overrides });
}

describe('buildHealthReport', () => {
  it('says the API contract is unverified instead of pretending there is data', () => {
    const text = report();
    expect(text).toContain('fantasy-mcp-es v0.1.0');
    expect(text).toContain('sin contrato de API verificado');
    expect(text).toContain('Credenciales: no configuradas');
  });

  it('tells an aliased host from an explicit one, and marks both as unverified', () => {
    expect(report({ host: { configured: true, host: 'x.example.com', alias: 'app' } })).toContain(
      'x.example.com (alias "app", sin verificar)',
    );
    expect(report({ host: { configured: true, host: 'x.example.com', alias: null } })).toContain(
      'x.example.com (valor explícito, sin verificar)',
    );
  });

  it('explains what was expected when the environment value is invalid', () => {
    expect(report({ host: { configured: false, reason: 'invalid', value: 'http://x' } })).toContain(
      'FANTASY_API_HOST',
    );
  });

  it('points out loose permissions on the credentials file', () => {
    const text = report({ credentials: { state: 'insecure-permissions', mode: '644' } });
    expect(text).toContain('permisos 644');
    expect(text).toContain('deben ser 600');
  });

  it('shouts when writes are enabled', () => {
    expect(report({ writesEnabled: true })).toContain('Escrituras: HABILITADAS');
    expect(report()).toContain('Escrituras: deshabilitadas');
  });

  it('only suggests `auth` once the contract is verified', () => {
    expect(report()).not.toContain('auth');
    expect(report({ apiContractVerified: true })).toContain('npx fantasy-mcp-es auth');
    expect(report({ apiContractVerified: true, credentials: { state: 'present' } })).not.toContain(
      'auth',
    );
  });

  it('leaks neither local paths nor credential contents', () => {
    const text = report({ credentials: { state: 'present' } });
    expect(text).not.toContain('credentials.json');
    expect(text).not.toMatch(/\/(Users|home)\//);
  });

  it('keeps internal roadmap wording out of user-facing output', () => {
    for (const snapshot of [report(), report({ apiContractVerified: true })]) {
      expect(snapshot).not.toMatch(/fase/i);
    }
  });
});
