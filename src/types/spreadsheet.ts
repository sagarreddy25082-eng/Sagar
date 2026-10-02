export type ThemeId = 'navy-blue-white' | 'black-gold-red';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  isDark: boolean;
  accentColor: string;
  gradientHeader: string;
  gradientBadge: string;
  bgMain: string;
  bgToolbar: string;
  bgHeader: string;
  bgGrid: string;
  bgCellActive: string;
  borderGrid: string;
  borderUi: string;
  textPrimary: string;
  textMuted: string;
  selectionBg: string;
  selectionBorder: string;
  colHeaderColors: string[];
}

export type CellFormat = 'general' | 'currency' | 'percent' | 'number' | 'integer' | 'date';
export type CellAlign = 'left' | 'center' | 'right';

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  align?: CellAlign;
  textColor?: string;
  bgColor?: string;
  fontSize?: number;
  format?: CellFormat;
}

export interface CellData {
  raw: string; // The formula or literal entered by user, e.g. "=SUM(A1:A5)" or "1250"
  computed?: string; // Evaluated display value
  style?: CellStyle;
  isError?: boolean;
}

export interface Sheet {
  id: string;
  name: string;
  tabColor?: string;
  rowCount: number;
  colCount: number;
  rowHeights: Record<number, number>; // row index -> height in px
  colWidths: Record<number, number>; // col index -> width in px
  cells: Record<string, CellData>; // key format: `${row}:${col}`
}

export interface Workbook {
  id: string;
  title: string;
  activeSheetId: string;
  sheets: Sheet[];
  theme: ThemeId;
  updatedAt: string;
}

export interface CellCoord {
  row: number;
  col: number;
}

export interface SelectionRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface ContextMenuState {
  x: number;
  y: number;
  type: 'cell' | 'rowHeader' | 'colHeader';
  targetRow?: number;
  targetCol?: number;
}
