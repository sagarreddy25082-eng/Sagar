import { Sheet } from '../types/spreadsheet';
import { cellKey } from './columnUtils';

export type FilterOperator =
  | 'contains'
  | 'equals'
  | 'startsWith'
  | 'endsWith'
  | 'notContains'
  | 'notEquals'
  | 'greaterThan'
  | 'lessThan'
  | 'isEmpty'
  | 'isNotEmpty';

export interface AutoFilterCriteria {
  col: number; // Column index (0 for Col A, 1 for Col B, etc.)
  operator: FilterOperator;
  text: string;
  ignoreHeaderRow?: boolean; // If true, Row 0 (Row 1 on screen) is preserved as header
  caseSensitive?: boolean;
}

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  contains: 'Contains',
  equals: 'Equals (exact match)',
  startsWith: 'Starts with',
  endsWith: 'Ends with',
  notContains: 'Does not contain',
  notEquals: 'Does not equal',
  greaterThan: 'Greater than (number / text)',
  lessThan: 'Less than (number / text)',
  isEmpty: 'Is empty (blank)',
  isNotEmpty: 'Is not empty (has value)',
};

/**
 * Tests whether a cell value matches the specified operator and criteria
 */
export function testFilterMatch(
  cellValue: string,
  operator: FilterOperator,
  criteriaText: string,
  caseSensitive: boolean = false
): boolean {
  let val = cellValue ?? '';
  let target = criteriaText ?? '';

  if (!caseSensitive) {
    val = val.toLowerCase();
    target = target.toLowerCase();
  }

  switch (operator) {
    case 'contains':
      return val.includes(target);
    case 'notContains':
      return !val.includes(target);
    case 'equals':
      return val === target;
    case 'notEquals':
      return val !== target;
    case 'startsWith':
      return val.startsWith(target);
    case 'endsWith':
      return val.endsWith(target);
    case 'isEmpty':
      return val.trim() === '';
    case 'isNotEmpty':
      return val.trim() !== '';
    case 'greaterThan': {
      const numVal = parseFloat(val);
      const numTarget = parseFloat(target);
      if (!isNaN(numVal) && !isNaN(numTarget)) {
        return numVal > numTarget;
      }
      return val > target;
    }
    case 'lessThan': {
      const numVal = parseFloat(val);
      const numTarget = parseFloat(target);
      if (!isNaN(numVal) && !isNaN(numTarget)) {
        return numVal < numTarget;
      }
      return val < target;
    }
    default:
      return val.includes(target);
  }
}

/**
 * Computes the set of row indices that do NOT match the filter criteria and should be hidden.
 */
export function computeHiddenRowIndices(
  sheet: Sheet,
  filter: AutoFilterCriteria | null
): Set<number> {
  const hidden = new Set<number>();
  if (!filter) return hidden;

  const requiresText = filter.operator !== 'isEmpty' && filter.operator !== 'isNotEmpty';
  if (requiresText && !filter.text.trim()) {
    return hidden;
  }

  const { col, operator, text, ignoreHeaderRow = true, caseSensitive = false } = filter;

  for (let r = 0; r < sheet.rowCount; r++) {
    // If ignoreHeaderRow is true, keep row 0 visible (treated as column headers)
    if (ignoreHeaderRow && r === 0) {
      continue;
    }

    const cell = sheet.cells[cellKey(r, col)];
    const cellValue = cell ? (cell.computed !== undefined ? cell.computed : cell.raw || '') : '';

    const matches = testFilterMatch(cellValue, operator, text, caseSensitive);
    if (!matches) {
      hidden.add(r);
    }
  }

  return hidden;
}
