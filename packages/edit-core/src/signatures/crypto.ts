/**
 * WebCrypto AES-GCM 256-bit encryption and PBKDF2 key derivation
 * Runs entirely in-browser/client-side without server or external dependencies.
 */

function getSubtleCrypto(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c || !c.subtle) {
    throw new Error('WebCrypto SubtleCrypto is not available in this environment');
  }
  return c.subtle;
}

function getRandomValues(len: number): Uint8Array {
  const bytes = new Uint8Array(len);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(u8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Derives a 256-bit AES-GCM key from a passphrase and salt using PBKDF2 (100,000 iterations).
 */
export async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const enc = new TextEncoder();
  const rawKey = enc.encode(passphrase);

  const baseKey = await subtle.importKey('raw', rawKey, 'PBKDF2', false, ['deriveKey']);

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a plaintext string using AES-GCM 256-bit with an optional passphrase.
 * If passphrase is provided, derives key with PBKDF2 and returns salt + iv + ciphertext.
 * If passphrase is not provided, uses a default local device key.
 */
export async function encryptSignaturePayload(
  plaintext: string,
  passphrase?: string
): Promise<{ ciphertext: string; iv: string; salt: string }> {
  const subtle = getSubtleCrypto();
  const enc = new TextEncoder();
  const data = enc.encode(plaintext);

  const saltBytes = getRandomValues(16);
  const ivBytes = getRandomValues(12);

  const key = await deriveKeyFromPassphrase(passphrase ?? 'RhyPdf_Default_Local_Key_v1', saltBytes);

  const encryptedBuffer = await subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes
    },
    key,
    data
  );

  return {
    ciphertext: bufferToHex(encryptedBuffer),
    iv: bufferToHex(ivBytes),
    salt: bufferToHex(saltBytes)
  };
}

/**
 * Decrypts a ciphertext string using AES-GCM 256-bit with passphrase and stored salt + iv.
 */
export async function decryptSignaturePayload(
  ciphertext: string,
  iv: string,
  salt: string,
  passphrase?: string
): Promise<string> {
  const subtle = getSubtleCrypto();
  const cipherBytes = hexToBuffer(ciphertext);
  const ivBytes = hexToBuffer(iv);
  const saltBytes = hexToBuffer(salt);

  const key = await deriveKeyFromPassphrase(passphrase ?? 'RhyPdf_Default_Local_Key_v1', saltBytes);

  const decryptedBuffer = await subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes
    },
    key,
    cipherBytes
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}
