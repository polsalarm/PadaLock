import { argon2id } from '@noble/hashes/argon2';
import { randomBytes } from '@noble/hashes/utils';

const KEY_LEN = 32;
const SALT_LEN = 16;
const NONCE_LEN = 12;
const ARGON2_PARAMS = { t: 3, m: 64 * 1024, p: 1, dkLen: KEY_LEN } as const;

/**
 * Argon2id(password, salt) -> 32-byte AES key.
 */
export function deriveKey(password: string, salt: Uint8Array): Uint8Array {
  return argon2id(new TextEncoder().encode(password), salt, ARGON2_PARAMS);
}

export interface EncryptedBlob {
  ciphertext: string; // base64
  nonce: string; // base64
  salt: string; // base64
  version: 1;
}

function toB64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(s: string): Uint8Array {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(s, 'base64'));
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importAesKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    rawKey as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

function copy(bytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(bytes.length);
  out.set(bytes);
  return out;
}

export async function encryptMnemonic(
  mnemonic: string,
  password: string
): Promise<EncryptedBlob> {
  const salt = copy(randomBytes(SALT_LEN));
  const nonce = copy(randomBytes(NONCE_LEN));
  const key = copy(deriveKey(password, salt));
  const aes = await importAesKey(key);

  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce as BufferSource },
    aes,
    new TextEncoder().encode(mnemonic) as BufferSource
  );

  return {
    ciphertext: toB64(new Uint8Array(ct)),
    nonce: toB64(nonce),
    salt: toB64(salt),
    version: 1,
  };
}

export async function decryptMnemonic(
  blob: EncryptedBlob,
  password: string
): Promise<string> {
  const salt = fromB64(blob.salt);
  const nonce = fromB64(blob.nonce);
  const ct = fromB64(blob.ciphertext);
  const key = copy(deriveKey(password, salt));
  const aes = await importAesKey(key);

  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce as BufferSource },
    aes,
    ct as BufferSource
  );
  return new TextDecoder().decode(new Uint8Array(pt));
}
