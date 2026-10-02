import { CellData, CellFormat } from '../types/spreadsheet';
import { cellKey, nameToCoord } from './columnUtils';

export interface EvaluationContext {
  cells: Record<string, CellData>;
  visited?: Set<string>;
}

/**
 * Formats a raw or computed value based on the cell's assigned format type
 */
export function formatCellValue(value: string | number, format?: CellFormat): string {
  if (value === '' || value === undefined || value === null) return '';
  if (typeof value === 'string' && value.startsWith('#')) return value; // Error code like #ERROR!

  const num = typeof value === 'number' ? value : parseFloat(value.toString().replace(/[$,%]/g, ''));

  if (isNaN(num)) {
    return value.toString();
  }

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);

    case 'percent':
      return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      }).format(num > 1 && !value.toString().includes('%') ? num / 100 : num);

    case 'number':
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);

    case 'integer':
      return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 0,
      }).format(Math.round(num));

    case 'date':
      try {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          return d.toISOString().split('T')[0];
        }
      } catch {
        // fallback
      }
      return value.toString();

    case 'general':
    default:
      return typeof value === 'number'
        ? Number.isInteger(value)
          ? value.toString()
          : parseFloat(value.toFixed(4)).toString()
        : value.toString();
  }
}

/**
 * Extracts all cell coordinates in a range, e.g. "A1:B3"
 */
function getRangeCoords(rangeStr: string): string[] {
  const parts = rangeStr.split(':');
  if (parts.length !== 2) return [];

  const start = nameToCoord(parts[0]);
  const end = nameToCoord(parts[1]);
  if (!start || !end) return [];

  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);
  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);

  const keys: string[] = [];
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      keys.push(cellKey(r, c));
    }
  }
  return keys;
}

/**
 * Retrieves numeric value from a cell key
 */
function getNumericCellValue(key: string, ctx: EvaluationContext): number {
  const val = evaluateCell(key, ctx);
  if (typeof val === 'number') return val;
  const num = parseFloat(val.toString().replace(/[$,%]/g, ''));
  return isNaN(num) ? 0 : num;
}

/**
 * Retrieves raw string value from a cell key
 */
function getStringCellValue(key: string, ctx: EvaluationContext): string {
  const val = evaluateCell(key, ctx);
  return val !== undefined && val !== null ? val.toString() : '';
}

/**
 * Safely parses arguments for a formula function (supports ranges and expressions)
 */
function parseFunctionArgs(argsStr: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let inQuotes = false;
  let current = '';

  for (let i = 0; i < argsStr.length; i++) {
    const char = argsStr[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === '(' && !inQuotes) {
      depth++;
      current += char;
    } else if (char === ')' && !inQuotes) {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0 && !inQuotes) {
      args.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim().length > 0) {
    args.push(current.trim());
  }
  return args;
}

/**
 * Resolves a list of argument expressions (can be range A1:B5 or single cell or literal number)
 * into an array of numeric values
 */
function collectNumericValues(args: string[], ctx: EvaluationContext): number[] {
  const numbers: number[] = [];

  for (const arg of args) {
    if (arg.includes(':')) {
      const keys = getRangeCoords(arg);
      for (const k of keys) {
        const val = getNumericCellValue(k, ctx);
        numbers.push(val);
      }
    } else {
      const coord = nameToCoord(arg);
      if (coord) {
        numbers.push(getNumericCellValue(cellKey(coord.row, coord.col), ctx));
      } else {
        const parsed = evaluateExpression(arg, ctx);
        const num = typeof parsed === 'number' ? parsed : parseFloat(parsed.toString());
        if (!isNaN(num)) numbers.push(num);
      }
    }
  }

  return numbers;
}

/**
 * Resolves an individual formula function like SUM(...), AVERAGE(...), IF(...)
 */
function evaluateFunction(funcName: string, argsStr: string, ctx: EvaluationContext): string | number {
  const name = funcName.toUpperCase();
  const rawArgs = parseFunctionArgs(argsStr);

  switch (name) {
    case 'SUM': {
      const nums = collectNumericValues(rawArgs, ctx);
      return nums.reduce((acc, curr) => acc + curr, 0);
    }
    case 'AVERAGE':
    case 'AVG': {
      const nums = collectNumericValues(rawArgs, ctx);
      if (nums.length === 0) return 0;
      return nums.reduce((acc, curr) => acc + curr, 0) / nums.length;
    }
    case 'COUNT': {
      const nums = collectNumericValues(rawArgs, ctx);
      return nums.length;
    }
    case 'COUNTA': {
      let count = 0;
      for (const arg of rawArgs) {
        if (arg.includes(':')) {
          for (const k of getRangeCoords(arg)) {
            const v = getStringCellValue(k, ctx);
            if (v.trim().length > 0) count++;
          }
        } else {
          const coord = nameToCoord(arg);
          if (coord) {
            const v = getStringCellValue(cellKey(coord.row, coord.col), ctx);
            if (v.trim().length > 0) count++;
          } else if (arg.trim().length > 0) {
            count++;
          }
        }
      }
      return count;
    }
    case 'MIN': {
      const nums = collectNumericValues(rawArgs, ctx);
      return nums.length > 0 ? Math.min(...nums) : 0;
    }
    case 'MAX': {
      const nums = collectNumericValues(rawArgs, ctx);
      return nums.length > 0 ? Math.max(...nums) : 0;
    }
    case 'PRODUCT': {
      const nums = collectNumericValues(rawArgs, ctx);
      if (nums.length === 0) return 0;
      return nums.reduce((acc, curr) => acc * curr, 1);
    }
    case 'ROUND': {
      if (rawArgs.length === 0) return '#ERROR!';
      const val = typeof evaluateExpression(rawArgs[0], ctx) === 'number'
        ? (evaluateExpression(rawArgs[0], ctx) as number)
        : parseFloat(evaluateExpression(rawArgs[0], ctx).toString());
      const decimals = rawArgs.length > 1 ? parseInt(rawArgs[1], 10) : 0;
      const factor = Math.pow(10, decimals);
      return Math.round(val * factor) / factor;
    }
    case 'ABS': {
      const val = typeof evaluateExpression(rawArgs[0], ctx) === 'number'
        ? (evaluateExpression(rawArgs[0], ctx) as number)
        : parseFloat(evaluateExpression(rawArgs[0], ctx).toString());
      return Math.abs(val);
    }
    case 'SQRT': {
      const val = typeof evaluateExpression(rawArgs[0], ctx) === 'number'
        ? (evaluateExpression(rawArgs[0], ctx) as number)
        : parseFloat(evaluateExpression(rawArgs[0], ctx).toString());
      return val < 0 ? '#NUM!' : Math.sqrt(val);
    }
    case 'POWER': {
      if (rawArgs.length < 2) return '#ERROR!';
      const base = parseFloat(evaluateExpression(rawArgs[0], ctx).toString());
      const exp = parseFloat(evaluateExpression(rawArgs[1], ctx).toString());
      return Math.pow(base, exp);
    }
    case 'IF': {
      if (rawArgs.length < 2) return '#ERROR!';
      const conditionStr = rawArgs[0];
      const trueVal = rawArgs[1];
      const falseVal = rawArgs.length > 2 ? rawArgs[2] : '';

      const condResult = evaluateCondition(conditionStr, ctx);
      const chosen = condResult ? trueVal : falseVal;
      return evaluateExpression(chosen, ctx);
    }
    case 'CONCAT':
    case 'CONCATENATE': {
      let result = '';
      for (const arg of rawArgs) {
        const cleaned = arg.replace(/^"|"$/g, '');
        const coord = nameToCoord(cleaned);
        if (coord) {
          result += getStringCellValue(cellKey(coord.row, coord.col), ctx);
        } else {
          result += evaluateExpression(arg, ctx).toString();
        }
      }
      return result;
    }
    case 'UPPER': {
      const str = rawArgs.length > 0 ? evaluateExpression(rawArgs[0], ctx).toString() : '';
      return str.toUpperCase();
    }
    case 'LOWER': {
      const str = rawArgs.length > 0 ? evaluateExpression(rawArgs[0], ctx).toString() : '';
      return str.toLowerCase();
    }
    case 'TRIM': {
      const str = rawArgs.length > 0 ? evaluateExpression(rawArgs[0], ctx).toString() : '';
      return str.trim();
    }
    case 'LEN': {
      const str = rawArgs.length > 0 ? evaluateExpression(rawArgs[0], ctx).toString() : '';
      return str.length;
    }
    case 'TODAY': {
      return new Date().toISOString().split('T')[0];
    }
    case 'NOW': {
      return new Date().toLocaleTimeString();
    }
    default:
      return `#NAME? (${name})`;
  }
}

/**
 * Evaluates logical comparison in IF formulas (e.g. A1 > 10, B2 = "Done")
 */
function evaluateCondition(expr: string, ctx: EvaluationContext): boolean {
  const operators = ['>=', '<=', '!=', '<>', '=', '>', '<'];
  for (const op of operators) {
    const idx = expr.indexOf(op);
    if (idx !== -1) {
      const leftStr = expr.substring(0, idx).trim();
      const rightStr = expr.substring(idx + op.length).trim();

      const leftVal = evaluateExpression(leftStr, ctx);
      const rightVal = evaluateExpression(rightStr, ctx);

      const numLeft = parseFloat(leftVal.toString());
      const numRight = parseFloat(rightVal.toString());
      const isBothNum = !isNaN(numLeft) && !isNaN(numRight);

      switch (op) {
        case '>':
          return isBothNum ? numLeft > numRight : leftVal > rightVal;
        case '<':
          return isBothNum ? numLeft < numRight : leftVal < rightVal;
        case '>=':
          return isBothNum ? numLeft >= numRight : leftVal >= rightVal;
        case '<=':
          return isBothNum ? numLeft <= numRight : leftVal <= rightVal;
        case '=':
          return isBothNum ? numLeft === numRight : leftVal.toString().toLowerCase() === rightVal.toString().toLowerCase();
        case '!=':
        case '<>':
          return isBothNum ? numLeft !== numRight : leftVal.toString().toLowerCase() !== rightVal.toString().toLowerCase();
      }
    }
  }
  const single = evaluateExpression(expr, ctx);
  return Boolean(single && single !== '0' && single !== 0);
}

/**
 * Evaluates an expression or sub-expression, replacing formulas and cell references
 */
export function evaluateExpression(expr: string, ctx: EvaluationContext): string | number {
  const trimmed = expr.trim();
  if (!trimmed) return '';

  // Quoted string literal
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }

  // Pure number literal
  if (!isNaN(Number(trimmed)) && !trimmed.includes(':')) {
    return Number(trimmed);
  }

  // Check for Function Call: NAME(...)
  const funcMatch = trimmed.match(/^([A-Za-z]+)\((.*)\)$/s);
  if (funcMatch) {
    return evaluateFunction(funcMatch[1], funcMatch[2], ctx);
  }

  // Check for Single Cell Reference: A1, C22
  const singleCoord = nameToCoord(trimmed);
  if (singleCoord) {
    return evaluateCell(cellKey(singleCoord.row, singleCoord.col), ctx);
  }

  // Replace cell references with values for basic arithmetic evaluation (+, -, *, /, %)
  // Find words that look like cell references (e.g. A1, BC23) not preceded by quotes
  let parsedExpr = trimmed.replace(/\b([A-Za-z]+[0-9]+)\b/g, (match) => {
    const coord = nameToCoord(match);
    if (coord) {
      const val = getNumericCellValue(cellKey(coord.row, coord.col), ctx);
      return val.toString();
    }
    return match;
  });

  // Safe arithmetic evaluator
  try {
    // Only allow digits, decimals, basic operators, parens, and spaces
    if (/^[0-9+\-*/().\s%]+$/.test(parsedExpr)) {
      // Handle percentage symbol: e.g. 50% -> (50/100)
      parsedExpr = parsedExpr.replace(/([0-9.]+)%/g, '($1/100)');
      // Evaluate via Function constructor safely (only arithmetic tokens allowed)
      const result = new Function(`return (${parsedExpr});`)();
      if (typeof result === 'number') {
        if (!isFinite(result)) return '#DIV/0!';
        return result;
      }
      return result;
    }
  } catch {
    return '#ERROR!';
  }

  return trimmed;
}

/**
 * Evaluates a single cell key safely with circular reference protection
 */
export function evaluateCell(key: string, ctx: EvaluationContext): string | number {
  if (!ctx.visited) ctx.visited = new Set<string>();

  if (ctx.visited.has(key)) {
    return '#CIRCULAR!';
  }

  const cell = ctx.cells[key];
  if (!cell || !cell.raw) return '';

  const raw = cell.raw.trim();
  if (!raw.startsWith('=')) {
    return raw;
  }

  ctx.visited.add(key);
  try {
    const expression = raw.substring(1);
    const result = evaluateExpression(expression, ctx);
    return result;
  } catch {
    return '#ERROR!';
  } finally {
    ctx.visited.delete(key);
  }
}

/**
 * Recalculates all cells in a sheet and returns the updated cells map
 */
export function computeAllCells(cells: Record<string, CellData>): Record<string, CellData> {
  const result: Record<string, CellData> = {};
  const ctx: EvaluationContext = { cells, visited: new Set() };

  for (const key of Object.keys(cells)) {
    const cell = cells[key];
    if (!cell) continue;

    if (cell.raw && cell.raw.trim().startsWith('=')) {
      const computed = evaluateCell(key, ctx);
      const isError = typeof computed === 'string' && computed.startsWith('#');
      result[key] = {
        ...cell,
        computed: computed.toString(),
        isError,
      };
    } else {
      result[key] = {
        ...cell,
        computed: cell.raw,
        isError: false,
      };
    }
  }

  return result;
}
