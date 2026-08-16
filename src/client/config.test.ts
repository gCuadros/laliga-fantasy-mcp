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
  it('picks no default host while the contract is unverified', () => {
    expect(resolveHost(env())).toEqual({ configured: false, reason: 'unset' });
    expect(resolveHost(env('   '))).toEqual({ configured: false, reason: 'unset' });
  });

  it('translates the aliases of the two candidates', () => {
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

  it('accepts an explicit hostname and lowercases it', () => {
    expect(resolveHost(env('  Otro.Ejemplo.COM '))).toEqual({
      configured: true,
      host: 'otro.ejemplo.com',
      alias: null,
    });
  });

  it('rejects URLs, paths and bare words', () => {
    for (const value of ['https://api.example.com', 'api.example.com/v3', 'localhost', '../etc']) {
      expect(resolveHost(env(value))).toEqual({ configured: false, reason: 'invalid', value });
    }
  });

  it('does not mistake inherited Object properties for aliases', () => {
    expect(resolveHost(env('constructor'))).toEqual({
      configured: false,
      reason: 'invalid',
      value: 'constructor',
    });
  });
});

describe('requireHost', () => {
  it('throws pointing at the unverified contract when no host is set', () => {
    expect(() => requireHost(env())).toThrow(/not been verified/);
    expect(() => requireHost(env('not a host'))).toThrow(/invalid value|hostname/);
  });

  it('returns the host once configured', () => {
    expect(requireHost(env('app'))).toBe(CANDIDATE_HOSTS.app);
  });
});

describe('buildHeaders', () => {
  it('omits Authorization when there is no token', () => {
    const headers = buildHeaders();
    expect(headers).not.toHaveProperty('Authorization');
    expect(headers['X-Lang']).toBe('es');
    expect(headers['Referer']).toBe('https://fantasy.laliga.com/');
  });

  it('treats an empty token as no token', () => {
    expect(buildHeaders({ accessToken: '' })).not.toHaveProperty('Authorization');
  });

  it('adds the bearer and allows overriding the language', () => {
    const headers = buildHeaders({ accessToken: 'abc', lang: 'ca' });
    expect(headers['Authorization']).toBe('Bearer abc');
    expect(headers['X-Lang']).toBe('ca');
  });

  it('uses an identifiable User-Agent, not a browser one', () => {
    const ua = buildHeaders()['User-Agent'] ?? '';
    expect(ua).toMatch(/^fantasy-mcp-es\/\d+\.\d+\.\d+/);
    expect(ua).not.toMatch(/Mozilla/);
  });
});

describe('writesEnabled', () => {
  it('is only true for the exact value "true"', () => {
    expect(writesEnabled({})).toBe(false);
    expect(writesEnabled({ [WRITES_ENV_VAR]: '1' })).toBe(false);
    expect(writesEnabled({ [WRITES_ENV_VAR]: 'yes' })).toBe(false);
    expect(writesEnabled({ [WRITES_ENV_VAR]: 'false' })).toBe(false);
    expect(writesEnabled({ [WRITES_ENV_VAR]: ' TRUE ' })).toBe(true);
  });
});
