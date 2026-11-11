/**
 * @rhypdf/edit-core
 * Task 11.6: Bullet and numbered lists inside text boxes with indent and outdent.
 */

export type ListType = 'bullet' | 'number' | 'none';

const BULLET_GLYPHS = ['•', '◦', '▪'];
const INDENT_SPACES = '    '; // 4 spaces per indent level

export interface LineListInfo {
  isList: boolean;
  type: ListType;
  level: number;
  prefix: string;
  content: string;
  rawLine: string;
}

/**
 * Parses a line to determine its list formatting, indentation level, and content.
 */
export function parseLineListInfo(line: string): LineListInfo {
  // Count leading spaces to determine indent level
  const leadingSpaces = line.match(/^(\s*)/)?.[1] ?? '';
  const level = Math.floor(leadingSpaces.length / 4);
  const trimmed = line.slice(leadingSpaces.length);

  // Check bullet match
  const bulletMatch = trimmed.match(/^([•◦▪\-\*])\s+(.*)$/);
  if (bulletMatch) {
    return {
      isList: true,
      type: 'bullet',
      level,
      prefix: bulletMatch[1]!,
      content: bulletMatch[2]!,
      rawLine: line
    };
  }

  // Check numbered list match: "1. ", "a. ", "i. "
  const numberMatch = trimmed.match(/^(\d+|[a-zA-Z]|[ivxIVX]+)[\.\)]\s+(.*)$/);
  if (numberMatch) {
    return {
      isList: true,
      type: 'number',
      level,
      prefix: numberMatch[1]!,
      content: numberMatch[2]!,
      rawLine: line
    };
  }

  return {
    isList: false,
    type: 'none',
    level: 0,
    prefix: '',
    content: line,
    rawLine: line
  };
}

/**
 * Formats multi-line text into a bullet list or toggles it off if all lines are already bulleted.
 */
export function toggleBulletList(text: string): string {
  const lines = text.split('\n');
  const allBulleted = lines.every((line) => {
    const info = parseLineListInfo(line);
    return !line.trim() || (info.isList && info.type === 'bullet');
  });

  if (allBulleted) {
    // Strip bullets
    return lines
      .map((line) => {
        const info = parseLineListInfo(line);
        if (info.isList && info.type === 'bullet') {
          return `${INDENT_SPACES.repeat(info.level)}${info.content}`;
        }
        return line;
      })
      .join('\n');
  }

  // Apply bullets
  return lines
    .map((line) => {
      if (!line.trim()) return line;
      const info = parseLineListInfo(line);
      const level = Math.min(info.level, BULLET_GLYPHS.length - 1);
      const bullet = BULLET_GLYPHS[level] ?? '•';
      const content = info.isList ? info.content : line.trim();
      return `${INDENT_SPACES.repeat(info.level)}${bullet} ${content}`;
    })
    .join('\n');
}

/**
 * Formats multi-line text into a numbered list (1., 2., 3...) or toggles it off if already numbered.
 */
export function toggleNumberedList(text: string): string {
  const lines = text.split('\n');
  const allNumbered = lines.every((line) => {
    const info = parseLineListInfo(line);
    return !line.trim() || (info.isList && info.type === 'number');
  });

  if (allNumbered) {
    // Strip numbering
    return lines
      .map((line) => {
        const info = parseLineListInfo(line);
        if (info.isList && info.type === 'number') {
          return `${INDENT_SPACES.repeat(info.level)}${info.content}`;
        }
        return line;
      })
      .join('\n');
  }

  // Apply sequential numbering per indent level
  const counters: Record<number, number> = {};

  return lines
    .map((line) => {
      if (!line.trim()) return line;
      const info = parseLineListInfo(line);
      const level = info.level;

      counters[level] = (counters[level] ?? 0) + 1;
      // Reset deeper levels
      for (const k of Object.keys(counters)) {
        if (Number(k) > level) {
          delete counters[Number(k)];
        }
      }

      const numStr = formatNumberForLevel(counters[level]!, level);
      const content = info.isList ? info.content : line.trim();
      return `${INDENT_SPACES.repeat(level)}${numStr}. ${content}`;
    })
    .join('\n');
}

function formatNumberForLevel(num: number, level: number): string {
  if (level === 1) {
    // a, b, c...
    return String.fromCharCode(96 + ((num - 1) % 26) + 1);
  }
  if (level >= 2) {
    // i, ii, iii, iv...
    const roman = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
    return roman[(num - 1) % 10] ?? `${num}`;
  }
  return `${num}`;
}

/**
 * Increases indent level for all lines.
 */
export function indentList(text: string): string {
  const lines = text.split('\n');
  return lines
    .map((line) => {
      if (!line.trim()) return line;
      const info = parseLineListInfo(line);
      if (info.isList && info.type === 'bullet') {
        const nextLevel = Math.min(info.level + 1, BULLET_GLYPHS.length - 1);
        const bullet = BULLET_GLYPHS[nextLevel] ?? '•';
        return `${INDENT_SPACES.repeat(info.level + 1)}${bullet} ${info.content}`;
      }
      return `${INDENT_SPACES}${line}`;
    })
    .join('\n');
}

/**
 * Decreases indent level for all lines.
 */
export function outdentList(text: string): string {
  const lines = text.split('\n');
  return lines
    .map((line) => {
      if (!line.trim()) return line;
      const info = parseLineListInfo(line);
      if (info.isList && info.level > 0) {
        const nextLevel = info.level - 1;
        if (info.type === 'bullet') {
          const bullet = BULLET_GLYPHS[nextLevel] ?? '•';
          return `${INDENT_SPACES.repeat(nextLevel)}${bullet} ${info.content}`;
        }
        return `${INDENT_SPACES.repeat(nextLevel)}${info.prefix}. ${info.content}`;
      }
      // Outdent plain indent
      if (line.startsWith(INDENT_SPACES)) {
        return line.slice(INDENT_SPACES.length);
      }
      return line.trimStart();
    })
    .join('\n');
}

/**
 * Determines prevailing list type of text.
 */
export function detectListType(text: string): { type: ListType; level: number } {
  const firstNonEmpty = text.split('\n').find((l) => l.trim().length > 0);
  if (!firstNonEmpty) {
    return { type: 'none', level: 0 };
  }
  const info = parseLineListInfo(firstNonEmpty);
  return { type: info.type, level: info.level };
}
