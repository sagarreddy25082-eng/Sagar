import React from 'react';
import { X, HelpCircle, Code, Keyboard } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div
        className="w-full max-w-2xl max-h-[85vh] rounded-xl shadow-2xl border overflow-hidden flex flex-col transition-all"
        style={{
          backgroundColor: theme.bgToolbar,
          borderColor: theme.borderGrid,
          color: theme.textPrimary,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b"
          style={{ borderColor: theme.borderGrid }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: theme.accentColor }}
            >
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Formulas & Keyboard Shortcuts</h3>
              <p className="text-[11px] text-slate-400">Complete reference guide for Excel operations in ApexSheet</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-6 text-xs">
          {/* Supported Formula Functions */}
          <div>
            <div className="flex items-center gap-2 font-bold mb-3 text-slate-900 dark:text-slate-100">
              <Code className="w-4 h-4 text-emerald-600" />
              <span>Supported Formulas & Syntax</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 font-mono text-[11px]">
              {[
                { name: '=SUM(A1:A10)', desc: 'Adds all numeric values in a specified range' },
                { name: '=AVERAGE(B1:B10)', desc: 'Returns arithmetic mean of numbers' },
                { name: '=COUNT(C1:C10)', desc: 'Counts cells containing numerical figures' },
                { name: '=COUNTA(A1:A10)', desc: 'Counts non-empty cells with text or data' },
                { name: '=MIN(A1:A10)', desc: 'Finds the lowest number in the range' },
                { name: '=MAX(A1:A10)', desc: 'Finds the highest number in the range' },
                { name: '=IF(A1>50, "Pass", "Fail")', desc: 'Conditional test returning branch results' },
                { name: '=CONCAT(A1, " ", B1)', desc: 'Joins two or more text values together' },
                { name: '=ROUND(A1, 2)', desc: 'Rounds number to specified decimal places' },
                { name: '=ABS(A1)', desc: 'Calculates the absolute non-negative value' },
                { name: '=SQRT(A1)', desc: 'Computes positive square root of a number' },
                { name: '=POWER(A1, 3)', desc: 'Raises base number to given exponent power' },
                { name: '=UPPER(A1) / LOWER(A1)', desc: 'Converts text case to uppercase or lowercase' },
                { name: '=TODAY() / NOW()', desc: 'Outputs current date or local system time' },
                { name: '=A1 * B1 - C1', desc: 'Full arithmetic formulas (+, -, *, /, parens)' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg border bg-black/2 dark:bg-white/2"
                  style={{ borderColor: theme.borderGrid }}
                >
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold">{item.name}</div>
                  <div className="font-sans text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <div className="flex items-center gap-2 font-bold mb-3 text-slate-900 dark:text-slate-100">
              <Keyboard className="w-4 h-4 text-emerald-600" />
              <span>Keyboard Shortcuts</span>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {[
                { key: 'Arrow Keys', action: 'Navigate between cells' },
                { key: 'Enter', action: 'Move to cell below / Commit editing' },
                { key: 'Shift + Enter', action: 'Move to cell above' },
                { key: 'Tab', action: 'Move to cell right' },
                { key: 'Shift + Tab', action: 'Move to cell left' },
                { key: 'F2', action: 'Enter inline cell edit mode' },
                { key: 'Esc', action: 'Cancel editing without saving' },
                { key: 'Delete / Backspace', action: 'Clear contents of selected cell(s)' },
                { key: 'Shift + Click', action: 'Expand rectangular range selection' },
                { key: 'Ctrl / ⌘ + C', action: 'Copy selected cell value & style' },
                { key: 'Ctrl / ⌘ + V', action: 'Paste copied data into target cell' },
                { key: 'Ctrl / ⌘ + X', action: 'Cut selected cell' },
                { key: 'Ctrl / ⌘ + Z', action: 'Undo last change' },
                { key: 'Ctrl / ⌘ + Y', action: 'Redo previously undone change' },
                { key: 'Ctrl / ⌘ + B', action: 'Toggle Bold format' },
                { key: 'Ctrl / ⌘ + I', action: 'Toggle Italic format' },
                { key: 'Ctrl / ⌘ + U', action: 'Toggle Underline format' },
                { key: 'Ctrl / ⌘ + F', action: 'Open Find & Replace modal' },
              ].map((s, idx) => (
                <div key={idx} className="flex items-center justify-between py-1 border-b border-dashed border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">{s.action}</span>
                  <kbd className="px-1.5 py-0.5 rounded border font-mono text-[10px] bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-semibold shadow-xs">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end px-5 py-3 border-t bg-black/2 dark:bg-white/2"
          style={{ borderColor: theme.borderGrid }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg shadow-sm cursor-pointer"
            style={{ backgroundColor: theme.accentColor }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
