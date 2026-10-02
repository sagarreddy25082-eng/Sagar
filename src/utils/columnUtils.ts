import { CellCoord, SelectionRange } from '../types/spreadsheet';

/**
 * Converts a 0-indexed column number to Excel column letters (0 -> A, 25 -> Z, 26 -> AA)
 */
export function colIndexToLetter(index: number): string {
  let temp = index;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Converts Excel column letter to 0-indexed column number (A -> 0, Z -> 25, AA -> 26)
 */
export function letterToColIndex(letters: string): number {
  const upper = letters.toUpperCase();
  let index = 0;
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }
  return index - 1;
}

/**
 * Unique map key for row and col
 */
export function cellKey(row: number, col: number): string {
  return `${row}:${col}`;
}

/**
 * Parse cell key "r:c" back to { row, col }
 */
export function parseCellKey(key: string): CellCoord {
  const [r, c] = key.split(':').map(Number);
  return { row: r, col: c };
}

/**
 * Format coordinates as Excel cell name, e.g. row 0, col 0 -> "A1"
 */
export function coordToName(row: number, col: number): string {
  return `${colIndexToLetter(col)}${row + 1}`;
}

/**
 * Parse cell name like "B12" into { row: 11, col: 1 }
 */
export function nameToCoord(name: string): CellCoord | null {
  const match = name.trim().toUpperCase().match(/^([A-Z]+)([0-9]+)$/);
  if (!match) return null;
  const colLetter = match[1];
  const rowNumber = parseInt(match[2], 10);
  if (isNaN(rowNumber) || rowNumber < 1) return null;
  return {
    row: rowNumber - 1,
    col: letterToColIndex(colLetter),
  };
}

/**
 * Normalize selection range so min/max are sorted regardless of drag direction
 */
export function normalizeRange(range: SelectionRange): {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
} {
  return {
    minRow: Math.min(range.startRow, range.endRow),
    maxRow: Math.max(range.startRow, range.endRow),
    minCol: Math.min(range.startCol, range.endCol),
    maxCol: Math.max(range.startCol, range.endCol),
  };
}
