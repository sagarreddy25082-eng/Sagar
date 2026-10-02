import { Sheet, Workbook } from '../types/spreadsheet';

/**
 * Creates an empty fresh sheet with default rows and default 2 columns (A and B)
 */
export function createEmptySheet(
  id: string,
  name: string,
  rowCount: number = 30,
  colCount: number = 2,
  tabColor?: string
): Sheet {
  return {
    id,
    name,
    tabColor: tabColor || '#2563eb', // Royal sapphire blue tab marker
    rowCount,
    colCount,
    rowHeights: {},
    colWidths: { 0: 220, 1: 220 }, // Generous default widths for 2 columns
    cells: {},
  };
}

/**
 * Creates a default completely blank workbook with title SAGAR, 2 columns, and Navy Blue & White theme
 */
export function createDefaultWorkbook(): Workbook {
  const blankSheet = createEmptySheet('sheet-1', 'Sheet 1', 30, 2, '#2563eb');

  return {
    id: 'wb-' + Date.now(),
    title: 'SAGAR',
    activeSheetId: 'sheet-1',
    sheets: [blankSheet],
    theme: 'navy-blue-white',
    updatedAt: new Date().toISOString(),
  };
}
