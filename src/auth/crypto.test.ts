import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { isEnvelope, KEY_BYTES, open, seal, type KeyMaterial } from './crypto.js';

const keyfile: KeyMaterial = { source: 'keyfile', key: randomBytes(KEY_BYTES) };
const passphrase: KeyMaterial = { source: 'passphrase', passphrase: 'correct horse battery' };

const SECRET = 'refresh-token-3f9a1c';

describe('seal and open', () => {
  it('round-trips with a key file', async () => {
    const envelope = await seal(SECRET, keyfile);
    await expect(open(envelope, keyfile)).resolves.toBe(SECRET);
  });

  it('round-trips with a passphrase', async () => {
    const envelope = await seal(SECRET, passphrase);
    await expect(open(envelope, passphrase)).resolves.toBe(SECRET);
  });

  it('never leaves the plaintext inside the envelope', async () => {
    const envelope = await seal(SECRET, keyfile);
    expect(JSON.stringify(envelope)).not.toContain(SECRET);
  });

  it('produces a different ciphertext every time, so repeats are not recognisable', async () => {
    const first = await seal(SECRET, keyfile);
    const second = await seal(SECRET, keyfile);
    expect(first.ciphertext).not.toBe(second.ciphertext);
    expect(first.iv).not.toBe(second.iv);
  });

  it('carries a salt only when the key came from a passphrase', async () => {
    expect((await seal(SECRET, passphrase)).salt).toBeTypeOf('string');
    expect((await seal(SECRET, keyfile)).salt).toBeUndefined();
  });

  it('rejects a tampered ciphertext instead of returning garbage', async () => {
    const envelope = await seal(SECRET, keyfile);
    const bytes = Buffer.from(envelope.ciphertext, 'base64');
    bytes.writeUInt8(bytes.readUInt8(0) ^ 0xff, 0);
    const tampered = { ...envelope, ciphertext: bytes.toString('base64') };
    await expect(open(tampered, keyfile)).rejects.toThrow(/wrong key or the file was modified/);
  });

  it('rejects a tampered authentication tag', async () => {
    const envelope = await seal(SECRET, keyfile);
    const tag = Buffer.from(envelope.authTag, 'base64');
    tag.writeUInt8(tag.readUInt8(0) ^ 0xff, 0);
    await expect(open({ ...envelope, authTag: tag.toString('base64') }, keyfile)).rejects.toThrow();
  });

  it('rejects the wrong key', async () => {
    const envelope = await seal(SECRET, keyfile);
    const other: KeyMaterial = { source: 'keyfile', key: randomBytes(KEY_BYTES) };
    await expect(open(envelope, other)).rejects.toThrow();
  });

  it('rejects the wrong passphrase', async () => {
    const envelope = await seal(SECRET, passphrase);
    const other: KeyMaterial = { source: 'passphrase', passphrase: 'wrong horse' };
    await expect(open(envelope, other)).rejects.toThrow();
  });

  it('explains a key source mismatch rather than failing as a bad key', async () => {
    const envelope = await seal(SECRET, passphrase);
    await expect(open(envelope, keyfile)).rejects.toThrow(/encrypted with the passphrase key/);
  });

  it('refuses a future envelope version', async () => {
    const envelope = await seal(SECRET, keyfile);
    await expect(open({ ...envelope, version: 99 }, keyfile)).rejects.toThrow(/version 99/);
  });

  it('refuses a key of the wrong length', async () => {
    const short: KeyMaterial = { source: 'keyfile', key: randomBytes(16) };
    await expect(seal(SECRET, short)).rejects.toThrow(/32 bytes/);
  });
});

describe('isEnvelope', () => {
  it('accepts what seal produces', async () => {
    expect(isEnvelope(await seal(SECRET, keyfile))).toBe(true);
  });

  it.each([
    ['null', null],
    ['a string', 'nope'],
    ['an empty object', {}],
    [
      'an unknown key source',
      { version: 1, algorithm: 'a', keySource: 'hsm', iv: '', authTag: '', ciphertext: '' },
    ],
    ['a missing field', { version: 1, algorithm: 'a', keySource: 'keyfile', iv: '', authTag: '' }],
  ])('rejects %s', (_label, value) => {
    expect(isEnvelope(value)).toBe(false);
  });
});
