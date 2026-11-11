import type { LinkSafetyCheck } from './types';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const BLOCKED_PROTOCOLS = new Set(['javascript:', 'data:', 'file:', 'vbscript:', 'blob:']);

/**
 * Validates links and PDF actions against security rules (Task 15.9):
 * - Allows only http, https, mailto, tel.
 * - Blocks javascript:, data:, file:, vbscript:, and external executables.
 * - Confirms before opening external links.
 */
export function validateLinkSafety(rawUrl: string): LinkSafetyCheck {
  if (!rawUrl || rawUrl.trim() === '') {
    return {
      isSafe: false,
      requiresConfirmation: false,
      reason: 'Empty link URL'
    };
  }

  const clean = rawUrl.trim();

  // Explicit check for malicious JavaScript or inline script injection
  if (/^\s*javascript:/i.test(clean)) {
    return {
      isSafe: false,
      protocol: 'javascript:',
      requiresConfirmation: false,
      reason: 'JavaScript execution inside PDF links is strictly blocked for security.'
    };
  }

  // Parse protocol
  let protocol: string;
  try {
    const parsed = new URL(clean, 'https://example.com');
    protocol = parsed.protocol.toLowerCase();
  } catch {
    // Relative or invalid link
    return {
      isSafe: false,
      requiresConfirmation: false,
      reason: 'Malformed URL structure'
    };
  }

  if (BLOCKED_PROTOCOLS.has(protocol)) {
    return {
      isSafe: false,
      protocol,
      requiresConfirmation: false,
      reason: `The protocol '${protocol}' is blocked for security.`
    };
  }

  if (!ALLOWED_PROTOCOLS.has(protocol)) {
    return {
      isSafe: false,
      protocol,
      requiresConfirmation: false,
      reason: `Unsupported protocol '${protocol}'. Only HTTP, HTTPS, Mailto, and Tel links are permitted.`
    };
  }

  // Safe protocols: HTTP and HTTPS require user confirmation; mailto/tel can open directly
  const requiresConfirmation = protocol === 'http:' || protocol === 'https:';

  return {
    isSafe: true,
    protocol,
    requiresConfirmation,
    sanitizedUrl: clean
  };
}
