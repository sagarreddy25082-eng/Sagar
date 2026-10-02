import React, { useState, useEffect, useRef } from 'react';
import { Filter, X, Check, Trash2, SlidersHorizontal } from 'lucide-react';
import { Sheet } from '../types/spreadsheet';
import { colIndexToLetter, cellKey } from '../utils/columnUtils';
import { AutoFilterCriteria, FilterOperator, OPERATOR_LABELS } from '../utils/filterUtils';

interface AutoFilterPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: Sheet;
  activeCol: number;
  currentFilter: AutoFilterCriteria | null;
  onApplyFilter: (criteria: AutoFilterCriteria) => void;
  onClearFilter: () => void;
  hiddenRowCount: number;
}

export const AutoFilterPopover: React.FC<AutoFilterPopoverProps> = ({
  isOpen,
  onClose,
  sheet,
  activeCol,
  currentFilter,
  onApplyFilter,
  onClearFilter,
  hiddenRowCount,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Local form state
  const [selectedCol, setSelectedCol] = useState<number>(currentFilter?.col ?? activeCol);
  const [operator, setOperator] = useState<FilterOperator>(currentFilter?.operator ?? 'contains');
  const [filterText, setFilterText] = useState<string>(currentFilter?.text ?? '');
  const [ignoreHeaderRow, setIgnoreHeaderRow] = useState<boolean>(currentFilter?.ignoreHeaderRow ?? true);
  const [caseSensitive, setCaseSensitive] = useState<boolean>(currentFilter?.caseSensitive ?? false);

  // Sync state when opening
  useEffect(() => {
    if (isOpen) {
      if (currentFilter) {
        setSelectedCol(currentFilter.col);
        setOperator(currentFilter.operator);
        setFilterText(currentFilter.text);
        setIgnoreHeaderRow(currentFilter.ignoreHeaderRow ?? true);
        setCaseSensitive(currentFilter.caseSensitive ?? false);
      } else {
        setSelectedCol(activeCol >= 0 && activeCol < sheet.colCount ? activeCol : 0);
        setOperator('contains');
        setFilterText('');
        setIgnoreHeaderRow(true);
        setCaseSensitive(false);
      }
    }
  }, [isOpen, currentFilter, activeCol, sheet.colCount]);

  // Handle outside click to close
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleMouseDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const requiresText = operator !== 'isEmpty' && operator !== 'isNotEmpty';

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (requiresText && !filterText.trim()) {
      return;
    }
    onApplyFilter({
      col: selectedCol,
      operator,
      text: filterText.trim(),
      ignoreHeaderRow,
      caseSensitive,
    });
    onClose();
  };

  const handleClear = () => {
    onClearFilter();
    setFilterText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
      <div
        ref={popoverRef}
        className="w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 bg-white overflow-hidden flex flex-col text-slate-800 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Filter className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Auto-Filter Rows</h3>
              <p className="text-[11px] text-slate-500">Hide rows not matching criteria</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Active Filter Banner if set */}
          {currentFilter && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-900">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <SlidersHorizontal className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                <span className="truncate text-[11px]">
                  Filter on <b>Col {colIndexToLetter(currentFilter.col)}</b> ({hiddenRowCount} rows hidden)
                </span>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="text-[10px] text-blue-700 hover:text-blue-900 hover:underline shrink-0 ml-2 font-semibold cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}

          {/* Select Column */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Select Column to Filter
            </label>
            <select
              value={selectedCol}
              onChange={(e) => setSelectedCol(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 outline-none cursor-pointer focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-xs"
            >
              {Array.from({ length: sheet.colCount }).map((_, c) => {
                const headerCell = sheet.cells[cellKey(0, c)];
                const headerLabel = headerCell?.raw?.trim();
                const colLetter = colIndexToLetter(c);
                return (
                  <option key={c} value={c}>
                    Column {colLetter} {headerLabel ? `— "${headerLabel}"` : `(Column ${c + 1})`}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Match Condition (Operator) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Filter Condition
            </label>
            <select
              value={operator}
              onChange={(e) => setOperator(e.target.value as FilterOperator)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 outline-none cursor-pointer focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-xs"
            >
              {Object.entries(OPERATOR_LABELS).map(([opKey, opLabel]) => (
                <option key={opKey} value={opKey}>
                  {opLabel}
                </option>
              ))}
            </select>
          </div>

          {/* User-defined text criteria */}
          {requiresText && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Filter Text Criteria
              </label>
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="Enter text or number to filter by..."
                  className="w-full px-3 py-2 pr-8 rounded-lg border border-slate-300 bg-white text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-xs"
                />
                {filterText && (
                  <button
                    type="button"
                    onClick={() => setFilterText('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options: Ignore header row + Case sensitive */}
          <div className="pt-1 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={ignoreHeaderRow}
                onChange={(e) => setIgnoreHeaderRow(e.target.checked)}
                className="rounded accent-blue-600 cursor-pointer"
              />
              <span className="text-[11px] text-slate-700 font-medium">
                Keep Row 1 visible (table header)
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
                className="rounded accent-blue-600 cursor-pointer"
              />
              <span className="text-[11px] text-slate-700 font-medium">
                Case sensitive matching
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {currentFilter ? (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={requiresText && !filterText.trim()}
              className="px-4 py-1.5 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Apply Filter</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
