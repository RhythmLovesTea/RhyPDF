const CHAR_MAP: Record<string, string> = {
  a: 'ä',
  b: 'ƀ',
  c: 'ç',
  d: 'ð',
  e: 'ë',
  f: 'ƒ',
  g: 'ğ',
  h: 'ĥ',
  i: 'ï',
  j: 'ĵ',
  k: 'ƙ',
  l: 'ḻ',
  m: 'ɱ',
  n: 'ñ',
  o: 'ô',
  p: 'ƥ',
  q: 'ʠ',
  r: 'ř',
  s: 'ŝ',
  t: 'ŧ',
  u: 'ü',
  v: 'ṽ',
  w: 'ŵ',
  x: 'ẋ',
  y: 'ÿ',
  z: 'ẑ',
  A: 'Ä',
  B: 'Ɓ',
  C: 'Ç',
  D: 'Ð',
  E: 'Ë',
  F: 'Ƒ',
  G: 'Ğ',
  H: 'Ĥ',
  I: 'Ï',
  J: 'Ĵ',
  K: 'Ƙ',
  L: 'Ḻ',
  M: 'Ṃ',
  N: 'Ñ',
  O: 'Ô',
  P: 'Ƥ',
  Q: 'Ǫ',
  R: 'Ř',
  S: 'Ŝ',
  T: 'Ŧ',
  U: 'Ü',
  V: 'Ṽ',
  W: 'Ŵ',
  X: 'Ẋ',
  Y: 'Ÿ',
  Z: 'Ẑ'
};

/**
 * Transforms an English string into an elongated, accented pseudo-localized string.
 * Preserves i18next interpolation tokens (e.g. {{variable}}).
 */
export function pseudolocalizeString(input: string): string {
  if (!input || typeof input !== 'string') return input;

  // Split on {{...}} or {...} tokens to leave them untouched
  const segments = input.split(/(\{\{[^}]+\}\}|\{[^}]+\})/g);

  const transformed = segments
    .map((seg) => {
      if (seg.startsWith('{') && seg.endsWith('}')) {
        return seg;
      }
      let result = '';
      for (const ch of seg) {
        result += CHAR_MAP[ch] ?? ch;
      }
      // Elongate by ~35% with visual expansion dots
      const extraLength = Math.max(1, Math.round(seg.trim().length * 0.35));
      const pad = seg.trim().length > 0 ? ' ' + '▪'.repeat(Math.min(extraLength, 6)) : '';
      return result + pad;
    })
    .join('');

  return `[!!! ${transformed} !!!]`;
}

/**
 * Deep-transforms a nested dictionary of translations into its pseudo-localized version.
 */
export function generatePseudoLocale<T extends Record<string, unknown>>(source: T): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'string') {
      result[key] = pseudolocalizeString(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = generatePseudoLocale(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}
