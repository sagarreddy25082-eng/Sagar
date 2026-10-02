import React, { useState } from 'react';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  MoreHorizontal, 
  Copy, 
  Trash2, 
  Edit2, 
  Palette, 
  ArrowLeft, 
  ArrowRight 
} from 'lucide-react';
import { SelectionRange, Sheet, Workbook } from '../types/spreadsheet';
import { normalizeRange } from '../utils/columnUtils';
import { cellKey, colIndexToLetter } from '../utils/columnUtils';
import { AutoFilterCriteria } from '../utils/filterUtils';

interface SheetTabsProps {
  workbook: Workbook;
  activeSheetId: string;
  selection: SelectionRange;
  onSelectSheet: (sheetId: string) => void;
  onAddSheet: () => void;
  onRenameSheet: (sheetId: string, newName: string) => void;
  onDuplicateSheet: (sheetId: string) => void;
  onDeleteSheet: (sheetId: string) => void;
  onChangeTabColor: (sheetId: string, color?: string) => void;
  onMoveSheet: (sheetId: string, direction: 'left' | 'right') => void;
  activeFilter?: AutoFilterCriteria | null;
  hiddenRowCount?: number;
}

const TAB_COLORS = [
  undefined,
  '#2563eb', // Royal Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#dc2626', // Crimson Red
  '#8b5cf6', // Violet
  '#64748b', // Slate
];

export const SheetTabs: React.FC<SheetTabsProps> = ({
  workbook,
  activeSheetId,
  selection,
  onSelectSheet,
  onAddSheet,
  onRenameSheet,
  onDuplicateSheet,
  onDeleteSheet,
  onChangeTabColor,
  onMoveSheet,
  activeFilter,
  hiddenRowCount = 0,
}) => {
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [menuSheetId, setMenuSheetId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  const activeSheet = workbook.sheets.find((s) => s.id === activeSheetId) || workbook.sheets[0];

  // Calculate live aggregate stats for the current selection (Average, Count, Min, Max, Sum)
  const calculateSelectionStats = () => {
    if (!activeSheet) return null;
    const norm = normalizeRange(selection);
    const numbers: number[] = [];
    let filledCount = 0;

    for (let r = norm.minRow; r <= norm.maxRow; r++) {
      for (let c = norm.minCol; c <= norm.maxCol; c++) {
        const cell = activeSheet.cells[cellKey(r, c)];
        if (cell && cell.raw && cell.raw.trim().length > 0) {
          filledCount++;
          const val = cell.computed !== undefined ? cell.computed : cell.raw;
          const num = typeof val === 'number' ? val : parseFloat(val.toString().replace(/[$,%]/g, ''));
          if (!isNaN(num)) {
            numbers.push(num);
          }
        }
      }
    }

    const totalCells = (norm.maxRow - norm.minRow + 1) * (norm.maxCol - norm.minCol + 1);

    if (totalCells <= 1 && numbers.length === 0) {
      return null;
    }

    const sum = numbers.reduce((acc, curr) => acc + curr, 0);
    const avg = numbers.length > 0 ? sum / numbers.length : 0;
    const min = numbers.length > 0 ? Math.min(...numbers) : 0;
    const max = numbers.length > 0 ? Math.max(...numbers) : 0;

    return {
      totalCells,
      filledCount,
      numbersCount: numbers.length,
      sum,
      avg,
      min,
      max,
    };
  };

  const stats = calculateSelectionStats();

  const handleStartRename = (sheet: Sheet) => {
    setEditingSheetId(sheet.id);
    setEditingName(sheet.name);
    setMenuSheetId(null);
  };

  const handleCommitRename = (sheetId: string) => {
    if (editingName.trim()) {
      onRenameSheet(sheetId, editingName.trim());
    }
    setEditingSheetId(null);
  };

  const handleOpenMenu = (sheetId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ x: rect.left, y: rect.top - 200 });
    setMenuSheetId(sheetId);
  };

  return (
    <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900 select-none px-3 py-1 text-xs shrink-0 z-20 relative text-slate-200">
      {/* Left side: Sheet Tabs navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto max-w-[65%] py-0.5">
        {/* Navigation chevrons for many sheets */}
        <div className="flex items-center text-slate-400 mr-1">
          <button
            onClick={() => {
              const idx = workbook.sheets.findIndex((s) => s.id === activeSheetId);
              if (idx > 0) onSelectSheet(workbook.sheets[idx - 1].id);
            }}
            title="Previous sheet"
            className="p-1 hover:text-white cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              const idx = workbook.sheets.findIndex((s) => s.id === activeSheetId);
              if (idx < workbook.sheets.length - 1) onSelectSheet(workbook.sheets[idx + 1].id);
            }}
            title="Next sheet"
            className="p-1 hover:text-white cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tabs List */}
        <div className="flex items-center gap-1">
          {workbook.sheets.map((sheet) => {
            const isActive = sheet.id === activeSheetId;
            const isEditing = sheet.id === editingSheetId;

            return (
              <div
                key={sheet.id}
                onClick={() => onSelectSheet(sheet.id)}
                onContextMenu={(e) => handleOpenMenu(sheet.id, e)}
                className={`group flex items-center gap-2 px-3 py-1 rounded-t border-t-2 cursor-pointer transition-all relative ${
                  isActive
                    ? 'font-bold shadow-md text-slate-900 bg-white border-t-blue-600'
                    : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white border-t-transparent'
                }`}
                style={{
                  marginBottom: isActive ? '-1px' : '0px',
                }}
              >
                {/* Custom Tab Color Dot */}
                <div
                  className="w-2 h-2 rounded-full shrink-0 border border-slate-300/40"
                  style={{ backgroundColor: sheet.tabColor || '#2563eb' }}
                />

                {/* Sheet Title or Inline Rename Input */}
                {isEditing ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => handleCommitRename(sheet.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCommitRename(sheet.id);
                      if (e.key === 'Escape') setEditingSheetId(null);
                    }}
                    autoFocus
                    className="w-24 px-1 py-0 text-xs bg-slate-900 border border-blue-400 text-white rounded outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleStartRename(sheet);
                    }}
                    className={`truncate max-w-[120px] ${isActive ? 'text-slate-900 font-bold' : 'text-slate-200'}`}
                    title="Double click to rename sheet"
                  >
                    {sheet.name}
                  </span>
                )}

                {/* 3-dots Menu Button */}
                <button
                  onClick={(e) => handleOpenMenu(sheet.id, e)}
                  title="Sheet options"
                  className={`opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded cursor-pointer ${
                    isActive ? 'text-slate-400 hover:text-blue-600' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <MoreHorizontal className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Add Sheet Button (+) */}
        <button
          onClick={onAddSheet}
          title="Add New Sheet / Page"
          className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer font-semibold ml-1 shrink-0 text-slate-200 text-xs"
        >
          <Plus className="w-3 h-3 text-blue-400 stroke-[3]" />
          <span>New Sheet</span>
        </button>
      </div>

      {/* Right side: Live Excel Status Bar (Sum, Average, Count, Row Count) */}
      <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums text-slate-400 pr-2">
        {stats && stats.numbersCount > 0 && (
          <div className="flex items-center gap-3">
            <span>
              <strong className="font-sans text-[10px] uppercase text-slate-500 mr-1">Avg:</strong>
              <span className="text-slate-200">{stats.avg.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}</span>
            </span>
            <span>
              <strong className="font-sans text-[10px] uppercase text-slate-500 mr-1">Count:</strong>
              <span className="text-slate-200">{stats.filledCount}</span>
            </span>
            <span>
              <strong className="font-sans text-[10px] uppercase text-slate-500 mr-1">Min:</strong>
              <span className="text-slate-200">{stats.min.toLocaleString()}</span>
            </span>
            <span>
              <strong className="font-sans text-[10px] uppercase text-slate-500 mr-1">Max:</strong>
              <span className="text-slate-200">{stats.max.toLocaleString()}</span>
            </span>
            <span>
              <strong className="font-sans text-[10px] uppercase text-slate-500 mr-1">Sum:</strong>
              <span className="text-cyan-400 font-bold">{stats.sum.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
            </span>
          </div>
        )}

        <div className="h-3 w-px bg-slate-800" />

        {activeFilter && hiddenRowCount > 0 ? (
          <span className="font-sans text-[11px] text-cyan-400 font-semibold flex items-center gap-1">
            <span>Filtered:</span>
            <span className="text-white font-mono">{activeSheet.rowCount - hiddenRowCount}</span>
            <span>of</span>
            <span className="text-white font-mono">{activeSheet.rowCount}</span>
            <span>rows (Col {colIndexToLetter(activeFilter.col)})</span>
          </span>
        ) : (
          <span className="font-sans text-[11px] text-slate-400">
            {activeSheet.rowCount} rows × {activeSheet.colCount} cols
          </span>
        )}
      </div>

      {/* Floating Sheet Options Popover */}
      {menuSheetId && menuPos && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuSheetId(null)}
          />
          <div
            className="fixed rounded-xl shadow-2xl border border-slate-700 bg-slate-900 py-1.5 z-50 text-xs w-52 text-slate-100 animate-in fade-in zoom-in-95 duration-100"
            style={{
              bottom: '38px',
              left: `${Math.max(10, Math.min(window.innerWidth - 220, menuPos.x))}px`,
            }}
          >
            <div className="px-3 py-1 font-bold text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">
              Sheet Options
            </div>

            <button
              onClick={() => {
                const s = workbook.sheets.find((item) => item.id === menuSheetId);
                if (s) handleStartRename(s);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-200 flex items-center gap-2 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Rename Sheet</span>
            </button>

            <button
              onClick={() => {
                onDuplicateSheet(menuSheetId);
                setMenuSheetId(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-200 flex items-center gap-2 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-blue-400" />
              <span>Duplicate Sheet</span>
            </button>

            <div className="border-t my-1 border-slate-800" />

            {/* Move sheet left / right */}
            <button
              onClick={() => {
                onMoveSheet(menuSheetId, 'left');
                setMenuSheetId(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-200 flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
              <span>Move Left</span>
            </button>

            <button
              onClick={() => {
                onMoveSheet(menuSheetId, 'right');
                setMenuSheetId(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-200 flex items-center gap-2 cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span>Move Right</span>
            </button>

            <div className="border-t my-1 border-slate-800" />

            {/* Color picker for Tab marker */}
            <div className="px-3 py-1 text-[11px] text-slate-400 flex items-center gap-1.5">
              <Palette className="w-3 h-3" />
              <span>Tab Color:</span>
            </div>
            <div className="px-3 py-1 flex items-center gap-1.5">
              {TAB_COLORS.map((col, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onChangeTabColor(menuSheetId, col);
                    setMenuSheetId(null);
                  }}
                  className="w-4 h-4 rounded-full border border-slate-600 hover:scale-125 transition-transform cursor-pointer relative"
                  style={{ backgroundColor: col || '#94a3b8' }}
                  title={col ? col : 'None'}
                >
                  {!col && <span className="absolute inset-0 text-[8px] text-slate-800 flex items-center justify-center font-bold">×</span>}
                </button>
              ))}
            </div>

            <div className="border-t my-1 border-slate-800" />

            {/* Delete Sheet */}
            <button
              onClick={() => {
                if (workbook.sheets.length <= 1) {
                  return;
                }
                onDeleteSheet(menuSheetId);
                setMenuSheetId(null);
              }}
              disabled={workbook.sheets.length <= 1}
              className={`w-full text-left px-3 py-1.5 flex items-center gap-2 transition-colors cursor-pointer ${
                workbook.sheets.length <= 1
                  ? 'opacity-40 cursor-not-allowed text-slate-500'
                  : 'hover:bg-rose-500/20 text-rose-400'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Sheet</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
