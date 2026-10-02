import React, { useRef, useEffect } from 'react';
import { FunctionSquare, Check, X } from 'lucide-react';
import { CellCoord, CellData } from '../types/spreadsheet';
import { colIndexToLetter } from '../utils/columnUtils';

interface FormulaBarProps {
  activeCoord: CellCoord;
  activeCell?: CellData;
  isEditing: boolean;
  editValue: string;
  onChangeEditValue: (val: string) => void;
  onCommitEdit: (direction?: 'down' | 'right' | 'none', overrideVal?: string) => void;
  onCancelEdit: () => void;
  onStartEditing: (coord: CellCoord) => void;
}

export const FormulaBar: React.FC<FormulaBarProps> = ({
  activeCoord,
  activeCell,
  isEditing,
  editValue,
  onChangeEditValue,
  onCommitEdit,
  onCancelEdit,
  onStartEditing,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const cellName = `${colIndexToLetter(activeCoord.col)}${activeCoord.row + 1}`;
  const cellRaw = activeCell?.raw ?? '';
  const displayValue = isEditing ? editValue : cellRaw;

  // Auto focus formula input if editing is triggered
  useEffect(() => {
    if (isEditing && inputRef.current && document.activeElement === inputRef.current) {
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEditing) {
      onStartEditing(activeCoord);
    }
    onChangeEditValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onCommitEdit('down', editValue);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancelEdit();
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white border-b border-slate-200 text-xs select-none shadow-xs">
      {/* Cell Coordinate Box (e.g. A1, B2) */}
      <div 
        className="w-16 h-7 px-2 flex items-center justify-center font-mono font-bold text-slate-800 bg-slate-100 border border-slate-300 rounded-md text-xs tracking-wider select-none shrink-0"
        title={`Active Cell: Column ${colIndexToLetter(activeCoord.col)}, Row ${activeCoord.row + 1}`}
      >
        {cellName}
      </div>

      {/* Function / Formula Action Icons */}
      <div className="flex items-center gap-1 shrink-0">
        {isEditing ? (
          <>
            <button
              type="button"
              onClick={() => onCancelEdit()}
              title="Cancel (Esc)"
              className="p-1 rounded hover:bg-rose-50 text-rose-500 cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={() => onCommitEdit('none', editValue)}
              title="Enter / Commit (Enter)"
              className="p-1 rounded hover:bg-emerald-50 text-emerald-600 cursor-pointer transition-colors"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </>
        ) : null}

        <div className="flex items-center justify-center w-7 h-7 rounded text-blue-600 font-serif italic font-bold text-sm select-none" title="Formula">
          <FunctionSquare className="w-4 h-4 text-blue-600" />
        </div>
      </div>

      {/* Formula & Text Live Editor Input Bar */}
      <div className="flex-1 relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (!isEditing) {
              onStartEditing(activeCoord);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Enter text, numbers, or formula (e.g. =SUM(A1:A10), =AVERAGE, =A1*1.2)..."
          className="w-full h-7 px-2.5 font-mono text-xs text-slate-900 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-md outline-none transition-all placeholder:font-sans placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  );
};
