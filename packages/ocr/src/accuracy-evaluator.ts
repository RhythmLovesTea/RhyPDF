/**
 * @rhypdf/ocr
 * Task 10.15: Accuracy Report and CER / WER Evaluator.
 * Computes Levenshtein distance, Character Error Rate (CER), and Word Error Rate (WER)
 * against ground truth text to enforce the >=90% accuracy quality gate.
 */

import type { AccuracyReport } from './types';

/**
 * Computes Levenshtein distance between two strings or token arrays.
 */
export function computeLevenshteinDistance<T = string>(a: T[] | string, b: T[] | string): number {
  const m = a.length;
  const n = b.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1, // deletion
        dp[i]![j - 1]! + 1, // insertion
        dp[i - 1]![j - 1]! + cost // substitution
      );
    }
  }

  return dp[m]![n]!;
}

/**
 * Normalizes text for comparison by removing excessive whitespace.
 */
export function normalizeOcrText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Evaluates OCR accuracy against ground truth.
 */
export function evaluateOcrAccuracy(ocrText: string, groundTruth: string): AccuracyReport {
  const normOcr = normalizeOcrText(ocrText);
  const normTruth = normalizeOcrText(groundTruth);

  // Character-level metrics
  const charErrors = computeLevenshteinDistance(normOcr, normTruth);
  const groundTruthLength = Math.max(1, normTruth.length);
  const characterErrorRate = Math.min(1.0, charErrors / groundTruthLength);

  // Word-level metrics
  const ocrWords = normOcr.split(' ').filter(Boolean);
  const truthWords = normTruth.split(' ').filter(Boolean);
  const wordErrors = computeLevenshteinDistance(ocrWords, truthWords);
  const wordErrorRate = Math.min(1.0, wordErrors / Math.max(1, truthWords.length));

  const accuracyPercent = Math.max(0, Math.min(100, (1 - characterErrorRate) * 100));

  return {
    groundTruthLength: normTruth.length,
    ocrTextLength: normOcr.length,
    characterErrors: charErrors,
    wordErrors,
    characterErrorRate,
    wordErrorRate,
    accuracyPercent
  };
}
