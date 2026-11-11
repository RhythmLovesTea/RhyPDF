import { PDFDocument, PDFName } from 'pdf-lib';
import type { PdfMetadata } from './types';

/**
 * Extracts document metadata (Task 15.4).
 */
export async function getPdfMetadata(pdfBytes: Uint8Array): Promise<PdfMetadata> {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  return {
    title: doc.getTitle() || '',
    author: doc.getAuthor() || '',
    subject: doc.getSubject() || '',
    keywords: doc.getKeywords()
      ? doc
          .getKeywords()!
          .split(/[,;\s]+/)
          .filter((k) => k.length > 0)
      : [],
    creator: doc.getCreator() || '',
    producer: doc.getProducer() || '',
    creationDate: doc.getCreationDate(),
    modificationDate: doc.getModificationDate()
  };
}

/**
 * Sets document metadata (Task 15.4).
 */
export async function setPdfMetadata(
  pdfBytes: Uint8Array,
  metadata: PdfMetadata
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  if (metadata.title !== undefined) doc.setTitle(metadata.title);
  if (metadata.author !== undefined) doc.setAuthor(metadata.author);
  if (metadata.subject !== undefined) doc.setSubject(metadata.subject);
  if (metadata.keywords !== undefined) doc.setKeywords(metadata.keywords);
  if (metadata.creator !== undefined) doc.setCreator(metadata.creator);
  if (metadata.producer !== undefined) doc.setProducer(metadata.producer);
  if (metadata.creationDate !== undefined) doc.setCreationDate(metadata.creationDate);
  if (metadata.modificationDate !== undefined) doc.setModificationDate(metadata.modificationDate);

  return await doc.save({ useObjectStreams: true });
}

/**
 * Strips all metadata (Info dictionary + XMP Metadata stream) (Task 15.4).
 */
export async function stripAllMetadata(pdfBytes: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  // Clear Info dict fields
  doc.setTitle('');
  doc.setAuthor('');
  doc.setSubject('');
  doc.setKeywords([]);
  doc.setProducer('');
  doc.setCreator('');

  // Remove XML /Metadata stream from document catalog
  const catalog = doc.catalog;
  if (catalog.has(PDFName.of('Metadata'))) {
    catalog.delete(PDFName.of('Metadata'));
  }

  return await doc.save({ useObjectStreams: true });
}
