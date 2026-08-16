import { describe, expect, it } from 'vitest';

import {
  buildHeaders,
  CANDIDATE_HOSTS,
  HOST_ENV_VAR,
  requireHost,
  resolveHost,
  WRITES_ENV_VAR,
  writesEnabled,
} from './config.js';

function env(value?: string): NodeJS.ProcessEnv {
  return value === undefined ? {} : { [HOST_ENV_VAR]: value };
}

describe('resolveHost', () => {
  it('no elige un host por defecto mientras la Fase 0 esté pendiente', () => {
    expect(resolveHost(env())).toEqual({ configured: false, reason: 'unset' });
    expect(resolveHost(env('   '))).toEqual({ configured: false, reason: 'unset' });
  });

  it('traduce los alias de los dos candidatos', () => {
    expect(resolveHost(env('legacy'))).toEqual({
      configured: true,
      host: CANDIDATE_HOSTS.legacy,
      alias: 'legacy',
    });
    expect(resolveHost(env('app'))).toEqual({
      configured: true,
      host: CANDIDATE_HOSTS.app,
      alias: 'app',
    });
  });

  it('acepta un hostname explícito y lo normaliza a minúsculas', () => {
    expect(resolveHost(env('  Otro.Ejemplo.COM '))).toEqual({
      configured: true,
      host: 'otro.ejemplo.com',
      alias: null,
    });
  });

  it('rechaza URLs, rutas y palabras sueltas', () => {
    for (const value of ['https://api.example.com', 'api.example.com/v3', 'localhost', '../etc']) {
      expect(resolveHost(env(value))).toEqual({ configured: false, reason: 'invalid', value });
    }
  });

  it('no confunde propiedades heredadas de Object con alias', () => {
    expect(resolveHost(env('constructor'))).toEqual({
      configured: false,
      reason: 'invalid',
      value: 'constructor',
    });
  });
});

describe('requireHost', () => {
  it('lanza con un mensaje que apunta a la Fase 0 cuando no hay host', () => {
    expect(() => requireHost(env())).toThrow(/Fase 0/);
    expect(() => requireHost(env('no válido'))).toThrow(/no válido|hostname/);
  });

  it('devuelve el host cuando está configurado', () => {
    expect(requireHost(env('app'))).toBe(CANDIDATE_HOSTS.app);
  });
});

describe('buildHeaders', () => {
  it('omite Authorization si no hay token', () => {
    const headers = buildHeaders();
    expect(headers).not.toHaveProperty('Authorization');
    expect(headers['X-Lang']).toBe('es');
    expect(headers['Referer']).toBe('https://fantasy.laliga.com/');
  });

  it('trata el token vacío como ausencia de token', () => {
    expect(buildHeaders({ accessToken: '' })).not.toHaveProperty('Authorization');
  });

  it('añade el bearer y permite cambiar el idioma', () => {
    const headers = buildHeaders({ accessToken: 'abc', lang: 'ca' });
    expect(headers['Authorization']).toBe('Bearer abc');
    expect(headers['X-Lang']).toBe('ca');
  });

  it('usa un User-Agent identificable, no uno de navegador', () => {
    const ua = buildHeaders()['User-Agent'] ?? '';
    expect(ua).toMatch(/^fantasy-mcp-es\/\d+\.\d+\.\d+/);
    expect(ua).not.toMatch(/Mozilla/);
  });
});

describe('writesEnabled', () => {
  it('sólo es true con el valor exacto "true"', () => {
    expect(writesEnabled({})).toBe(false);
    expect(writesEnabled({ [WRITES_ENV_VAR]: '1' })).toBe(false);
    expect(writesEnabled({ [WRITES_ENV_VAR]: 'yes' })).toBe(false);
    expect(writesEnabled({ [WRITES_ENV_VAR]: 'false' })).toBe(false);
    expect(writesEnabled({ [WRITES_ENV_VAR]: ' TRUE ' })).toBe(true);
  });
});
