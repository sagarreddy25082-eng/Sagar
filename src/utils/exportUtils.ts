import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import XLSX from 'xlsx-js-style';
import { Sheet, Workbook } from '../types/spreadsheet';
import { cellKey, colIndexToLetter } from './columnUtils';

/**
 * Converts any CSS color (hex, rgb, rgba, named) to an RGB tuple.
 * For transparent / semi-transparent colors (like rgba fill tints), blends with white.
 */
export function colorToRGB(colorStr?: string): { r: number; g: number; b: number } | null {
  if (!colorStr || colorStr === 'transparent' || colorStr === 'inherit') return null;
  const str = colorStr.trim().toLowerCase();

  // #rgb or #rrggbb or #rrggbbaa
  if (str.startsWith('#')) {
    let hex = str.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        if (hex.length === 8) {
          const a = parseInt(hex.substring(6, 8), 16) / 255;
          return {
            r: Math.round(r * a + 255 * (1 - a)),
            g: Math.round(g * a + 255 * (1 - a)),
            b: Math.round(b * a + 255 * (1 - a)),
          };
        }
        return { r, g, b };
      }
    }
  }

  // rgba(r, g, b, a) or rgb(r, g, b)
  const rgbaMatch = str.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1], 10);
    const g = parseInt(rgbaMatch[2], 10);
    const b = parseInt(rgbaMatch[3], 10);
    const a = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;
    // Blend with white for accurate solid rendering
    return {
      r: Math.round(r * a + 255 * (1 - a)),
      g: Math.round(g * a + 255 * (1 - a)),
      b: Math.round(b * a + 255 * (1 - a)),
    };
  }

  // Common named colors fallback
  const namedColors: Record<string, [number, number, number]> = {
    red: [239, 68, 68],
    crimson: [220, 38, 38],
    blue: [37, 99, 235],
    navy: [30, 58, 138],
    green: [34, 197, 94],
    emerald: [16, 185, 129],
    amber: [245, 158, 11],
    yellow: [234, 179, 8],
    purple: [147, 51, 234],
    white: [255, 255, 255],
    black: [0, 0, 0],
    gray: [107, 114, 128],
    slate: [100, 116, 139],
  };

  if (namedColors[str]) {
    const [r, g, b] = namedColors[str];
    return { r, g, b };
  }

  return null;
}

/**
 * Converts any CSS color to a 6-digit uppercase hex string for Excel (e.g. "2563EB")
 */
export function colorToExcelHex(colorStr?: string): string | null {
  const rgb = colorToRGB(colorStr);
  if (!rgb) return null;
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0').toUpperCase();
  return `${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Determines whether a color is dark (to ensure white readable text automatically)
 */
export function isColorDark(rgb: { r: number; g: number; b: number }): boolean {
  const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
  return luminance < 135;
}

/**
 * Finds the maximum populated row and column in a sheet to avoid exporting 500 empty rows.
 * Also accounts for colored/styled cells so customized cells are never skipped!
 */
export function getPopulatedBounds(sheet: Sheet): { maxRow: number; maxCol: number } {
  let maxRow = 0;
  let maxCol = 0;
  let hasDataOrStyle = false;

  for (const key of Object.keys(sheet.cells)) {
    const cell = sheet.cells[key];
    const hasRaw = cell && cell.raw !== undefined && cell.raw !== null && cell.raw.trim().length > 0;
    const hasComputed = cell && cell.computed !== undefined && cell.computed !== null && cell.computed.toString().trim().length > 0;
    const hasStyle = cell && cell.style && Boolean(cell.style.bgColor || cell.style.textColor || cell.style.bold);

    if (hasRaw || hasComputed || hasStyle) {
      hasDataOrStyle = true;
      const [r, c] = key.split(':').map(Number);
      if (r > maxRow) maxRow = r;
      if (c > maxCol) maxCol = c;
    }
  }

  if (!hasDataOrStyle) {
    return {
      maxRow: Math.min(sheet.rowCount - 1, 9),
      maxCol: Math.min(sheet.colCount - 1, 1), // Default 2 columns (0 and 1)
    };
  }

  return {
    maxRow: Math.max(maxRow, 0),
    maxCol: Math.max(maxCol, 1), // Ensure at least 2 columns are shown
  };
}

/**
 * Escapes a cell value for CSV format (RFC 4180 standard)
 */
function escapeCSV(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

/**
 * Converts a sheet into a clean, standard CSV string containing only pure cell data
 */
export function sheetToCSVString(sheet: Sheet, includeHeaderLetters: boolean = false): string {
  const { maxRow, maxCol } = getPopulatedBounds(sheet);
  const rows: string[] = [];

  if (includeHeaderLetters) {
    const headerRow: string[] = [''];
    for (let c = 0; c <= Math.max(1, maxCol); c++) {
      headerRow.push(colIndexToLetter(c));
    }
    rows.push(headerRow.map(escapeCSV).join(','));
  }

  for (let r = 0; r <= maxRow; r++) {
    const rowVals: string[] = [];
    if (includeHeaderLetters) {
      rowVals.push((r + 1).toString());
    }
    for (let c = 0; c <= Math.max(1, maxCol); c++) {
      const cell = sheet.cells[cellKey(r, c)];
      const cellVal = cell ? (cell.computed !== undefined && cell.computed !== null ? cell.computed : (cell.raw ?? '')) : '';
      rowVals.push(cellVal);
    }
    rows.push(rowVals.map(escapeCSV).join(','));
  }

  return rows.join('\r\n');
}

/**
 * Downloads a string as a file in the browser
 */
export function triggerFileDownload(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;') {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Assembles all sheets side by side in a single 2D table grid for CSV export
 */
export function buildSideBySideSheetData(workbook: Workbook): string[][] {
  const sheets = workbook.sheets;
  if (!sheets || sheets.length === 0) return [[]];

  const sheetMeta = sheets.map((sheet) => {
    const bounds = getPopulatedBounds(sheet);
    const numCols = Math.max(2, bounds.maxCol + 1);
    return {
      sheet,
      bounds,
      numCols,
    };
  });

  const maxRow = Math.max(...sheetMeta.map((m) => m.bounds.maxRow));
  const resultRows: string[][] = [];

  for (let r = 0; r <= maxRow; r++) {
    const dataRow: string[] = [];
    sheetMeta.forEach((m) => {
      for (let c = 0; c < m.numCols; c++) {
        const cell = m.sheet.cells[cellKey(r, c)];
        dataRow.push(cell ? (cell.computed || cell.raw || '') : '');
      }
    });
    resultRows.push(dataRow);
  }

  return resultRows;
}

/**
 * Exports current sheet to pure standard CSV
 */
export function exportSheetToCSV(sheet: Sheet, workbookTitle?: string) {
  const safeTitle = (workbookTitle || 'Spreadsheet').replace(/[^a-z0-9_-]/gi, '_');
  const safeSheet = sheet.name.replace(/[^a-z0-9_-]/gi, '_');
  const filename = `${safeTitle}_${safeSheet}.csv`;
  const csvContent = sheetToCSVString(sheet);
  triggerFileDownload(csvContent, filename);
}

/**
 * Exports all sheets in workbook side by side into a single CSV file
 */
export function exportAllSheetsSideBySideToCSV(workbook: Workbook) {
  const safeTitle = (workbook.title || 'Spreadsheet').replace(/[^a-z0-9_-]/gi, '_');
  const rows = buildSideBySideSheetData(workbook);
  const csvContent = rows.map((row) => row.map(escapeCSV).join(',')).join('\r\n');
  triggerFileDownload(csvContent, `${safeTitle}_All_Sheets_Side_by_Side.csv`);
}

/**
 * Builds a styled XLSX worksheet preserving ALL cell background colors, text colors,
 * font formatting (bold/italic/underline/strikethrough), alignment, and dimensions!
 */
export function buildStyledXLSXWorksheet(sheet: Sheet): XLSX.WorkSheet {
  const { maxRow, maxCol } = getPopulatedBounds(sheet);
  const ws: XLSX.WorkSheet = {};

  for (let r = 0; r <= maxRow; r++) {
    for (let c = 0; c <= Math.max(1, maxCol); c++) {
      const cell = sheet.cells[cellKey(r, c)];
      const cellAddr = XLSX.utils.encode_cell({ r, c });

      // Determine raw display value
      const displayVal = cell
        ? (cell.computed !== undefined && cell.computed !== null
            ? String(cell.computed)
            : (cell.raw ?? ''))
        : '';

      // Check if value is cleanly numeric
      const isFormula = cell?.raw?.startsWith('=');
      const isNumeric =
        !isFormula &&
        displayVal.trim() !== '' &&
        !isNaN(Number(displayVal.trim())) &&
        !displayVal.includes(',');

      const cellObj: any = {
        v: isNumeric ? Number(displayVal.trim()) : displayVal,
        t: isNumeric ? 'n' : 's',
      };

      if (isFormula && cell?.raw) {
        // Strip leading '=' for Excel formula definition
        cellObj.f = cell.raw.substring(1);
      }

      // Build rich cell style matching what the user sees in the app
      const cellStyle: any = {
        font: {
          name: 'Calibri',
          sz: cell?.style?.fontSize || 11,
          bold: Boolean(cell?.style?.bold),
          italic: Boolean(cell?.style?.italic),
          underline: Boolean(cell?.style?.underline),
          strike: Boolean(cell?.style?.strikethrough),
        },
        alignment: {
          vertical: 'center',
          horizontal: cell?.style?.align || (isNumeric ? 'right' : 'left'),
          wrapText: true,
        },
        border: {
          top: { style: 'thin', color: { rgb: 'D1D5DB' } },
          bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
          left: { style: 'thin', color: { rgb: 'D1D5DB' } },
          right: { style: 'thin', color: { rgb: 'D1D5DB' } },
        },
      };

      // 1. Cell Background Fill Color
      if (cell?.style?.bgColor) {
        const bgHex = colorToExcelHex(cell.style.bgColor);
        if (bgHex) {
          cellStyle.fill = {
            patternType: 'solid',
            fgColor: { rgb: bgHex },
          };

          // If background is dark and user didn't specify text color, automatically use white text
          const bgRgb = colorToRGB(cell.style.bgColor);
          if (bgRgb && isColorDark(bgRgb) && !cell?.style?.textColor) {
            cellStyle.font.color = { rgb: 'FFFFFF' };
          }
        }
      }

      // 2. Cell Text Font Color
      if (cell?.style?.textColor) {
        const textHex = colorToExcelHex(cell.style.textColor);
        if (textHex) {
          cellStyle.font.color = { rgb: textHex };
        }
      }

      // 3. Number Formats
      if (cell?.style?.format) {
        switch (cell.style.format) {
          case 'currency':
            cellStyle.numFmt = '$#,##0.00';
            break;
          case 'percent':
            cellStyle.numFmt = '0.00%';
            break;
          case 'number':
            cellStyle.numFmt = '#,##0.00';
            break;
          case 'integer':
            cellStyle.numFmt = '#,##0';
            break;
          case 'date':
            cellStyle.numFmt = 'yyyy-mm-dd';
            break;
        }
      }

      cellObj.s = cellStyle;
      ws[cellAddr] = cellObj;
    }
  }

  // Set worksheet bounds
  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: maxRow, c: Math.max(1, maxCol) },
  });

  // Apply column widths (translating pixels to Excel character widths)
  const numCols = Math.max(2, maxCol + 1);
  ws['!cols'] = Array.from({ length: numCols }, (_, c) => {
    const px = sheet.colWidths?.[c];
    if (px && px > 40) {
      return { wch: Math.max(12, Math.round(px / 7.5)) };
    }
    return { wch: 18 };
  });

  // Apply row heights (translating pixels to points)
  ws['!rows'] = Array.from({ length: maxRow + 1 }, (_, r) => {
    const px = sheet.rowHeights?.[r];
    if (px && px > 15) {
      return { hpt: Math.round(px * 0.75) };
    }
    return { hpt: 20 };
  });

  // Sheet tab color if set
  if (sheet.tabColor) {
    const tabHex = colorToExcelHex(sheet.tabColor);
    if (tabHex) {
      (ws as any)['!tabColor'] = { rgb: tabHex };
    }
  }

  return ws;
}

/**
 * Exports workbook as a true styled Microsoft Excel (.xlsx) file.
 * ALL cell background colors, text colors, font styles, and separate worksheet tabs
 * are fully preserved in the downloaded Excel file!
 */
export function exportToExcel(
  workbook: Workbook,
  scope: 'all' | 'current' = 'all',
  activeSheet?: Sheet
) {
  const safeTitle = (workbook.title || 'Spreadsheet').replace(/[^a-z0-9_-]/gi, '_');
  const wb = XLSX.utils.book_new();

  if (scope === 'current' && activeSheet) {
    const ws = buildStyledXLSXWorksheet(activeSheet);
    const safeSheet = (activeSheet.name || 'Sheet1')
      .trim()
      .substring(0, 31)
      .replace(/[\\/?*[\]]/g, '_');

    XLSX.utils.book_append_sheet(wb, ws, safeSheet);
    XLSX.writeFile(wb, `${safeTitle}_${safeSheet}.xlsx`);
  } else {
    const sheetNamesUsed = new Set<string>();

    workbook.sheets.forEach((sheet, idx) => {
      const ws = buildStyledXLSXWorksheet(sheet);

      let baseName = (sheet.name || `Sheet${idx + 1}`)
        .trim()
        .substring(0, 31)
        .replace(/[\\/?*[\]]/g, '_');
      if (!baseName) baseName = `Sheet${idx + 1}`;

      let tabName = baseName;
      let counter = 1;
      while (sheetNamesUsed.has(tabName.toLowerCase())) {
        tabName = `${baseName.substring(0, 27)}_${counter}`;
        counter++;
      }
      sheetNamesUsed.add(tabName.toLowerCase());

      XLSX.utils.book_append_sheet(wb, ws, tabName);
    });

    XLSX.writeFile(wb, `${safeTitle}.xlsx`);
  }
}

/**
 * Backward compatibility alias
 */
export function exportAllSheetsToCSV(workbook: Workbook) {
  exportAllSheetsSideBySideToCSV(workbook);
}

/**
 * Parses CSV text into sheet cells and row/col bounds
 */
export function parseCSVToSheet(csvText: string): {
  rowCount: number;
  colCount: number;
  cells: Record<string, { raw: string; computed: string }>;
} {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField);
      lines.push(currentRow);
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    lines.push(currentRow);
  }

  const cells: Record<string, { raw: string; computed: string }> = {};
  let maxCol = 2;
  const rowCount = Math.max(30, lines.length);

  lines.forEach((row, r) => {
    if (row.length > maxCol) maxCol = row.length;
    row.forEach((val, c) => {
      if (val.trim()) {
        cells[cellKey(r, c)] = {
          raw: val.trim(),
          computed: val.trim(),
        };
      }
    });
  });

  return {
    rowCount,
    colCount: maxCol,
    cells,
  };
}

export interface PDFExportOptions {
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'a4' | 'letter';
  includeHeaderDetails?: boolean;
  themeStyle?: 'simple' | 'clean' | 'emerald' | 'dark' | 'navy' | 'paper';
  scope?: 'current' | 'all';
}

/**
 * Exports workbook or active sheet to a clean, styled PDF report.
 * Custom cell background colors and text colors are faithfully preserved in the PDF output!
 */
export function exportToPDF(
  workbook: Workbook,
  activeSheet: Sheet,
  options: PDFExportOptions = {}
) {
  const {
    orientation = 'landscape',
    pageSize = 'a4',
    includeHeaderDetails = true,
    themeStyle = 'simple',
    scope = 'all',
  } = options;

  const doc = new jsPDF({
    orientation,
    unit: 'pt',
    format: pageSize,
  });

  const sheetsToExport = scope === 'all' ? workbook.sheets : [activeSheet];

  // Theme palettes
  const palettes = {
    simple: {
      primary: [15, 23, 42] as [number, number, number],
      secondary: [71, 85, 105] as [number, number, number],
      headerBg: [241, 245, 249] as [number, number, number],
      headerText: [15, 23, 42] as [number, number, number],
      zebra: [248, 250, 252] as [number, number, number],
      border: [203, 213, 225] as [number, number, number],
      textColor: [15, 23, 42] as [number, number, number],
    },
    clean: {
      primary: [30, 41, 59] as [number, number, number],
      secondary: [100, 116, 139] as [number, number, number],
      headerBg: [241, 245, 249] as [number, number, number],
      headerText: [15, 23, 42] as [number, number, number],
      zebra: [248, 250, 252] as [number, number, number],
      border: [226, 232, 240] as [number, number, number],
      textColor: [15, 23, 42] as [number, number, number],
    },
    dark: {
      primary: [15, 23, 42] as [number, number, number],
      secondary: [226, 232, 240] as [number, number, number],
      headerBg: [15, 23, 42] as [number, number, number],
      headerText: [255, 255, 255] as [number, number, number],
      zebra: [248, 250, 252] as [number, number, number],
      border: [203, 213, 225] as [number, number, number],
      textColor: [15, 23, 42] as [number, number, number],
    },
    emerald: {
      primary: [6, 78, 59] as [number, number, number],
      secondary: [5, 150, 105] as [number, number, number],
      headerBg: [6, 78, 59] as [number, number, number],
      headerText: [255, 255, 255] as [number, number, number],
      zebra: [240, 253, 244] as [number, number, number],
      border: [167, 243, 208] as [number, number, number],
      textColor: [15, 23, 42] as [number, number, number],
    },
    navy: {
      primary: [30, 58, 138] as [number, number, number],
      secondary: [59, 130, 246] as [number, number, number],
      headerBg: [30, 58, 138] as [number, number, number],
      headerText: [255, 255, 255] as [number, number, number],
      zebra: [239, 246, 255] as [number, number, number],
      border: [191, 219, 254] as [number, number, number],
      textColor: [15, 23, 42] as [number, number, number],
    },
    paper: {
      primary: [120, 53, 15] as [number, number, number],
      secondary: [180, 83, 9] as [number, number, number],
      headerBg: [120, 53, 15] as [number, number, number],
      headerText: [255, 255, 255] as [number, number, number],
      zebra: [254, 243, 199] as [number, number, number],
      border: [253, 230, 138] as [number, number, number],
      textColor: [69, 26, 3] as [number, number, number],
    },
  };

  const currentTheme = palettes[themeStyle] || palettes.simple;

  sheetsToExport.forEach((sheet, sheetIdx) => {
    if (sheetIdx > 0) {
      doc.addPage();
    }

    const { maxRow, maxCol } = getPopulatedBounds(sheet);

    // Build headers: '#', 'A', 'B'...
    const headRow: string[] = ['#'];
    for (let c = 0; c <= Math.max(1, maxCol); c++) {
      headRow.push(colIndexToLetter(c));
    }

    // Build body rows
    const bodyRows: string[][] = [];
    for (let r = 0; r <= maxRow; r++) {
      const rowData: string[] = [(r + 1).toString()];
      for (let c = 0; c <= Math.max(1, maxCol); c++) {
        const cell = sheet.cells[cellKey(r, c)];
        const cellVal = cell
          ? (cell.computed !== undefined && cell.computed !== null
              ? String(cell.computed)
              : (cell.raw ?? ''))
          : '';
        rowData.push(cellVal);
      }
      bodyRows.push(rowData);
    }

    let startY = 35;

    if (includeHeaderDetails) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(currentTheme.primary[0], currentTheme.primary[1], currentTheme.primary[2]);
      doc.text(workbook.title || 'SAGAR Spreadsheet', 30, 36);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(currentTheme.secondary[0], currentTheme.secondary[1], currentTheme.secondary[2]);
      doc.text(`Sheet: ${sheet.name}   |   Exported: ${new Date().toLocaleDateString()}`, 30, 52);

      startY = 68;
    }

    const totalCols = Math.max(2, maxCol + 1);
    const fontSize = totalCols > 8 ? 8 : totalCols > 5 ? 8.5 : 9.5;
    const cellPadding = totalCols > 6 ? 4 : 5.5;

    autoTable(doc, {
      head: [headRow],
      body: bodyRows,
      startY,
      theme: 'grid',
      showHead: 'everyPage',
      styles: {
        fontSize,
        cellPadding,
        textColor: currentTheme.textColor,
        lineColor: currentTheme.border,
        lineWidth: 0.75,
        valign: 'middle',
        overflow: 'linebreak',
        font: 'helvetica',
      },
      headStyles: {
        fillColor: currentTheme.headerBg,
        textColor: currentTheme.headerText,
        fontStyle: 'bold',
        halign: 'center',
        lineColor: [180, 185, 195],
        lineWidth: 0.75,
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
      },
      alternateRowStyles: {
        fillColor: currentTheme.zebra,
      },
      columnStyles: {
        0: {
          halign: 'center',
          fontStyle: 'bold',
          cellWidth: 32,
          textColor: [107, 114, 128],
          fillColor: [249, 250, 251],
        },
      },
      margin: { left: 30, right: 30, bottom: 35 },
      // Apply cell background colors and text colors added by user
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index > 0) {
          const rowIndex = data.row.index;
          const colIndex = data.column.index - 1; // 0-indexed column in sheet
          const cell = sheet.cells[cellKey(rowIndex, colIndex)];

          if (cell && cell.style) {
            // Apply cell background color
            if (cell.style.bgColor) {
              const bgRgb = colorToRGB(cell.style.bgColor);
              if (bgRgb) {
                data.cell.styles.fillColor = [bgRgb.r, bgRgb.g, bgRgb.b];

                // If dark background and no custom text color, use white text
                if (!cell.style.textColor && isColorDark(bgRgb)) {
                  data.cell.styles.textColor = [255, 255, 255];
                }
              }
            }

            // Apply cell text color
            if (cell.style.textColor) {
              const textRgb = colorToRGB(cell.style.textColor);
              if (textRgb) {
                data.cell.styles.textColor = [textRgb.r, textRgb.g, textRgb.b];
              }
            }

            // Apply font styles (bold / italic)
            if (cell.style.bold && cell.style.italic) {
              data.cell.styles.fontStyle = 'bolditalic';
            } else if (cell.style.bold) {
              data.cell.styles.fontStyle = 'bold';
            } else if (cell.style.italic) {
              data.cell.styles.fontStyle = 'italic';
            }

            // Apply alignment
            if (cell.style.align) {
              data.cell.styles.halign = cell.style.align;
            }
          }
        }
      },
      didDrawPage: () => {
        const pageNum = doc.getNumberOfPages();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        const pageSizeInfo = doc.internal.pageSize;
        const pageHeight = pageSizeInfo.height || pageSizeInfo.getHeight();
        const pageWidth = pageSizeInfo.width || pageSizeInfo.getWidth();
        doc.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
      },
    });
  });

  const safeTitle = (workbook.title || 'Spreadsheet').replace(/[^a-z0-9_-]/gi, '_');
  doc.save(`${safeTitle}.pdf`);
}
