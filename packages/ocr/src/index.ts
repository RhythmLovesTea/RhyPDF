/**
 * @rhypdf/ocr
 * Public API for the OCR subsystem:
 * Engines, Preprocessing, Scanned Page Detection, Block Conversion,
 * Erasure, Invisible Searchable Layer, Batch OCR, Region OCR, and Accuracy Evaluation.
 */

export * from './types';
export * from './scanned-detector';
export * from './preprocessor';
export * from './tesseract-adapter';
export * from './paddle-adapter';
export * from './ocr-cache';
export * from './block-converter';
export * from './invisible-layer';
export * from './erasure-strategy';
export * from './language-detector';
export * from './region-ocr';
export * from './batch-ocr';
export * from './handwriting-detector';
export * from './accuracy-evaluator';
