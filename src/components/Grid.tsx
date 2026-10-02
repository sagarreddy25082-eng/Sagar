import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  CellCoord,
  CellData,
  ContextMenuState,
  SelectionRange,
  Sheet,
} from '../types/spreadsheet';
import { cellKey, colIndexToLetter, normalizeRange } from '../utils/columnUtils';
import {
  Copy,
  Scissors,
  Clipboard,
  Trash2,
  Plus,
  Files,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { AutoFilterCriteria } from '../utils/filterUtils';

interface GridProps {
  sheet: Sheet;
  activeCoord: CellCoord;
  selection: SelectionRange;
  isEditing: boolean;
  editValue: string;
  onSelectCell: (coord: CellCoord) => void;
  onSetSelection: (range: SelectionRange) => void;
  onStartEditing: (coord: CellCoord, initialVal?: string) => void;
  onChangeEditValue: (val: string) => void;
  onCommitEdit: (moveDirection?: 'down' | 'right' | 'none', overrideVal?: string) => void;
  onCancelEdit: () => void;
  onResizeCol: (colIndex: number, newWidth: number) => void;
  onResizeRow: (rowIndex: number, newHeight: number) => void;
  onAddRows: (count: number) => void;
  onAddCols: (count: number) => void;
  onContextMenuAction: (action: string, target?: { row?: number; col?: number }) => void;
  hiddenRowIndices?: Set<number>;
  activeFilter?: AutoFilterCriteria | null;
  onOpenFilter?: (col?: number) => void;
  onClearFilter?: () => void;
}

const DEFAULT_COL_WIDTH = 220;
const DEFAULT_ROW_HEIGHT = 30;
const HEADER_ROW_HEIGHT = 28;
const HEADER_COL_WIDTH = 48;

export const Grid: React.FC<GridProps> = ({
  sheet,
  activeCoord,
  selection,
  isEditing,
  editValue,
  onSelectCell,
  onSetSelection,
  onStartEditing,
  onChangeEditValue,
  onCommitEdit,
  onCancelEdit,
  onResizeCol,
  onResizeRow,
  onAddRows,
  onContextMenuAction,
  hiddenRowIndices,
  activeFilter,
  onOpenFilter,
  onClearFilter,
}) => {
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Drag selection state
  const [isSelecting, setIsSelecting] = useState(false);
  const selectionStartRef = useRef<CellCoord>(activeCoord);

  // Resize dragging state
  const [resizingCol, setResizingCol] = useState<{ col: number; startX: number; startWidth: number } | null>(null);
  const [resizingRow, setResizingRow] = useState<{ row: number; startY: number; startHeight: number } | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const normalized = normalizeRange(selection);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  // Handle column / row resize drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizingCol) {
        const delta = e.clientX - resizingCol.startX;
        const newWidth = Math.max(60, resizingCol.startWidth + delta);
        onResizeCol(resizingCol.col, newWidth);
      } else if (resizingRow) {
        const delta = e.clientY - resizingRow.startY;
        const newHeight = Math.max(22, resizingRow.startHeight + delta);
        onResizeRow(resizingRow.row, newHeight);
      }
    };

    const handleMouseUp = () => {
      if (resizingCol) setResizingCol(null);
      if (resizingRow) setResizingRow(null);
      if (isSelecting) setIsSelecting(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingCol, resizingRow, isSelecting, onResizeCol, onResizeRow]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu) setContextMenu(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  // Helper getters for dimensions
  const getColWidth = useCallback((col: number) => sheet.colWidths[col] || DEFAULT_COL_WIDTH, [sheet.colWidths]);
  const getRowHeight = useCallback((row: number) => sheet.rowHeights[row] || DEFAULT_ROW_HEIGHT, [sheet.rowHeights]);

  // Cell mouse down
  const handleCellMouseDown = (row: number, col: number, e: React.MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault();
      if (row < normalized.minRow || row > normalized.maxRow || col < normalized.minCol || col > normalized.maxCol) {
        onSelectCell({ row, col });
      }
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        type: 'cell',
        targetRow: row,
        targetCol: col,
      });
      return;
    }

    if (e.shiftKey) {
      onSetSelection({
        startRow: activeCoord.row,
        startCol: activeCoord.col,
        endRow: row,
        endCol: col,
      });
    } else {
      onSelectCell({ row, col });
      selectionStartRef.current = { row, col };
      setIsSelecting(true);
    }
  };

  const handleCellMouseEnter = (row: number, col: number) => {
    if (isSelecting) {
      onSetSelection({
        startRow: selectionStartRef.current.row,
        startCol: selectionStartRef.current.col,
        endRow: row,
        endCol: col,
      });
    }
  };

  // Column header click: select row 0 of that column cleanly
  const handleColHeaderClick = (col: number, e: React.MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        type: 'colHeader',
        targetCol: col,
      });
      return;
    }
    onSelectCell({ row: 0, col });
    onSetSelection({
      startRow: 0,
      startCol: col,
      endRow: 0,
      endCol: col,
    });
    onStartEditing({ row: 0, col });
  };

  const handleRowHeaderClick = (row: number, e: React.MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        type: 'rowHeader',
        targetRow: row,
      });
      return;
    }
    onSelectCell({ row, col: 0 });
    onSetSelection({
      startRow: row,
      startCol: 0,
      endRow: row,
      endCol: 0,
    });
    onStartEditing({ row, col: 0 });
  };

  const handleSelectAll = () => {
    onSelectCell({ row: 0, col: 0 });
    onSetSelection({
      startRow: 0,
      startCol: 0,
      endRow: sheet.rowCount - 1,
      endCol: sheet.colCount - 1,
    });
  };

  return (
    <div
      ref={gridContainerRef}
      className="flex-1 overflow-auto relative select-none bg-slate-100/70"
    >
      <div className="inline-block min-w-full pb-16">
        <table className="border-collapse table-fixed text-xs select-none">
          {/* Defined Column Dimensions (Strictly 2 Columns default) */}
          <colgroup>
            <col style={{ width: `${HEADER_COL_WIDTH}px` }} />
            {Array.from({ length: sheet.colCount }).map((_, c) => (
              <col key={c} style={{ width: `${getColWidth(c)}px` }} />
            ))}
          </colgroup>

          {/* Table Header Row (A, B...) */}
          <thead className="sticky top-0 z-10 shadow-xs">
            <tr style={{ height: `${HEADER_ROW_HEIGHT}px` }}>
              {/* Corner Select All Cell */}
              <th
                onClick={handleSelectAll}
                title="Select all cells"
                className="sticky left-0 z-20 border border-slate-300 bg-slate-100 hover:bg-slate-200 text-center font-normal cursor-pointer select-none transition-colors"
                style={{ width: `${HEADER_COL_WIDTH}px` }}
              >
                <div className="w-2.5 h-2.5 mx-auto bg-slate-400/80 rounded-xs" />
              </th>

              {/* Column Letter Headers */}
              {Array.from({ length: sheet.colCount }).map((_, c) => {
                const isColActive = c === activeCoord.col;

                return (
                  <th
                    key={c}
                    onClick={(e) => handleColHeaderClick(c, e)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        type: 'colHeader',
                        targetCol: c,
                      });
                    }}
                    className={`border border-slate-300 font-bold relative group text-center cursor-pointer select-none transition-colors ${
                      isColActive ? 'bg-blue-100/70 text-blue-800' : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                    }`}
                  >
                    {/* Top blue stripe on active column */}
                    {isColActive && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-600" />
                    )}

                    <div className="flex items-center justify-center gap-1.5 py-0.5">
                      <span className="font-mono text-xs tracking-wider">{colIndexToLetter(c)}</span>
                      {activeFilter && activeFilter.col === c && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenFilter?.(c);
                          }}
                          title={`Filtered on Col ${colIndexToLetter(c)}: ${activeFilter.operator} "${activeFilter.text}"`}
                          className="p-0.5 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors cursor-pointer shadow-xs ml-0.5"
                        >
                          <Filter className="w-2.5 h-2.5 stroke-[2.5]" />
                        </button>
                      )}
                    </div>

                    {/* Column Resize Handle */}
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setResizingCol({
                          col: c,
                          startX: e.clientX,
                          startWidth: getColWidth(c),
                        });
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        onResizeCol(c, 220);
                      }}
                      title="Drag to resize column width"
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body (Numbered Rows & Data Cells - Filtered rows hidden) */}
          <tbody>
            {Array.from({ length: sheet.rowCount }).map((_, r) => {
              if (hiddenRowIndices && hiddenRowIndices.has(r)) {
                return null;
              }
              const isRowActive = r === activeCoord.row;
              const rowH = getRowHeight(r);

              return (
                <tr key={r} style={{ height: `${rowH}px` }}>
                  {/* Row Number Header */}
                  <th
                    onClick={(e) => handleRowHeaderClick(r, e)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        type: 'rowHeader',
                        targetRow: r,
                      });
                    }}
                    className={`sticky left-0 z-5 border border-slate-300 font-mono text-[11px] font-normal text-center cursor-pointer select-none relative group transition-colors ${
                      isRowActive ? 'bg-blue-100/70 text-blue-800 font-semibold' : 'bg-slate-100 hover:bg-slate-200/80 text-slate-500'
                    }`}
                    style={{ width: `${HEADER_COL_WIDTH}px` }}
                  >
                    <span>{r + 1}</span>

                    {/* Row Resize Handle */}
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setResizingRow({
                          row: r,
                          startY: e.clientY,
                          startHeight: rowH,
                        });
                      }}
                      title="Drag to resize row height"
                      className="absolute left-0 right-0 bottom-0 h-1.5 cursor-row-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  {/* Data Cells in Row (Direct Data Entry) */}
                  {Array.from({ length: sheet.colCount }).map((_, c) => {
                    const key = cellKey(r, c);
                    const cell: CellData | undefined = sheet.cells[key];
                    const isActive = r === activeCoord.row && c === activeCoord.col;
                    const inSelection =
                      r >= normalized.minRow &&
                      r <= normalized.maxRow &&
                      c >= normalized.minCol &&
                      c <= normalized.maxCol;

                    const rawVal = cell?.raw ?? '';
                    const displayVal = rawVal.trim().startsWith('=') && cell?.computed !== undefined
                      ? cell.computed
                      : rawVal;

                    const style = cell?.style || {};
                    const alignClass =
                      style.align === 'center'
                        ? 'text-center'
                        : style.align === 'right'
                        ? 'text-right'
                        : 'text-left';

                    const isFormulaError = cell?.isError || (typeof displayVal === 'string' && displayVal.startsWith('#'));

                    return (
                      <td
                        key={c}
                        onMouseDown={(e) => handleCellMouseDown(r, c, e)}
                        onMouseEnter={() => handleCellMouseEnter(r, c)}
                        onClick={() => {
                          if (r !== activeCoord.row || c !== activeCoord.col) {
                            if (isEditing) {
                              onCommitEdit('none', editValue);
                            }
                            onSelectCell({ row: r, col: c });
                          } else if (!isEditing) {
                            onStartEditing({ row: r, col: c });
                          }
                        }}
                        onDoubleClick={() => {
                          onStartEditing({ row: r, col: c });
                        }}
                        className={`border border-slate-200 px-2 py-0.5 relative whitespace-nowrap overflow-hidden text-ellipsis transition-colors cursor-text ${alignClass} ${
                          isActive ? 'z-2' : ''
                        }`}
                        style={{
                          backgroundColor: style.bgColor || (inSelection && !isActive ? 'rgba(37, 99, 235, 0.08)' : '#ffffff'),
                          color: isFormulaError ? '#e11d48' : (style.textColor || '#0f172a'),
                          fontWeight: style.bold ? '600' : 'normal',
                          fontStyle: style.italic ? 'italic' : 'normal',
                          textDecoration: `${style.underline ? 'underline' : ''} ${style.strikethrough ? 'line-through' : ''}`.trim() || undefined,
                          fontSize: style.fontSize ? `${style.fontSize}px` : '13px',
                          outline: isActive ? '2px solid #2563eb' : undefined,
                          outlineOffset: '-1px',
                          boxShadow: isActive ? '0 0 0 1px rgba(37, 99, 235, 0.4)' : undefined,
                        }}
                      >
                        {/* Direct Inline Editor */}
                        {isActive && isEditing ? (
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editValue}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => onChangeEditValue(e.target.value)}
                            onBlur={(e) => onCommitEdit('none', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                onCommitEdit('down', (e.target as HTMLInputElement).value);
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                onCancelEdit();
                              } else if (e.key === 'Tab') {
                                e.preventDefault();
                                onCommitEdit('right', (e.target as HTMLInputElement).value);
                              }
                            }}
                            className="absolute inset-0 w-full h-full px-2 py-0 font-sans text-xs outline-none z-30 shadow-md ring-2 ring-blue-600 bg-white text-slate-900"
                            style={{
                              backgroundColor: style.bgColor || '#ffffff',
                              color: style.textColor || '#0f172a',
                            }}
                          />
                        ) : (
                          <span className="select-text">
                            {displayVal}
                          </span>
                        )}

                        {/* Corner handle indicator on active cell */}
                        {isActive && !isEditing && (
                          <div
                            className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-blue-600 cursor-crosshair z-10"
                          />
                        )}
                      </td>
                    );
                  })}

                  {/* Empty side spacer cell */}
                  <td className="border-b border-slate-200" />
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Dynamic Expansion Controls Bar - Row only */}
        <div className="flex flex-wrap items-center gap-2.5 px-4 py-3 mt-1 text-xs font-semibold border-t border-slate-200 bg-white/70">
          <span className="text-slate-500 font-semibold">Add rows:</span>
          <button
            onClick={() => onAddRows(10)}
            className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 transition-all flex items-center gap-1 cursor-pointer shadow-2xs font-semibold text-slate-700"
          >
            <Plus className="w-3 h-3 text-blue-600" />
            <span>+ 10 Rows</span>
          </button>
          <button
            onClick={() => onAddRows(50)}
            className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 transition-all flex items-center gap-1 cursor-pointer shadow-2xs font-semibold text-slate-700"
          >
            <Plus className="w-3 h-3 text-blue-600" />
            <span>+ 50 Rows</span>
          </button>
          <button
            onClick={() => onAddRows(100)}
            className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 transition-all flex items-center gap-1 cursor-pointer shadow-2xs font-semibold text-slate-700"
          >
            <Plus className="w-3 h-3 text-blue-600" />
            <span>+ 100 Rows</span>
          </button>
        </div>
      </div>

      {/* Right Click Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 rounded-xl shadow-xl border border-slate-200 bg-white py-1.5 text-xs text-slate-800 animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cell context menu options */}
          {contextMenu.type === 'cell' && (
            <>
              <button
                onClick={() => onContextMenuAction('cut')}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Scissors className="w-3.5 h-3.5 text-slate-600" />
                  <span>Cut</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Ctrl+X</span>
              </button>
              <button
                onClick={() => onContextMenuAction('copy')}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span>Copy</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Ctrl+C</span>
              </button>
              <button
                onClick={() => onContextMenuAction('paste')}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Clipboard className="w-3.5 h-3.5 text-slate-600" />
                  <span>Paste</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Ctrl+V</span>
              </button>
              <div className="border-t my-1 border-slate-100" />
              <button
                onClick={() => onContextMenuAction('copyRow', { row: contextMenu.targetRow })}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 cursor-pointer text-slate-700"
              >
                <Copy className="w-3.5 h-3.5 text-blue-600" />
                <span>Copy row {(contextMenu.targetRow ?? 0) + 1}</span>
              </button>
              <button
                onClick={() => onContextMenuAction('duplicateRow', { row: contextMenu.targetRow })}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 cursor-pointer text-slate-700"
              >
                <Files className="w-3.5 h-3.5 text-blue-600" />
                <span>Duplicate row below</span>
              </button>
              <button
                onClick={() => onContextMenuAction('copyCol', { col: contextMenu.targetCol })}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 cursor-pointer text-slate-700"
              >
                <Copy className="w-3.5 h-3.5 text-blue-600" />
                <span>Copy column {colIndexToLetter(contextMenu.targetCol ?? 0)}</span>
              </button>
              <button
                onClick={() => onContextMenuAction('duplicateCol', { col: contextMenu.targetCol })}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 cursor-pointer text-slate-700"
              >
                <Files className="w-3.5 h-3.5 text-blue-600" />
                <span>Duplicate column right</span>
              </button>
              <div className="border-t my-1 border-slate-100" />
              <button
                onClick={() => onContextMenuAction('insertRowAbove', { row: contextMenu.targetRow })}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 cursor-pointer"
              >
                Insert row above
              </button>
              <button
                onClick={() => onContextMenuAction('insertRowBelow', { row: contextMenu.targetRow })}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 cursor-pointer"
              >
                Insert row below
              </button>
              <div className="border-t my-1 border-slate-100" />
              <button
                onClick={() => onContextMenuAction('deleteRow', { row: contextMenu.targetRow })}
                className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 cursor-pointer"
              >
                Delete row
              </button>
              <button
                onClick={() => onContextMenuAction('clear')}
                className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 cursor-pointer flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear contents</span>
              </button>
            </>
          )}

          {/* Column Header Context Menu */}
          {contextMenu.type === 'colHeader' && (
            <>
              <div className="px-3 py-1 font-bold text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                Column {colIndexToLetter(contextMenu.targetCol ?? 0)} Options
              </div>
              <button
                onClick={() => onContextMenuAction('copyCol', { col: contextMenu.targetCol })}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 cursor-pointer text-slate-700"
              >
                <Copy className="w-3.5 h-3.5 text-blue-600" />
                <span>Copy column {colIndexToLetter(contextMenu.targetCol ?? 0)}</span>
              </button>
              <button
                onClick={() => onContextMenuAction('duplicateCol', { col: contextMenu.targetCol })}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 cursor-pointer text-slate-700"
              >
                <Files className="w-3.5 h-3.5 text-blue-600" />
                <span>Duplicate column right</span>
              </button>
              <div className="flex items-center gap-1.5 px-2 py-1">
                <button
                  onClick={() => onContextMenuAction('moveColLeft', { col: contextMenu.targetCol })}
                  disabled={(contextMenu.targetCol ?? 0) <= 0}
                  className="flex-1 py-1 px-2 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-700 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
                  <span>Move Left</span>
                </button>
                <button
                  onClick={() => onContextMenuAction('moveColRight', { col: contextMenu.targetCol })}
                  disabled={(contextMenu.targetCol ?? 0) >= sheet.colCount - 1}
                  className="flex-1 py-1 px-2 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-700 cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                  <span>Move Right</span>
                </button>
              </div>
              <div className="border-t my-1 border-slate-100" />
              <button
                onClick={() => onContextMenuAction('insertColLeft', { col: contextMenu.targetCol })}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 cursor-pointer text-slate-700"
              >
                Insert column left
              </button>
              <button
                onClick={() => onContextMenuAction('insertColRight', { col: contextMenu.targetCol })}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 cursor-pointer text-slate-700"
              >
                Insert column right
              </button>
              <div className="border-t my-1 border-slate-100" />
              <button
                onClick={() => onContextMenuAction('deleteCol', { col: contextMenu.targetCol })}
                className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 cursor-pointer"
              >
                Delete column
              </button>
              <button
                onClick={() => onContextMenuAction('clear')}
                className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 cursor-pointer"
              >
                Clear column data
              </button>
            </>
          )}

          {/* Row Header Context Menu */}
          {contextMenu.type === 'rowHeader' && (
            <>
              <div className="px-3 py-1 font-bold text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                Row {(contextMenu.targetRow ?? 0) + 1} Options
              </div>
              <button
                onClick={() => onContextMenuAction('copyRow', { row: contextMenu.targetRow })}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 cursor-pointer text-slate-700"
              >
                <Copy className="w-3.5 h-3.5 text-blue-600" />
                <span>Copy row {(contextMenu.targetRow ?? 0) + 1}</span>
              </button>
              <button
                onClick={() => onContextMenuAction('duplicateRow', { row: contextMenu.targetRow })}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 cursor-pointer text-slate-700"
              >
                <Files className="w-3.5 h-3.5 text-blue-600" />
                <span>Duplicate row below</span>
              </button>
              <div className="flex items-center gap-1.5 px-2 py-1">
                <button
                  onClick={() => onContextMenuAction('moveRowUp', { row: contextMenu.targetRow })}
                  disabled={(contextMenu.targetRow ?? 0) <= 0}
                  className="flex-1 py-1 px-2 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-700 cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-slate-600" />
                  <span>Move Up</span>
                </button>
                <button
                  onClick={() => onContextMenuAction('moveRowDown', { row: contextMenu.targetRow })}
                  disabled={(contextMenu.targetRow ?? 0) >= sheet.rowCount - 1}
                  className="flex-1 py-1 px-2 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-700 cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5 text-slate-600" />
                  <span>Move Down</span>
                </button>
              </div>
              <div className="border-t my-1 border-slate-100" />
              <button
                onClick={() => onContextMenuAction('insertRowAbove', { row: contextMenu.targetRow })}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 cursor-pointer text-slate-700"
              >
                Insert row above
              </button>
              <button
                onClick={() => onContextMenuAction('insertRowBelow', { row: contextMenu.targetRow })}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 cursor-pointer text-slate-700"
              >
                Insert row below
              </button>
              <div className="border-t my-1 border-slate-100" />
              <button
                onClick={() => onContextMenuAction('deleteRow', { row: contextMenu.targetRow })}
                className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 cursor-pointer"
              >
                Delete row
              </button>
            </>
          )}
        </div>
      )}

      {/* Active Auto-Filter Floating Badge Notification */}
      {activeFilter && hiddenRowIndices && hiddenRowIndices.size > 0 && (
        <div className="absolute top-10 right-6 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-300 bg-white shadow-lg text-xs font-medium text-slate-800 animate-in fade-in">
          <Filter className="w-3.5 h-3.5 text-blue-600" />
          <span>
            Filtered: Col {colIndexToLetter(activeFilter.col)} ({sheet.rowCount - hiddenRowIndices.size} of {sheet.rowCount} rows visible)
          </span>
          <button
            type="button"
            onClick={onClearFilter}
            className="text-[10px] uppercase font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer ml-1 bg-blue-50 px-2 py-0.5 rounded-full"
          >
            Clear Filter
          </button>
        </div>
      )}
    </div>
  );
};
