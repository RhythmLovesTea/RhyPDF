import type { StoredSignatureRecord } from './types';
import { encryptSignaturePayload, decryptSignaturePayload } from './crypto';

const DB_NAME = 'rhypdf_signatures_db';
const STORE_NAME = 'signatures';
const DB_VERSION = 1;

// In-memory fallback for environments without IndexedDB (e.g. Node tests)
const inMemoryStore = new Map<string, StoredSignatureRecord>();

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported in this environment'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a signature record locally with optional WebCrypto encryption.
 */
export async function saveStoredSignature(
  record: Omit<StoredSignatureRecord, 'createdAt' | 'isEncrypted'>,
  passphrase?: string
): Promise<StoredSignatureRecord> {
  let isEncrypted = false;
  let ciphertext: string | undefined;
  let iv: string | undefined;
  let salt: string | undefined;
  let finalData = record.data;

  try {
    const encResult = await encryptSignaturePayload(record.data, passphrase);
    ciphertext = encResult.ciphertext;
    iv = encResult.iv;
    salt = encResult.salt;
    isEncrypted = true;
    finalData = ''; // strip plaintext from stored record when encrypted
  } catch {
    // Fallback to storing unencrypted if WebCrypto unavailable
    isEncrypted = false;
  }

  const storedRecord: StoredSignatureRecord = {
    ...record,
    data: finalData,
    createdAt: new Date().toISOString(),
    isEncrypted,
    ciphertext,
    iv,
    salt
  };

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(storedRecord);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    inMemoryStore.set(storedRecord.id, storedRecord);
  }

  return storedRecord;
}

/**
 * Loads all stored signature records and decrypts them if a passphrase or default key is provided.
 */
export async function loadStoredSignatures(passphrase?: string): Promise<StoredSignatureRecord[]> {
  let rawRecords: StoredSignatureRecord[] = [];

  try {
    const db = await openDatabase();
    rawRecords = await new Promise<StoredSignatureRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as StoredSignatureRecord[]);
      req.onerror = () => reject(req.error);
    });
  } catch {
    rawRecords = Array.from(inMemoryStore.values());
  }

  // Decrypt each record
  const decryptedRecords: StoredSignatureRecord[] = [];
  for (const r of rawRecords) {
    if (r.isEncrypted && r.ciphertext && r.iv && r.salt) {
      try {
        const decryptedData = await decryptSignaturePayload(r.ciphertext, r.iv, r.salt, passphrase);
        decryptedRecords.push({
          ...r,
          data: decryptedData
        });
      } catch {
        // If decryption fails (e.g. incorrect passphrase), keep encrypted record without plaintext data
        decryptedRecords.push({ ...r });
      }
    } else {
      decryptedRecords.push({ ...r });
    }
  }

  return decryptedRecords;
}

/**
 * Deletes a stored signature record by ID.
 */
export async function deleteStoredSignature(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    inMemoryStore.delete(id);
  }
}
