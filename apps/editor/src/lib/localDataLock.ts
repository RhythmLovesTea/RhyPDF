/**
 * Local Data Lock Service (Task 15.6)
 * Protects stored signatures, recent files, and cached session data
 * with a master passphrase using WebCrypto PBKDF2 (100,000 iterations) and AES-GCM 256.
 */

const LOCK_HASH_KEY = 'rhypdf_data_lock_hash';
const LOCK_SALT_KEY = 'rhypdf_data_lock_salt';
const LOCK_ENABLED_KEY = 'rhypdf_data_lock_enabled';

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export function isLocalDataLockEnabled(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(LOCK_ENABLED_KEY) === 'true';
}

export async function setLocalDataLockPassphrase(passphrase: string): Promise<void> {
  if (!passphrase || passphrase.trim().length < 4) {
    throw new Error('Passphrase must be at least 4 characters long.');
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(passphrase, salt);

  // Encrypt verification token "RHYPDF_LOCK_VERIFIED"
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode('RHYPDF_LOCK_VERIFIED')
  );

  const hashData = {
    salt: Array.from(salt),
    iv: Array.from(iv),
    ciphertext: Array.from(new Uint8Array(encrypted))
  };

  localStorage.setItem(LOCK_HASH_KEY, JSON.stringify(hashData));
  localStorage.setItem(LOCK_ENABLED_KEY, 'true');
}

export async function verifyPassphrase(passphrase: string): Promise<boolean> {
  if (!isLocalDataLockEnabled()) return true;

  const rawHash = localStorage.getItem(LOCK_HASH_KEY);
  if (!rawHash) return true;

  try {
    const data = JSON.parse(rawHash);
    const salt = new Uint8Array(data.salt);
    const iv = new Uint8Array(data.iv);
    const ciphertext = new Uint8Array(data.ciphertext);

    const key = await deriveKey(passphrase, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    const text = new TextDecoder().decode(decrypted);
    return text === 'RHYPDF_LOCK_VERIFIED';
  } catch {
    return false;
  }
}

export async function removeLocalDataLock(currentPassphrase: string): Promise<boolean> {
  const isValid = await verifyPassphrase(currentPassphrase);
  if (!isValid) return false;

  localStorage.removeItem(LOCK_HASH_KEY);
  localStorage.removeItem(LOCK_SALT_KEY);
  localStorage.setItem(LOCK_ENABLED_KEY, 'false');
  return true;
}

export async function encryptWithLock(plainText: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plainText)
  );

  return JSON.stringify({
    salt: Array.from(salt),
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted))
  });
}

export async function decryptWithLock(cipherPayload: string, passphrase: string): Promise<string | null> {
  try {
    const parsed = JSON.parse(cipherPayload);
    const salt = new Uint8Array(parsed.salt);
    const iv = new Uint8Array(parsed.iv);
    const data = new Uint8Array(parsed.data);

    const key = await deriveKey(passphrase, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}
