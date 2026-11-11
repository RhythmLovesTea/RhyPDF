/**
 * @rhypdf/edit-core
 * Tasks 11.4 & 11.5: Hyperlink scheme validation, normalization, and detection.
 */

import type { LinkDestination } from './types';

export interface ValidationResult {
  valid: boolean;
  destination?: LinkDestination;
  error?: string;
}

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const BLOCKED_PROTOCOLS = new Set(['javascript:', 'data:', 'file:', 'vbscript:', 'blob:']);

/**
 * Validates and normalizes raw user input into a safe LinkDestination.
 * Rejects javascript:, data:, file:, and other unsafe protocols.
 */
export function validateLinkTarget(raw: string, totalPages: number = 1000): ValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, error: 'Link target cannot be empty' };
  }

  // Check for blocked protocols
  const lower = trimmed.toLowerCase();
  for (const blocked of BLOCKED_PROTOCOLS) {
    if (lower.startsWith(blocked)) {
      return {
        valid: false,
        error: `Protocol "${blocked}" is not permitted for security reasons.`
      };
    }
  }

  // Page jump syntax: "page:X", "#page=X", or pure integer
  const pageMatch = lower.match(/^(?:#?page(?:=|:)|#)(\d+)$/);
  if (pageMatch) {
    const pageNum = parseInt(pageMatch[1]!, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return { valid: false, error: 'Invalid page number' };
    }
    const pageIndex = pageNum - 1;
    if (pageIndex >= totalPages) {
      return {
        valid: false,
        error: `Page number ${pageNum} exceeds document page count (${totalPages})`
      };
    }
    return {
      valid: true,
      destination: { type: 'page', pageIndex }
    };
  }

  // Email format: "mailto:user@domain.com" or bare "user@domain.com"
  if (lower.startsWith('mailto:')) {
    const rest = trimmed.slice(7);
    const emailParts = rest.split('?');
    const email = emailParts[0]!.trim();
    if (!isValidEmail(email)) {
      return { valid: false, error: 'Invalid email address in mailto:' };
    }
    return {
      valid: true,
      destination: { type: 'email', email }
    };
  }

  if (isValidEmail(trimmed)) {
    return {
      valid: true,
      destination: { type: 'email', email: trimmed }
    };
  }

  // Telephone format: "tel:+123456789" or "+123456789"
  if (lower.startsWith('tel:')) {
    const phone = trimmed.slice(4).trim();
    if (!isValidPhone(phone)) {
      return { valid: false, error: 'Invalid phone number format' };
    }
    return {
      valid: true,
      destination: { type: 'phone', phone }
    };
  }

  if (isValidPhone(trimmed) && (trimmed.startsWith('+') || trimmed.startsWith('('))) {
    return {
      valid: true,
      destination: { type: 'phone', phone: trimmed }
    };
  }

  // Standard web URL: http:// or https://
  let urlToTest = trimmed;
  if (!urlToTest.includes('://')) {
    // If user typed domain like "github.com/google", default to https://
    urlToTest = 'https://' + urlToTest;
  }

  try {
    const parsed = new URL(urlToTest);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return {
        valid: false,
        error: `Protocol "${parsed.protocol}" is not supported. Use https, http, mailto, or tel.`
      };
    }
    return {
      valid: true,
      destination: { type: 'url', url: parsed.toString() }
    };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  return /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{5,20}$/.test(phone);
}

/**
 * Scans text content for embedded URLs and email addresses.
 */
export function findLinksInText(
  text: string
): { match: string; index: number; target: LinkDestination }[] {
  const results: { match: string; index: number; target: LinkDestination }[] = [];

  // Match URLs
  const urlRegex =
    /\b(?:https?:\/\/|www\.)[^\s<>()]+(?:\([^\s()<>]+\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’])/gi;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(text)) !== null) {
    const matchedStr = match[0];
    const validation = validateLinkTarget(matchedStr);
    if (validation.valid && validation.destination) {
      results.push({
        match: matchedStr,
        index: match.index,
        target: validation.destination
      });
    }
  }

  // Match emails
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g;
  while ((match = emailRegex.exec(text)) !== null) {
    const matchedStr = match[0];
    // Skip if already inside a matched URL
    const overlaps = results.some(
      (r) => match!.index >= r.index && match!.index < r.index + r.match.length
    );
    if (!overlaps) {
      results.push({
        match: matchedStr,
        index: match.index,
        target: { type: 'email', email: matchedStr }
      });
    }
  }

  return results;
}
