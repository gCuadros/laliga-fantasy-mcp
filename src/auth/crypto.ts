/**
 * Authenticated encryption for the credentials file.
 *
 * AES-256-GCM: it both hides the refresh token and detects tampering, so a corrupted or
 * edited file fails loudly instead of yielding a wrong token. This module is deliberately
 * free of `fs`, which keeps it testable without touching a home directory.
 *
 * What encryption at rest buys here, honestly: it stops the refresh token from sitting in
 * plaintext in a file that gets synced to a cloud drive, swept into a backup, copied while
 * sharing dotfiles, or caught in a screen share. It does **not** defend against an attacker
 * who is already running as the user, since the key is reachable by that same user. Set
 * `FANTASY_ENCRYPTION_KEY` to keep the key off disk entirely.
 */

import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'node:crypto';

export const ENVELOPE_VERSION = 1;
export const ALGORITHM = 'aes-256-gcm';

export const KEY_BYTES = 32;
const IV_BYTES = 12;
const SALT_BYTES = 16;

/**
 * scrypt cost. 128 * N * r = 32 MiB of memory per derivation, which is above Node's default
 * `maxmem`, hence the explicit value.
 */
const SCRYPT_COST = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

/**
 * Where the key comes from. Recorded in the envelope so that decrypting with a different
 * source fails with an explanation instead of a bare authentication error.
 */
export type KeySource = 'passphrase' | 'keyfile';

export type KeyMaterial =
  | { readonly source: 'passphrase'; readonly passphrase: string }
  | { readonly source: 'keyfile'; readonly key: Buffer };

export interface Envelope {
  readonly version: number;
  readonly algorithm: string;
  readonly keySource: KeySource;
  /** Only present for passphrase-derived keys. */
  readonly salt?: string;
  readonly iv: string;
  readonly authTag: string;
  readonly ciphertext: string;
}

function deriveKey(passphrase: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(passphrase, salt, KEY_BYTES, SCRYPT_COST, (error, derived) => {
      if (error) {
        reject(error);
      } else {
        resolve(derived);
      }
    });
  });
}

async function keyFor(material: KeyMaterial, salt: Buffer): Promise<Buffer> {
  if (material.source === 'passphrase') {
    return deriveKey(material.passphrase, salt);
  }
  if (material.key.length !== KEY_BYTES) {
    throw new Error(`Encryption key must be ${String(KEY_BYTES)} bytes.`);
  }
  return material.key;
}

/** Encrypts `plaintext`. A fresh salt and IV are generated on every call. */
export async function seal(plaintext: string, material: KeyMaterial): Promise<Envelope> {
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const key = await keyFor(material, salt);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

  const base = {
    version: ENVELOPE_VERSION,
    algorithm: ALGORITHM,
    keySource: material.source,
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };

  // `exactOptionalPropertyTypes` forbids assigning `undefined`, so the salt is only added
  // when it means something.
  return material.source === 'passphrase' ? { ...base, salt: salt.toString('base64') } : base;
}

/**
 * Decrypts an envelope. Throws when the file was tampered with, when the key is wrong, or
 * when it was written by a future version. The error never carries plaintext.
 */
export async function open(envelope: Envelope, material: KeyMaterial): Promise<string> {
  if (envelope.version !== ENVELOPE_VERSION) {
    throw new Error(
      `Unsupported credentials format (version ${String(envelope.version)}). ` +
        'Run the auth command again to rewrite it.',
    );
  }
  if (envelope.algorithm !== ALGORITHM) {
    throw new Error(`Unsupported credentials algorithm: ${envelope.algorithm}.`);
  }
  if (envelope.keySource !== material.source) {
    throw new Error(
      `Credentials were encrypted with the ${envelope.keySource} key and the ${material.source} ` +
        'key is in use. Restore the original key or run the auth command again.',
    );
  }

  const salt = envelope.salt === undefined ? Buffer.alloc(0) : Buffer.from(envelope.salt, 'base64');
  const key = await keyFor(material, salt);

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(envelope.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64'));

  try {
    return Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    // The underlying error is always the same authentication failure; rephrase it so the
    // cause is actionable.
    throw new Error(
      'Could not decrypt the credentials: wrong key or the file was modified. ' +
        'Run the auth command again to recreate it.',
    );
  }
}

/** Narrows parsed JSON to an envelope without trusting the file's contents. */
export function isEnvelope(value: unknown): value is Envelope {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate: Record<string, unknown> = { ...value };
  const salt = candidate['salt'];
  return (
    typeof candidate['version'] === 'number' &&
    typeof candidate['algorithm'] === 'string' &&
    (candidate['keySource'] === 'passphrase' || candidate['keySource'] === 'keyfile') &&
    (salt === undefined || typeof salt === 'string') &&
    typeof candidate['iv'] === 'string' &&
    typeof candidate['authTag'] === 'string' &&
    typeof candidate['ciphertext'] === 'string'
  );
}
