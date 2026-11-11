import type { PdfSecurityOptions } from './types';

export interface PdfEncryptionEngine<TDoc = unknown> {
  open: (bytes: ArrayBuffer | Uint8Array, opts?: { password?: string }) => Promise<TDoc>;
  save: (
    doc: TDoc,
    opts?: {
      password?: string;
      ownerPassword?: string;
      permissions?: number;
      stripSecurity?: boolean;
      incremental?: boolean;
    }
  ) => Promise<Blob>;
  close: (doc: TDoc) => Promise<void> | void;
}

/**
 * Encrypts a PDF document with user/owner passwords and permissions bitmask (Task 15.1).
 * Uses PDFium's EPDF_SetEncryption or engine serialization.
 */
export async function encryptPdf<TDoc = unknown>(
  pdfBytes: Uint8Array,
  options: PdfSecurityOptions,
  engine: PdfEncryptionEngine<TDoc>
): Promise<Uint8Array> {
  const doc = await engine.open(pdfBytes);
  try {
    const savedBlob = await engine.save(doc, {
      incremental: false,
      password: options.userPassword,
      ownerPassword: options.ownerPassword || options.userPassword,
      permissions: options.permissions ?? -1
    });
    const buffer = await savedBlob.arrayBuffer();
    return new Uint8Array(buffer);
  } finally {
    await engine.close(doc);
  }
}

/**
 * Removes encryption from a password-protected PDF document (Task 15.2).
 * Verifies the password, strips security, and saves an unencrypted document.
 */
export async function decryptPdf<TDoc = unknown>(
  pdfBytes: Uint8Array,
  password: string,
  engine: PdfEncryptionEngine<TDoc>
): Promise<Uint8Array> {
  const doc = await engine.open(pdfBytes, { password });
  try {
    const savedBlob = await engine.save(doc, {
      incremental: false,
      stripSecurity: true
    });
    const buffer = await savedBlob.arrayBuffer();
    return new Uint8Array(buffer);
  } finally {
    await engine.close(doc);
  }
}
