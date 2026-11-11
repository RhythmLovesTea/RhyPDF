/**
 * @rhypdf/edit-core
 * Task 11.14: Special items: current date formats, symbol catalog, and QR integration.
 */

export type DateFormatPattern = 'iso' | 'us' | 'eu' | 'long' | 'withTime';

export function formatCurrentDate(format: DateFormatPattern = 'iso', date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  switch (format) {
    case 'us':
      return `${month}/${day}/${year}`;
    case 'eu':
      return `${day}/${month}/${year}`;
    case 'long':
      return `${monthNames[date.getMonth()]} ${date.getDate()}, ${year}`;
    case 'withTime':
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    case 'iso':
    default:
      return `${year}-${month}-${day}`;
  }
}

export interface SymbolCategory {
  id: string;
  name: string;
  symbols: string[];
}

export const SYMBOL_CATEGORIES: SymbolCategory[] = [
  {
    id: 'math',
    name: 'Mathematics',
    symbols: ['±', '×', '÷', '≠', '≈', '≤', '≥', '∞', 'π', '√', '∑', 'Δ', '∫', '‰', '½', '¼', '¾', '°']
  },
  {
    id: 'currency',
    name: 'Currency',
    symbols: ['$', '€', '£', '¥', '₹', '₩', '₽', '₿', '¢', '¤']
  },
  {
    id: 'arrows',
    name: 'Arrows',
    symbols: ['←', '→', '↑', '↓', '↔', '↕', '⇒', '⇐', '⇔', '➔', '➜', '➤', '▲', '▼', '◄', '►']
  },
  {
    id: 'typography',
    name: 'Typography',
    symbols: ['©', '®', '™', '§', '¶', '•', '◦', '▪', '—', '–', '†', '‡', '…', '“', '”', '‘', '’', '«', '»']
  },
  {
    id: 'greek',
    name: 'Greek Letters',
    symbols: ['α', 'β', 'γ', 'δ', 'ε', 'θ', 'λ', 'μ', 'π', 'σ', 'τ', 'φ', 'ω', 'Ω', 'Δ', 'Σ', 'Φ', 'Ψ']
  },
  {
    id: 'misc',
    name: 'Symbols & Icons',
    symbols: ['✓', '✗', '★', '☆', '♥', '♦', '♣', '♠', '☕', '⚡', '⚠', '✉', '✂', '🔒', '🔑', '🏷']
  }
];
