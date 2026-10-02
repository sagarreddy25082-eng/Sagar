import React, { useState } from 'react';
import { X, Search, Replace, ChevronDown, ChevronUp } from 'lucide-react';
import { CellCoord, Sheet } from '../types/spreadsheet';
import { cellKey, coordToName, parseCellKey } from '../utils/columnUtils';

interface FindReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: Sheet;
  onJumpToCell: (coord: CellCoord) => void;
  onReplaceCell: (coord: CellCoord, newVal: string) => void;
  onReplaceAll: (find: string, replace: string) => void;
}

export const FindReplaceModal: React.FC<FindReplaceModalProps> = ({
  isOpen,
  onClose,
  sheet,
  onJumpToCell,
  onReplaceCell,
  onReplaceAll,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  if (!isOpen) return null;

  // Find all matches
  const matches: CellCoord[] = [];
  if (searchTerm.trim()) {
    const term = matchCase ? searchTerm : searchTerm.toLowerCase();
    for (const key of Object.keys(sheet.cells)) {
      const cell = sheet.cells[key];
      if (cell && cell.raw) {
        const text = matchCase ? cell.raw : cell.raw.toLowerCase();
        if (text.includes(term)) {
          matches.push(parseCellKey(key));
        }
      }
    }
  }

  const handleNext = () => {
    if (matches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIdx);
    onJumpToCell(matches[nextIdx]);
  };

  const handlePrev = () => {
    if (matches.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(prevIdx);
    onJumpToCell(matches[prevIdx]);
  };

  const handleReplaceCurrent = () => {
    if (matches.length === 0) return;
    const current = matches[currentMatchIndex];
    const key = cellKey(current.row, current.col);
    const cell = sheet.cells[key];
    if (cell) {
      const currentText = cell.raw;
      const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? 'g' : 'gi');
      const updated = currentText.replace(regex, replaceTerm);
      onReplaceCell(current, updated);
    }
  };

  return (
    <div className="fixed top-20 right-8 z-50 w-80 rounded-xl shadow-xl border border-slate-200 bg-white p-4 text-xs select-none text-slate-800 animate-in fade-in zoom-in-95 duration-100">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
        <div className="flex items-center gap-1.5 font-bold text-slate-900">
          <Search className="w-4 h-4 text-blue-600" />
          <span>Find & Replace</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2.5">
        <div>
          <label className="block text-[10px] text-slate-500 mb-1 font-semibold uppercase">Find</label>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentMatchIndex(0);
              }}
              placeholder="Search value or formula..."
              autoFocus
              className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
            />
            <button
              onClick={handlePrev}
              disabled={matches.length === 0}
              className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-30 cursor-pointer text-slate-600"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleNext}
              disabled={matches.length === 0}
              className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-30 cursor-pointer text-slate-600"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[10px] text-slate-500 mb-1 font-semibold uppercase">Replace With</label>
          <input
            type="text"
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            placeholder="New text..."
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={matchCase}
              onChange={(e) => setMatchCase(e.target.checked)}
              className="rounded accent-blue-600"
            />
            <span>Match case</span>
          </label>

          <span>
            {matches.length > 0 ? (
              <>
                {currentMatchIndex + 1} of {matches.length} ({coordToName(matches[currentMatchIndex].row, matches[currentMatchIndex].col)})
              </>
            ) : searchTerm ? (
              '0 matches'
            ) : (
              ''
            )}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={handleReplaceCurrent}
            disabled={matches.length === 0}
            className="flex-1 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer flex items-center justify-center gap-1 text-slate-700 font-medium"
          >
            <Replace className="w-3.5 h-3.5" />
            <span>Replace</span>
          </button>
          <button
            onClick={() => onReplaceAll(searchTerm, replaceTerm)}
            disabled={matches.length === 0}
            className="flex-1 py-1.5 rounded-lg font-bold text-white shadow-xs disabled:opacity-40 transition-colors cursor-pointer bg-blue-600 hover:bg-blue-700"
          >
            Replace All
          </button>
        </div>
      </div>
    </div>
  );
};
