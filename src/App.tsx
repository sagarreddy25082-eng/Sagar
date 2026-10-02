/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { 
  CellCoord, 
  CellData, 
  CellStyle, 
  SelectionRange, 
  Sheet, 
  Workbook, 
  ThemeId 
} from './types/spreadsheet';
import { 
  cellKey, 
  normalizeRange, 
  parseCellKey,
  colIndexToLetter
} from './utils/columnUtils';
import { computeAllCells } from './utils/formulaEngine';
import { exportToExcel, exportToPDF } from './utils/exportUtils';
import { createDefaultWorkbook, createEmptySheet } from './utils/sampleWorkbooks';

import { TopHeader } from './components/TopHeader';
import { Toolbar } from './components/Toolbar';
import { FormulaBar } from './components/FormulaBar';
import { Grid } from './components/Grid';
import { SheetTabs } from './components/SheetTabs';
import { ExportModal } from './components/ExportModal';
import { ImportModal } from './components/ImportModal';
import { ChartModal } from './components/ChartModal';
import { FindReplaceModal } from './components/FindReplaceModal';
import { AutoFilterPopover } from './components/AutoFilterPopover';
import { AutoFilterCriteria, computeHiddenRowIndices } from './utils/filterUtils';

const STORAGE_KEY = 'sagar_spreadsheet_navy_v1';

export default function App() {
  // Initialize completely blank workbook with title SAGAR, 2 columns, and Navy Blue & White theme
  const [workbook, setWorkbook] = useState<Workbook>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.sheets && parsed.sheets.length > 0) {
          return {
            ...parsed,
            title: 'SAGAR',
            theme: 'navy-blue-white',
          };
        }
      }
    } catch {
      // Fallback
    }
    return createDefaultWorkbook();
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Active Sheet
  const activeSheetIndex = Math.max(
    0,
    workbook.sheets.findIndex((s) => s.id === workbook.activeSheetId)
  );
  const activeSheet: Sheet = workbook.sheets[activeSheetIndex] || workbook.sheets[0];

  // Grid Selection State
  const [activeCoord, setActiveCoord] = useState<CellCoord>({ row: 0, col: 0 });
  const [selection, setSelection] = useState<SelectionRange>({
    startRow: 0,
    startCol: 0,
    endRow: 0,
    endCol: 0,
  });

  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  // Undo / Redo History Stack
  const [history, setHistory] = useState<Sheet[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Clipboard Reference
  const clipboardRef = useRef<{
    range: SelectionRange;
    cells: Record<string, CellData>;
    isCut?: boolean;
  } | null>(null);

  // Modals state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterTargetCol, setFilterTargetCol] = useState(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Auto-Filter state per sheet
  const [filters, setFilters] = useState<Record<string, AutoFilterCriteria | null>>({});

  const activeFilter = filters[activeSheet.id] || null;

  const hiddenRowIndices = useMemo(() => {
    return computeHiddenRowIndices(activeSheet, activeFilter);
  }, [activeSheet, activeFilter]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((cur) => (cur === msg ? null : cur));
    }, 2000);
  }, []);

  const handleOpenFilter = useCallback((targetCol?: number) => {
    setFilterTargetCol(targetCol !== undefined ? targetCol : activeCoord.col);
    setIsFilterModalOpen(true);
  }, [activeCoord.col]);

  const handleApplyFilter = useCallback((criteria: AutoFilterCriteria) => {
    setFilters((prev) => ({
      ...prev,
      [activeSheet.id]: criteria,
    }));
    showToast(`Filter applied to Column ${colIndexToLetter(criteria.col)}`);
  }, [activeSheet.id, showToast]);

  const handleClearFilter = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      [activeSheet.id]: null,
    }));
    showToast('Auto-Filter cleared');
  }, [activeSheet.id, showToast]);

  // Push snapshot to undo stack
  const pushHistory = useCallback((currentSheets: Sheet[]) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, JSON.parse(JSON.stringify(currentSheets))].slice(-30);
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
  }, [historyIndex]);

  // Autosave to localStorage
  useEffect(() => {
    try {
      setHasUnsavedChanges(true);
      const timer = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(workbook));
        setHasUnsavedChanges(false);
      }, 400);
      return () => clearTimeout(timer);
    } catch (e) {
      console.warn('Autosave error', e);
    }
  }, [workbook]);

  // Synchronize editValue with active cell ONLY when not actively typing/editing
  useEffect(() => {
    if (!isEditing) {
      const key = cellKey(activeCoord.row, activeCoord.col);
      const cell = activeSheet?.cells ? activeSheet.cells[key] : undefined;
      setEditValue(cell?.raw ?? '');
    }
  }, [activeCoord.row, activeCoord.col, activeSheet?.cells, isEditing]);

  // Update a single sheet in the workbook
  const updateActiveSheet = useCallback((patch: Partial<Sheet>, recordHistory = true) => {
    setWorkbook((prev) => {
      const newSheets = prev.sheets.map((s) => {
        if (s.id === prev.activeSheetId) {
          const updatedSheet = { ...s, ...patch };
          if (patch.cells) {
            updatedSheet.cells = computeAllCells(patch.cells);
          }
          return updatedSheet;
        }
        return s;
      });

      if (recordHistory) {
        pushHistory(prev.sheets);
      }

      return {
        ...prev,
        sheets: newSheets,
        updatedAt: new Date().toISOString(),
      };
    });
  }, [pushHistory]);

  const handleCommitEdit = useCallback((moveDirection: 'down' | 'right' | 'none' = 'none', overrideVal?: string) => {
    const valToSave = overrideVal !== undefined ? overrideVal : editValue;
    const key = cellKey(activeCoord.row, activeCoord.col);
    const existing = activeSheet.cells[key] || { raw: '' };

    const updatedCells = {
      ...activeSheet.cells,
      [key]: {
        ...existing,
        raw: valToSave,
        computed: valToSave,
      },
    };

    updateActiveSheet({ cells: updatedCells }, true);
    setIsEditing(false);

    if (moveDirection === 'down' && activeCoord.row < activeSheet.rowCount - 1) {
      const nextR = activeCoord.row + 1;
      setActiveCoord({ row: nextR, col: activeCoord.col });
      setSelection({ startRow: nextR, startCol: activeCoord.col, endRow: nextR, endCol: activeCoord.col });
    } else if (moveDirection === 'right' && activeCoord.col < activeSheet.colCount - 1) {
      const nextC = activeCoord.col + 1;
      setActiveCoord({ row: activeCoord.row, col: nextC });
      setSelection({ startRow: activeCoord.row, startCol: nextC, endRow: activeCoord.row, endCol: nextC });
    }
  }, [activeCoord, activeSheet.cells, activeSheet.rowCount, activeSheet.colCount, editValue, updateActiveSheet]);

  // Cell Selection Handlers
  const handleSelectCell = useCallback((coord: CellCoord) => {
    if (isEditing) {
      handleCommitEdit('none');
    }
    setActiveCoord(coord);
    setSelection({
      startRow: coord.row,
      startCol: coord.col,
      endRow: coord.row,
      endCol: coord.col,
    });
  }, [isEditing, handleCommitEdit]);

  const handleSetSelection = useCallback((range: SelectionRange) => {
    setSelection(range);
  }, []);

  // Editing Handlers
  const handleStartEditing = useCallback((coord: CellCoord, initialVal?: string) => {
    setActiveCoord(coord);
    const key = cellKey(coord.row, coord.col);
    const cell = activeSheet.cells[key];
    setEditValue(initialVal !== undefined ? initialVal : (cell?.raw ?? ''));
    setIsEditing(true);
  }, [activeSheet.cells]);

  const handleCancelEdit = useCallback(() => {
    const key = cellKey(activeCoord.row, activeCoord.col);
    const cell = activeSheet.cells[key];
    setEditValue(cell?.raw || '');
    setIsEditing(false);
  }, [activeCoord, activeSheet.cells]);

  // Formatting Style Handler
  const handleApplyStyle = useCallback((stylePatch: Partial<CellStyle>) => {
    const norm = normalizeRange(selection);
    const newCells = { ...activeSheet.cells };

    for (let r = norm.minRow; r <= norm.maxRow; r++) {
      for (let c = norm.minCol; c <= norm.maxCol; c++) {
        const key = cellKey(r, c);
        const cell = newCells[key] || { raw: '' };
        newCells[key] = {
          ...cell,
          style: {
            ...(cell.style || {}),
            ...stylePatch,
          },
        };
      }
    }

    updateActiveSheet({ cells: newCells }, true);
  }, [selection, activeSheet.cells, updateActiveSheet]);

  // Row / Column Operations
  const handleInsertRow = useCallback((direction: 'above' | 'below') => {
    const targetRow = direction === 'above' ? activeCoord.row : activeCoord.row + 1;
    const newCells: Record<string, CellData> = {};

    for (const key of Object.keys(activeSheet.cells)) {
      const [r, c] = key.split(':').map(Number);
      if (r >= targetRow) {
        newCells[cellKey(r + 1, c)] = activeSheet.cells[key];
      } else {
        newCells[key] = activeSheet.cells[key];
      }
    }

    updateActiveSheet({
      rowCount: activeSheet.rowCount + 1,
      cells: newCells,
    }, true);
  }, [activeCoord.row, activeSheet, updateActiveSheet]);

  const handleDeleteRow = useCallback((targetRowIndex?: number) => {
    if (activeSheet.rowCount <= 1) return;
    const targetRow = targetRowIndex !== undefined ? targetRowIndex : activeCoord.row;
    const newCells: Record<string, CellData> = {};

    for (const key of Object.keys(activeSheet.cells)) {
      const [r, c] = key.split(':').map(Number);
      if (r === targetRow) continue;
      if (r > targetRow) {
        newCells[cellKey(r - 1, c)] = activeSheet.cells[key];
      } else {
        newCells[key] = activeSheet.cells[key];
      }
    }

    updateActiveSheet({
      rowCount: activeSheet.rowCount - 1,
      cells: newCells,
    }, true);
  }, [activeCoord.row, activeSheet, updateActiveSheet]);

  const handleInsertCol = useCallback((direction: 'left' | 'right') => {
    const targetCol = direction === 'left' ? activeCoord.col : activeCoord.col + 1;
    const newCells: Record<string, CellData> = {};

    for (const key of Object.keys(activeSheet.cells)) {
      const [r, c] = key.split(':').map(Number);
      if (c >= targetCol) {
        newCells[cellKey(r, c + 1)] = activeSheet.cells[key];
      } else {
        newCells[key] = activeSheet.cells[key];
      }
    }

    updateActiveSheet({
      colCount: activeSheet.colCount + 1,
      cells: newCells,
    }, true);
  }, [activeCoord.col, activeSheet, updateActiveSheet]);

  const handleDeleteCol = useCallback((targetColIndex?: number) => {
    if (activeSheet.colCount <= 1) return;
    const targetCol = targetColIndex !== undefined ? targetColIndex : activeCoord.col;
    const newCells: Record<string, CellData> = {};

    for (const key of Object.keys(activeSheet.cells)) {
      const [r, c] = key.split(':').map(Number);
      if (c === targetCol) continue;
      if (c > targetCol) {
        newCells[cellKey(r, c - 1)] = activeSheet.cells[key];
      } else {
        newCells[key] = activeSheet.cells[key];
      }
    }

    updateActiveSheet({
      colCount: activeSheet.colCount - 1,
      cells: newCells,
    }, true);
  }, [activeCoord.col, activeSheet, updateActiveSheet]);

  const handleAddRows = useCallback((count: number) => {
    updateActiveSheet({
      rowCount: activeSheet.rowCount + count,
    }, true);
  }, [activeSheet.rowCount, updateActiveSheet]);

  const handleAddCols = useCallback((count: number) => {
    updateActiveSheet({
      colCount: activeSheet.colCount + count,
    }, true);
  }, [activeSheet.colCount, updateActiveSheet]);

  // Copy, Duplicate & Move Operations for Rows
  const handleCopyRow = useCallback((targetRowIndex?: number) => {
    const targetRow = targetRowIndex !== undefined ? targetRowIndex : activeCoord.row;
    const cellsToCopy: Record<string, CellData> = {};
    for (let c = 0; c < activeSheet.colCount; c++) {
      const k = cellKey(targetRow, c);
      if (activeSheet.cells[k]) {
        cellsToCopy[cellKey(0, c)] = { ...activeSheet.cells[k] };
      }
    }
    clipboardRef.current = {
      range: { startRow: targetRow, startCol: 0, endRow: targetRow, endCol: activeSheet.colCount - 1 },
      cells: cellsToCopy,
      isCut: false,
    };
  }, [activeCoord.row, activeSheet.colCount, activeSheet.cells]);

  const handleDuplicateRow = useCallback((targetRowIndex?: number) => {
    const targetRow = targetRowIndex !== undefined ? targetRowIndex : activeCoord.row;
    const newCells: Record<string, CellData> = {};

    for (const key of Object.keys(activeSheet.cells)) {
      const [r, c] = key.split(':').map(Number);
      if (r > targetRow) {
        newCells[cellKey(r + 1, c)] = activeSheet.cells[key];
      } else {
        newCells[key] = activeSheet.cells[key];
      }
    }

    for (let c = 0; c < activeSheet.colCount; c++) {
      const srcKey = cellKey(targetRow, c);
      if (activeSheet.cells[srcKey]) {
        newCells[cellKey(targetRow + 1, c)] = JSON.parse(JSON.stringify(activeSheet.cells[srcKey]));
      }
    }

    const newRowHeights = { ...activeSheet.rowHeights };
    if (newRowHeights[targetRow]) {
      newRowHeights[targetRow + 1] = newRowHeights[targetRow];
    }

    updateActiveSheet({
      rowCount: activeSheet.rowCount + 1,
      cells: newCells,
      rowHeights: newRowHeights,
    }, true);

    const nextR = targetRow + 1;
    setActiveCoord({ row: nextR, col: activeCoord.col });
    setSelection({ startRow: nextR, startCol: 0, endRow: nextR, endCol: activeSheet.colCount - 1 });
  }, [activeCoord.row, activeCoord.col, activeSheet, updateActiveSheet]);

  const handleMoveRow = useCallback((direction: 'up' | 'down', targetRowIndex?: number) => {
    const targetRow = targetRowIndex !== undefined ? targetRowIndex : activeCoord.row;
    if (direction === 'up' && targetRow <= 0) return;
    if (direction === 'down' && targetRow >= activeSheet.rowCount - 1) return;

    const swapRow = direction === 'up' ? targetRow - 1 : targetRow + 1;
    const newCells: Record<string, CellData> = {};

    for (const key of Object.keys(activeSheet.cells)) {
      const [r, c] = key.split(':').map(Number);
      if (r === targetRow) {
        newCells[cellKey(swapRow, c)] = activeSheet.cells[key];
      } else if (r === swapRow) {
        newCells[cellKey(targetRow, c)] = activeSheet.cells[key];
      } else {
        newCells[key] = activeSheet.cells[key];
      }
    }

    const newRowHeights = { ...activeSheet.rowHeights };
    const h1 = newRowHeights[targetRow];
    const h2 = newRowHeights[swapRow];
    if (h1 !== undefined) newRowHeights[swapRow] = h1; else delete newRowHeights[swapRow];
    if (h2 !== undefined) newRowHeights[targetRow] = h2; else delete newRowHeights[targetRow];

    updateActiveSheet({
      cells: newCells,
      rowHeights: newRowHeights,
    }, true);

    setActiveCoord({ row: swapRow, col: activeCoord.col });
    setSelection({ startRow: swapRow, startCol: 0, endRow: swapRow, endCol: activeSheet.colCount - 1 });
  }, [activeCoord.row, activeCoord.col, activeSheet, updateActiveSheet]);

  // Copy, Duplicate & Move Operations for Columns
  const handleCopyCol = useCallback((targetColIndex?: number) => {
    const targetCol = targetColIndex !== undefined ? targetColIndex : activeCoord.col;
    const cellsToCopy: Record<string, CellData> = {};
    for (let r = 0; r < activeSheet.rowCount; r++) {
      const k = cellKey(r, targetCol);
      if (activeSheet.cells[k]) {
        cellsToCopy[cellKey(r, 0)] = { ...activeSheet.cells[k] };
      }
    }
    clipboardRef.current = {
      range: { startRow: 0, startCol: targetCol, endRow: activeSheet.rowCount - 1, endCol: targetCol },
      cells: cellsToCopy,
      isCut: false,
    };
  }, [activeCoord.col, activeSheet.rowCount, activeSheet.cells]);

  const handleDuplicateCol = useCallback((targetColIndex?: number) => {
    const targetCol = targetColIndex !== undefined ? targetColIndex : activeCoord.col;
    const newCells: Record<string, CellData> = {};

    for (const key of Object.keys(activeSheet.cells)) {
      const [r, c] = key.split(':').map(Number);
      if (c > targetCol) {
        newCells[cellKey(r, c + 1)] = activeSheet.cells[key];
      } else {
        newCells[key] = activeSheet.cells[key];
      }
    }

    for (let r = 0; r < activeSheet.rowCount; r++) {
      const srcKey = cellKey(r, targetCol);
      if (activeSheet.cells[srcKey]) {
        newCells[cellKey(r, targetCol + 1)] = JSON.parse(JSON.stringify(activeSheet.cells[srcKey]));
      }
    }

    const newColWidths = { ...activeSheet.colWidths };
    if (newColWidths[targetCol]) {
      newColWidths[targetCol + 1] = newColWidths[targetCol];
    }

    updateActiveSheet({
      colCount: activeSheet.colCount + 1,
      cells: newCells,
      colWidths: newColWidths,
    }, true);

    const nextC = targetCol + 1;
    setActiveCoord({ row: activeCoord.row, col: nextC });
    setSelection({ startRow: 0, startCol: nextC, endRow: activeSheet.rowCount - 1, endCol: nextC });
  }, [activeCoord.row, activeCoord.col, activeSheet, updateActiveSheet]);

  const handleMoveCol = useCallback((direction: 'left' | 'right', targetColIndex?: number) => {
    const targetCol = targetColIndex !== undefined ? targetColIndex : activeCoord.col;
    if (direction === 'left' && targetCol <= 0) return;
    if (direction === 'right' && targetCol >= activeSheet.colCount - 1) return;

    const swapCol = direction === 'left' ? targetCol - 1 : targetCol + 1;
    const newCells: Record<string, CellData> = {};

    for (const key of Object.keys(activeSheet.cells)) {
      const [r, c] = key.split(':').map(Number);
      if (c === targetCol) {
        newCells[cellKey(r, swapCol)] = activeSheet.cells[key];
      } else if (c === swapCol) {
        newCells[cellKey(r, targetCol)] = activeSheet.cells[key];
      } else {
        newCells[key] = activeSheet.cells[key];
      }
    }

    const newColWidths = { ...activeSheet.colWidths };
    const w1 = newColWidths[targetCol];
    const w2 = newColWidths[swapCol];
    if (w1 !== undefined) newColWidths[swapCol] = w1; else delete newColWidths[swapCol];
    if (w2 !== undefined) newColWidths[targetCol] = w2; else delete newColWidths[targetCol];

    updateActiveSheet({
      cells: newCells,
      colWidths: newColWidths,
    }, true);

    setActiveCoord({ row: activeCoord.row, col: swapCol });
    setSelection({ startRow: 0, startCol: swapCol, endRow: activeSheet.rowCount - 1, endCol: swapCol });
  }, [activeCoord.row, activeCoord.col, activeSheet, updateActiveSheet]);

  const handleResizeCol = useCallback((colIndex: number, newWidth: number) => {
    updateActiveSheet({
      colWidths: {
        ...activeSheet.colWidths,
        [colIndex]: newWidth,
      },
    }, false);
  }, [activeSheet.colWidths, updateActiveSheet]);

  const handleResizeRow = useCallback((rowIndex: number, newHeight: number) => {
    updateActiveSheet({
      rowHeights: {
        ...activeSheet.rowHeights,
        [rowIndex]: newHeight,
      },
    }, false);
  }, [activeSheet.rowHeights, updateActiveSheet]);

  const handleClearCells = useCallback(() => {
    const norm = normalizeRange(selection);
    const newCells = { ...activeSheet.cells };

    for (let r = norm.minRow; r <= norm.maxRow; r++) {
      for (let c = norm.minCol; c <= norm.maxCol; c++) {
        delete newCells[cellKey(r, c)];
      }
    }

    updateActiveSheet({ cells: newCells }, true);
    setEditValue('');
  }, [selection, activeSheet.cells, updateActiveSheet]);

  // System & Internal Clipboard Handlers
  const handleCopy = useCallback(async () => {
    const norm = normalizeRange(selection);
    const cellsToCopy: Record<string, CellData> = {};
    const tsvRows: string[] = [];
    let count = 0;

    for (let r = norm.minRow; r <= norm.maxRow; r++) {
      const rowVals: string[] = [];
      for (let c = norm.minCol; c <= norm.maxCol; c++) {
        const k = cellKey(r, c);
        const cell = activeSheet.cells[k];
        const val = cell ? (cell.raw ?? '') : '';
        rowVals.push(val);
        if (cell) {
          cellsToCopy[cellKey(r - norm.minRow, c - norm.minCol)] = { ...cell };
        }
        count++;
      }
      tsvRows.push(rowVals.join('\t'));
    }

    const tsvText = tsvRows.join('\r\n');

    clipboardRef.current = {
      range: selection,
      cells: cellsToCopy,
      isCut: false,
    };

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(tsvText);
      }
    } catch {
      // Fallback using invisible textarea
      const ta = document.createElement('textarea');
      ta.value = tsvText;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {}
      document.body.removeChild(ta);
    }

    showToast(`Copied ${count > 1 ? `${count} cells` : 'cell'} (Ctrl+C)`);
  }, [selection, activeSheet.cells, showToast]);

  const handleCut = useCallback(async () => {
    await handleCopy();
    if (clipboardRef.current) {
      clipboardRef.current.isCut = true;
    }
    handleClearCells();
    showToast('Cut to clipboard (Ctrl+X)');
  }, [handleCopy, handleClearCells, showToast]);

  const handlePaste = useCallback(async (pastedText?: string) => {
    let clipboardText = pastedText || '';
    if (!clipboardText) {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          clipboardText = await navigator.clipboard.readText();
        }
      } catch {
        // Fallback to internal
      }
    }

    if (clipboardText && clipboardText.length > 0) {
      const cleanText = clipboardText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = cleanText.split('\n');
      if (lines.length > 1 && lines[lines.length - 1] === '') {
        lines.pop();
      }

      const newCells = { ...activeSheet.cells };
      let maxPasteR = activeCoord.row;
      let maxPasteC = activeCoord.col;

      lines.forEach((line, dr) => {
        const cols = line.includes('\t')
          ? line.split('\t')
          : (line.includes(',') && !line.includes('\t') ? line.split(',') : [line]);

        cols.forEach((val, dc) => {
          const targetR = activeCoord.row + dr;
          const targetC = activeCoord.col + dc;
          if (targetR > maxPasteR) maxPasteR = targetR;
          if (targetC > maxPasteC) maxPasteC = targetC;

          const key = cellKey(targetR, targetC);
          const existing = newCells[key] || {};
          newCells[key] = {
            ...existing,
            raw: val,
            computed: val,
          };
        });
      });

      const neededRows = Math.max(activeSheet.rowCount, maxPasteR + 1);
      const neededCols = Math.max(activeSheet.colCount, maxPasteC + 1);

      updateActiveSheet({
        rowCount: neededRows,
        colCount: neededCols,
        cells: newCells,
      }, true);

      setSelection({
        startRow: activeCoord.row,
        startCol: activeCoord.col,
        endRow: maxPasteR,
        endCol: maxPasteC,
      });

      showToast('Pasted into spreadsheet (Ctrl+V)');
      return;
    }

    // Fallback to internal spreadsheet clipboard
    if (clipboardRef.current) {
      const { cells: copiedCells } = clipboardRef.current;
      const newCells = { ...activeSheet.cells };
      let maxPasteR = activeCoord.row;
      let maxPasteC = activeCoord.col;

      for (const offsetKey of Object.keys(copiedCells)) {
        const [dr, dc] = offsetKey.split(':').map(Number);
        const targetR = activeCoord.row + dr;
        const targetC = activeCoord.col + dc;
        if (targetR > maxPasteR) maxPasteR = targetR;
        if (targetC > maxPasteC) maxPasteC = targetC;

        const cellToPaste = copiedCells[offsetKey];
        newCells[cellKey(targetR, targetC)] = { ...cellToPaste };
      }

      const neededRows = Math.max(activeSheet.rowCount, maxPasteR + 1);
      const neededCols = Math.max(activeSheet.colCount, maxPasteC + 1);

      updateActiveSheet({
        rowCount: neededRows,
        colCount: neededCols,
        cells: newCells,
      }, true);

      setSelection({
        startRow: activeCoord.row,
        startCol: activeCoord.col,
        endRow: maxPasteR,
        endCol: maxPasteC,
      });

      showToast('Pasted into spreadsheet (Ctrl+V)');
    }
  }, [activeCoord, activeSheet, updateActiveSheet, showToast]);

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (historyIndex >= 0 && history[historyIndex]) {
      const prevSheets = history[historyIndex];
      setWorkbook((prev) => ({
        ...prev,
        sheets: prevSheets,
      }));
      setHistoryIndex((idx) => idx - 1);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1 && history[historyIndex + 1]) {
      const nextSheets = history[historyIndex + 1];
      setWorkbook((prev) => ({
        ...prev,
        sheets: nextSheets,
      }));
      setHistoryIndex((idx) => idx + 1);
    }
  }, [history, historyIndex]);

  const handleContextMenuAction = useCallback((action: string, target?: { row?: number; col?: number }) => {
    switch (action) {
      case 'cut':
        handleCut();
        break;
      case 'copy':
        handleCopy();
        break;
      case 'paste':
        handlePaste();
        break;
      case 'clear':
        handleClearCells();
        break;
      case 'insertRowAbove':
        handleInsertRow('above');
        break;
      case 'insertRowBelow':
        handleInsertRow('below');
        break;
      case 'deleteRow':
        handleDeleteRow(target?.row);
        break;
      case 'insertColLeft':
        handleInsertCol('left');
        break;
      case 'insertColRight':
        handleInsertCol('right');
        break;
      case 'deleteCol':
        handleDeleteCol(target?.col);
        break;
      case 'copyRow':
        handleCopyRow(target?.row);
        break;
      case 'duplicateRow':
        handleDuplicateRow(target?.row);
        break;
      case 'moveRowUp':
        handleMoveRow('up', target?.row);
        break;
      case 'moveRowDown':
        handleMoveRow('down', target?.row);
        break;
      case 'copyCol':
        handleCopyCol(target?.col);
        break;
      case 'duplicateCol':
        handleDuplicateCol(target?.col);
        break;
      case 'moveColLeft':
        handleMoveCol('left', target?.col);
        break;
      case 'moveColRight':
        handleMoveCol('right', target?.col);
        break;
    }
  }, [
    handleCut, 
    handleCopy, 
    handlePaste, 
    handleClearCells, 
    handleInsertRow, 
    handleDeleteRow, 
    handleInsertCol, 
    handleDeleteCol,
    handleCopyRow,
    handleDuplicateRow,
    handleMoveRow,
    handleCopyCol,
    handleDuplicateCol,
    handleMoveCol,
  ]);

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isModalOrSearch = activeEl?.closest('.modal, [role="dialog"], #find-replace, input[type="search"]');
      if (isModalOrSearch) return;

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Find (Ctrl+F)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsFindReplaceOpen(true);
        return;
      }

      // Select All (Ctrl+A)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a' && !isEditing) {
        e.preventDefault();
        setSelection({
          startRow: 0,
          startCol: 0,
          endRow: activeSheet.rowCount - 1,
          endCol: activeSheet.colCount - 1,
        });
        showToast('Selected all cells (Ctrl+A)');
        return;
      }

      // Copy (Ctrl+C)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (!isEditing) {
          e.preventDefault();
          handleCopy();
          return;
        }
      }

      // Paste (Ctrl+V)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (!isEditing) {
          e.preventDefault();
          handlePaste();
          return;
        }
      }

      // Cut (Ctrl+X)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        if (!isEditing) {
          e.preventDefault();
          handleCut();
          return;
        }
      }

      // Bold (Ctrl+B)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        const cur = activeSheet.cells[cellKey(activeCoord.row, activeCoord.col)]?.style?.bold;
        handleApplyStyle({ bold: !cur });
        showToast(cur ? 'Bold off' : 'Bold on (Ctrl+B)');
        return;
      }
      // Italic (Ctrl+I)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        const cur = activeSheet.cells[cellKey(activeCoord.row, activeCoord.col)]?.style?.italic;
        handleApplyStyle({ italic: !cur });
        showToast(cur ? 'Italic off' : 'Italic on (Ctrl+I)');
        return;
      }
      // Underline (Ctrl+U)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        const cur = activeSheet.cells[cellKey(activeCoord.row, activeCoord.col)]?.style?.underline;
        handleApplyStyle({ underline: !cur });
        showToast(cur ? 'Underline off' : 'Underline on (Ctrl+U)');
        return;
      }

      if (isEditing) {
        if (e.key === 'Tab') {
          e.preventDefault();
          handleCommitEdit('right');
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleCancelEdit();
        }
        return;
      }

      // Clear (Delete / Backspace)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleClearCells();
        showToast('Cleared cell(s)');
        return;
      }

      // F2 to start editing
      if (e.key === 'F2') {
        e.preventDefault();
        handleStartEditing(activeCoord);
        return;
      }

      // Enter to move down (or shift+enter up)
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          const nextR = Math.max(0, activeCoord.row - 1);
          handleSelectCell({ row: nextR, col: activeCoord.col });
        } else {
          const nextR = Math.min(activeSheet.rowCount - 1, activeCoord.row + 1);
          handleSelectCell({ row: nextR, col: activeCoord.col });
        }
        return;
      }

      // Tab to move right (or shift+tab left)
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          const nextC = Math.max(0, activeCoord.col - 1);
          handleSelectCell({ row: activeCoord.row, col: nextC });
        } else {
          const nextC = Math.min(activeSheet.colCount - 1, activeCoord.col + 1);
          handleSelectCell({ row: activeCoord.row, col: nextC });
        }
        return;
      }

      // Start typing directly when cell is selected
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        handleStartEditing(activeCoord, e.key);
        return;
      }

      // Arrow navigation
      let nextR = activeCoord.row;
      let nextC = activeCoord.col;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          nextR = Math.max(0, activeCoord.row - 1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          nextR = Math.min(activeSheet.rowCount - 1, activeCoord.row + 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          nextC = Math.max(0, activeCoord.col - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextC = Math.min(activeSheet.colCount - 1, activeCoord.col + 1);
          break;
        default:
          return;
      }

      if (e.shiftKey) {
        setSelection((prev) => ({
          ...prev,
          endRow: nextR,
          endCol: nextC,
        }));
      } else {
        handleSelectCell({ row: nextR, col: nextC });
      }
    };

    const handleWindowCopy = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';
      if (!isInput && !isEditing) {
        e.preventDefault();
        handleCopy();
      }
    };

    const handleWindowCut = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';
      if (!isInput && !isEditing) {
        e.preventDefault();
        handleCut();
      }
    };

    const handleWindowPaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';
      if (!isInput && !isEditing) {
        const text = e.clipboardData?.getData('text/plain');
        if (text) {
          e.preventDefault();
          handlePaste(text);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('copy', handleWindowCopy);
    window.addEventListener('cut', handleWindowCut);
    window.addEventListener('paste', handleWindowPaste);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('copy', handleWindowCopy);
      window.removeEventListener('cut', handleWindowCut);
      window.removeEventListener('paste', handleWindowPaste);
    };
  }, [
    isEditing,
    activeCoord,
    activeSheet,
    handleUndo,
    handleRedo,
    handleCopy,
    handlePaste,
    handleCut,
    handleClearCells,
    handleStartEditing,
    handleCommitEdit,
    handleCancelEdit,
    handleSelectCell,
    handleApplyStyle,
    showToast,
  ]);

  // Sheets Management: Defaults strictly to 2 columns (A, B) and blank data
  const handleAddNewSheet = useCallback(() => {
    if (isEditing) {
      handleCommitEdit('none');
    }
    const nextNumber = workbook.sheets.length + 1;
    const newSheet = createEmptySheet(
      'sheet-' + Date.now(),
      `Sheet ${nextNumber}`,
      30,
      2 // Exactly two columns by default!
    );
    setWorkbook((prev) => ({
      ...prev,
      sheets: [...prev.sheets, newSheet],
      activeSheetId: newSheet.id,
    }));
    setIsEditing(false);
    setEditValue('');
    setActiveCoord({ row: 0, col: 0 });
    setSelection({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
  }, [isEditing, handleCommitEdit, workbook.sheets.length]);

  const handleRenameSheet = useCallback((sheetId: string, newName: string) => {
    setWorkbook((prev) => ({
      ...prev,
      sheets: prev.sheets.map((s) => (s.id === sheetId ? { ...s, name: newName } : s)),
    }));
  }, []);

  const handleDuplicateSheet = useCallback((sheetId: string) => {
    const source = workbook.sheets.find((s) => s.id === sheetId);
    if (!source) return;

    const cloned: Sheet = {
      ...JSON.parse(JSON.stringify(source)),
      id: 'sheet-' + Date.now(),
      name: `${source.name} (Copy)`,
    };

    setWorkbook((prev) => ({
      ...prev,
      sheets: [...prev.sheets, cloned],
      activeSheetId: cloned.id,
    }));
  }, [workbook.sheets]);

  const handleDeleteSheet = useCallback((sheetId: string) => {
    if (workbook.sheets.length <= 1) return;
    setWorkbook((prev) => {
      const remaining = prev.sheets.filter((s) => s.id !== sheetId);
      const nextActive = prev.activeSheetId === sheetId ? remaining[0].id : prev.activeSheetId;
      return {
        ...prev,
        sheets: remaining,
        activeSheetId: nextActive,
      };
    });
  }, [workbook.sheets.length]);

  const handleChangeTabColor = useCallback((sheetId: string, color?: string) => {
    setWorkbook((prev) => ({
      ...prev,
      sheets: prev.sheets.map((s) => (s.id === sheetId ? { ...s, tabColor: color } : s)),
    }));
  }, []);

  const handleMoveSheet = useCallback((sheetId: string, direction: 'left' | 'right') => {
    setWorkbook((prev) => {
      const idx = prev.sheets.findIndex((s) => s.id === sheetId);
      if (idx === -1) return prev;
      const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.sheets.length) return prev;

      const updated = [...prev.sheets];
      const [removed] = updated.splice(idx, 1);
      updated.splice(targetIdx, 0, removed);

      return {
        ...prev,
        sheets: updated,
      };
    });
  }, []);

  // Import Data Handler
  const handleImportData = useCallback((
    data: { rowCount: number; colCount: number; cells: Record<string, CellData> },
    mode: 'replaceCurrent' | 'newSheet',
    newSheetName?: string
  ) => {
    if (mode === 'newSheet') {
      const newSheet: Sheet = {
        id: 'sheet-' + Date.now(),
        name: newSheetName || `Page ${workbook.sheets.length + 1}`,
        rowCount: Math.max(data.rowCount, 30),
        colCount: Math.max(data.colCount, 2),
        rowHeights: {},
        colWidths: {},
        cells: computeAllCells(data.cells),
      };
      setWorkbook((prev) => ({
        ...prev,
        sheets: [...prev.sheets, newSheet],
        activeSheetId: newSheet.id,
      }));
    } else {
      updateActiveSheet({
        rowCount: Math.max(activeSheet.rowCount, data.rowCount),
        colCount: Math.max(activeSheet.colCount, data.colCount),
        cells: computeAllCells({ ...activeSheet.cells, ...data.cells }),
      }, true);
    }
  }, [workbook.sheets.length, updateActiveSheet, activeSheet]);

  const currentCellStyle: CellStyle = activeSheet.cells[cellKey(activeCoord.row, activeCoord.col)]?.style || {};

  return (
    <ThemeProvider currentTheme={workbook.theme} onThemeChange={(t) => setWorkbook((w) => ({ ...w, theme: t }))}>
      <div className="flex flex-col h-screen w-screen overflow-hidden select-none">
        {/* Zone 1: Top Navigation Bar with SAGAR title */}
        <TopHeader
          workbook={workbook}
          activeSheet={activeSheet}
          onDownloadExcel={(scope) => {
            exportToExcel(workbook, scope, activeSheet);
            const msg = scope === 'current'
              ? `Downloaded ${activeSheet.name}.xlsx`
              : `Downloaded ${workbook.title || 'SAGAR'}.xlsx (${workbook.sheets.length} Sheets)`;
            showToast(msg);
          }}
          onDownloadPDF={(scope) => {
            exportToPDF(workbook, activeSheet, {
              orientation: 'landscape',
              pageSize: 'a4',
              themeStyle: 'simple',
              includeHeaderDetails: true,
              scope,
            });
            const msg = scope === 'current'
              ? `Downloaded ${activeSheet.name}.pdf`
              : `Downloaded ${workbook.title || 'SAGAR'}.pdf (${workbook.sheets.length} Sheets)`;
            showToast(msg);
          }}
          onOpenImportModal={() => setIsImportModalOpen(true)}
          onAddNewSheet={handleAddNewSheet}
          hasUnsavedChanges={hasUnsavedChanges}
        />

        {/* Toolbar with Vibrant Controls */}
        <Toolbar
          currentStyle={currentCellStyle}
          onApplyStyle={handleApplyStyle}
          canUndo={historyIndex >= 0}
          canRedo={historyIndex < history.length - 1}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onCut={handleCut}
          onCopy={handleCopy}
          onPaste={handlePaste}
          onClearCells={handleClearCells}
          onInsertRow={handleInsertRow}
          onDeleteRow={() => handleDeleteRow()}
          onInsertCol={handleInsertCol}
          onDeleteCol={() => handleDeleteCol()}
          onOpenSearch={() => setIsFindReplaceOpen(true)}
          onOpenChart={() => setIsChartModalOpen(true)}
          onOpenFilter={() => handleOpenFilter()}
          activeFilter={activeFilter}
          hiddenRowCount={hiddenRowIndices.size}
          onAddRowsBatch={handleAddRows}
          onAddColsBatch={handleAddCols}
          activeCoord={activeCoord}
          onCopyRow={() => handleCopyRow()}
          onDuplicateRow={() => handleDuplicateRow()}
          onMoveRow={handleMoveRow}
          onCopyCol={() => handleCopyCol()}
          onDuplicateCol={() => handleDuplicateCol()}
          onMoveCol={handleMoveCol}
        />

        {/* Real-time Formula Bar */}
        <FormulaBar
          activeCoord={activeCoord}
          activeCell={activeSheet.cells[cellKey(activeCoord.row, activeCoord.col)]}
          isEditing={isEditing}
          editValue={editValue}
          onChangeEditValue={setEditValue}
          onCommitEdit={handleCommitEdit}
          onCancelEdit={handleCancelEdit}
          onStartEditing={handleStartEditing}
        />

        {/* Spreadsheet Data Grid (2 Columns Default) */}
        <Grid
          sheet={activeSheet}
          activeCoord={activeCoord}
          selection={selection}
          isEditing={isEditing}
          editValue={editValue}
          onSelectCell={handleSelectCell}
          onSetSelection={handleSetSelection}
          onStartEditing={handleStartEditing}
          onChangeEditValue={setEditValue}
          onCommitEdit={handleCommitEdit}
          onCancelEdit={handleCancelEdit}
          onResizeCol={handleResizeCol}
          onResizeRow={handleResizeRow}
          onAddRows={handleAddRows}
          onAddCols={handleAddCols}
          onContextMenuAction={handleContextMenuAction}
          hiddenRowIndices={hiddenRowIndices}
          activeFilter={activeFilter}
          onOpenFilter={handleOpenFilter}
          onClearFilter={handleClearFilter}
        />

        {/* Bottom Sheets Navigation Bar & Live Status Bar */}
        <SheetTabs
          workbook={workbook}
          activeSheetId={workbook.activeSheetId}
          selection={selection}
          onSelectSheet={(sheetId) => {
            if (isEditing) {
              handleCommitEdit('none');
            }
            setWorkbook((w) => ({ ...w, activeSheetId: sheetId }));
            setIsEditing(false);
            setEditValue('');
            setActiveCoord({ row: 0, col: 0 });
            setSelection({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
          }}
          onAddSheet={handleAddNewSheet}
          onRenameSheet={handleRenameSheet}
          onDuplicateSheet={handleDuplicateSheet}
          onDeleteSheet={handleDeleteSheet}
          onChangeTabColor={handleChangeTabColor}
          onMoveSheet={handleMoveSheet}
          activeFilter={activeFilter}
          hiddenRowCount={hiddenRowIndices.size}
        />

        {/* Modals */}
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          workbook={workbook}
          activeSheet={activeSheet}
        />

        <ImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImportData={handleImportData}
          currentSheetName={activeSheet.name}
        />

        <ChartModal
          isOpen={isChartModalOpen}
          onClose={() => setIsChartModalOpen(false)}
          sheet={activeSheet}
        />

        <FindReplaceModal
          isOpen={isFindReplaceOpen}
          onClose={() => setIsFindReplaceOpen(false)}
          sheet={activeSheet}
          onJumpToCell={handleSelectCell}
          onReplaceCell={(coord, newVal) => {
            const key = cellKey(coord.row, coord.col);
            const updated = {
              ...activeSheet.cells,
              [key]: {
                ...(activeSheet.cells[key] || {}),
                raw: newVal,
              },
            };
            updateActiveSheet({ cells: updated }, true);
          }}
          onReplaceAll={(find, replace) => {
            const newCells = { ...activeSheet.cells };
            let count = 0;
            for (const k of Object.keys(newCells)) {
              const cell = newCells[k];
              if (cell && cell.raw && cell.raw.includes(find)) {
                newCells[k] = {
                  ...cell,
                  raw: cell.raw.replaceAll(find, replace),
                };
                count++;
              }
            }
            if (count > 0) {
              updateActiveSheet({ cells: newCells }, true);
            }
          }}
        />

        {/* Auto-Filter Popover Modal */}
        <AutoFilterPopover
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          sheet={activeSheet}
          activeCol={filterTargetCol}
          currentFilter={activeFilter}
          onApplyFilter={handleApplyFilter}
          onClearFilter={handleClearFilter}
          hiddenRowCount={hiddenRowIndices.size}
        />

        {/* Action Feedback Toast */}
        {toastMsg && (
          <div 
            className="fixed bottom-12 right-6 z-50 px-4 py-2.5 rounded-2xl border shadow-2xl font-bold text-xs text-white bg-[#0c1836] border-[#2563eb] animate-in fade-in slide-in-from-bottom-2 duration-150 flex items-center gap-2.5 backdrop-blur-xl"
            style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.85), 0 0 20px rgba(37, 99, 235, 0.35)' }}
          >
            <span className="text-emerald-400 font-extrabold text-sm">✓</span>
            <span className="text-blue-100">{toastMsg}</span>
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}
