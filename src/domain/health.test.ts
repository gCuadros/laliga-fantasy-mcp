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
  it('avisa de que la Fase 0 sigue pendiente en vez de fingir que hay API', () => {
    const text = report();
    expect(text).toContain('fantasy-mcp-es v0.1.0');
    expect(text).toContain('Fase 0 pendiente');
    expect(text).toContain('Credenciales: no configuradas');
  });

  it('distingue host por alias de host explícito, y ambos como sin verificar', () => {
    expect(report({ host: { configured: true, host: 'x.example.com', alias: 'app' } })).toContain(
      'x.example.com (alias "app", sin verificar)',
    );
    expect(report({ host: { configured: true, host: 'x.example.com', alias: null } })).toContain(
      'x.example.com (valor explícito, sin verificar)',
    );
  });

  it('explica qué se esperaba cuando el valor del entorno no es válido', () => {
    expect(report({ host: { configured: false, reason: 'invalid', value: 'http://x' } })).toContain(
      'FANTASY_API_HOST',
    );
  });

  it('señala los permisos laxos del fichero de credenciales', () => {
    const text = report({ credentials: { state: 'insecure-permissions', mode: '644' } });
    expect(text).toContain('permisos 644');
    expect(text).toContain('deben ser 600');
  });

  it('destaca en mayúsculas que las escrituras están habilitadas', () => {
    expect(report({ writesEnabled: true })).toContain('Escrituras: HABILITADAS');
    expect(report()).toContain('Escrituras: deshabilitadas');
  });

  it('sólo sugiere `auth` cuando el contrato ya está verificado', () => {
    expect(report()).not.toContain('auth');
    expect(report({ apiContractVerified: true })).toContain('npx fantasy-mcp-es auth');
    expect(report({ apiContractVerified: true, credentials: { state: 'present' } })).not.toContain(
      'auth',
    );
  });

  it('no filtra rutas locales ni contenido de credenciales', () => {
    const text = report({ credentials: { state: 'present' } });
    expect(text).not.toContain('credentials.json');
    expect(text).not.toMatch(/\/(Users|home)\//);
  });
});
