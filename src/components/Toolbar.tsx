import React, { useState, useRef } from 'react';
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  DollarSign,
  Percent,
  Hash,
  Search,
  BarChart3,
  Trash2,
  Copy,
  Scissors,
  Clipboard,
  Plus,
  PaintBucket,
  Palette,
  ChevronDown,
  ArrowLeftRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Files,
  Filter,
} from 'lucide-react';
import { CellAlign, CellCoord, CellFormat, CellStyle } from '../types/spreadsheet';
import { ExcelColorPicker, NAMED_COLORS } from './ExcelColorPicker';
import { colIndexToLetter } from '../utils/columnUtils';
import { AutoFilterCriteria } from '../utils/filterUtils';

interface ToolbarProps {
  currentStyle: CellStyle;
  onApplyStyle: (stylePatch: Partial<CellStyle>) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onClearCells: () => void;
  onInsertRow: (direction: 'above' | 'below') => void;
  onDeleteRow: () => void;
  onInsertCol: (direction: 'left' | 'right') => void;
  onDeleteCol: () => void;
  onOpenSearch: () => void;
  onOpenChart: () => void;
  onOpenFilter?: () => void;
  activeFilter?: AutoFilterCriteria | null;
  hiddenRowCount?: number;
  onAddRowsBatch: (count: number) => void;
  onAddColsBatch: (count: number) => void;
  activeCoord?: CellCoord;
  onCopyRow?: () => void;
  onDuplicateRow?: () => void;
  onMoveRow?: (direction: 'up' | 'down') => void;
  onCopyCol?: () => void;
  onDuplicateCol?: () => void;
  onMoveCol?: (direction: 'left' | 'right') => void;
}

export const FILL_OPTIONS = [
  { name: 'No Fill (Transparent)', hex: '' },
  { name: 'Ice Blue Tint', hex: '#eff6ff' },
  { name: 'Light Sky Blue', hex: '#dbeafe' },
  { name: 'Soft Blue', hex: '#bfdbfe' },
  { name: 'Royal Blue Tint', hex: 'rgba(37, 99, 235, 0.15)' },
  { name: 'Royal Blue', hex: '#2563eb' },
  { name: 'Deep Navy Blue', hex: '#1e3a8a' },
  { name: 'Midnight Navy', hex: '#0f172a' },
  { name: 'Light Yellow', hex: '#fef08a' },
  { name: 'Bright Yellow', hex: '#ffff00' },
  { name: 'Gold', hex: '#ffd700' },
  { name: 'Light Green', hex: '#bbf7d0' },
  { name: 'Bright Green', hex: '#22c55e' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Dark Green', hex: '#15803d' },
  { name: 'Cyan / Aqua', hex: '#06b6d4' },
  { name: 'Teal', hex: '#0d9488' },
  { name: 'Light Red', hex: '#fecaca' },
  { name: 'Pure Red', hex: '#ff0000' },
  { name: 'Crimson Red', hex: '#dc2626' },
  { name: 'Light Orange', hex: '#ffedd5' },
  { name: 'Pure Orange', hex: '#ff8000' },
  { name: 'Light Purple', hex: '#e9d5ff' },
  { name: 'Purple', hex: '#9333ea' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Light Pink', hex: '#fbcfe8' },
  { name: 'Hot Pink', hex: '#ff1493' },
  { name: 'Pure White', hex: '#ffffff' },
  { name: 'Light Gray', hex: '#e5e7eb' },
  { name: 'Medium Gray', hex: '#9ca3af' },
  { name: 'Dark Charcoal', hex: '#374151' },
  { name: 'Pure Black', hex: '#000000' },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  currentStyle,
  onApplyStyle,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onCut,
  onCopy,
  onPaste,
  onClearCells,
  onInsertRow,
  onInsertCol,
  onOpenSearch,
  onOpenChart,
  onOpenFilter,
  activeFilter,
  hiddenRowCount = 0,
  activeCoord = { row: 0, col: 0 },
  onCopyRow,
  onDuplicateRow,
  onMoveRow,
  onCopyCol,
  onDuplicateCol,
  onMoveCol,
}) => {
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [showMoveCopyMenu, setShowMoveCopyMenu] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const textColorRef = useRef<HTMLDivElement>(null);
  const bgColorRef = useRef<HTMLDivElement>(null);
  const moveCopyRef = useRef<HTMLDivElement>(null);

  const activeTextColor = currentStyle.textColor || '#0f172a';
  const activeBgColor = currentStyle.bgColor || 'transparent';

  const curRow = activeCoord.row;
  const curCol = activeCoord.col;
  const colLetter = colIndexToLetter(curCol);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 2000);
  };

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-slate-700 select-none text-xs transition-colors relative z-40 overflow-visible shadow-xs">
      {/* Transparent backdrop when a color popup or move/copy popup is open */}
      {(showTextColorPicker || showBgColorPicker || showMoveCopyMenu) && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => {
            setShowTextColorPicker(false);
            setShowBgColorPicker(false);
            setShowMoveCopyMenu(false);
          }}
        />
      )}

      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-200">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className={`p-1 rounded-md hover:bg-slate-200/80 transition-colors cursor-pointer ${
            !canUndo ? 'opacity-30 cursor-not-allowed' : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className={`p-1 rounded-md hover:bg-slate-200/80 transition-colors cursor-pointer ${
            !canRedo ? 'opacity-30 cursor-not-allowed' : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Clipboard */}
      <div className="flex items-center gap-0.5 px-1.5 border-r border-slate-200">
        <button
          onClick={onCut}
          title="Cut (Ctrl+X)"
          className="p-1 rounded-md hover:bg-slate-200/80 transition-colors cursor-pointer text-slate-700 hover:text-slate-900"
        >
          <Scissors className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onCopy}
          title="Copy (Ctrl+C)"
          className="p-1 rounded-md hover:bg-slate-200/80 transition-colors cursor-pointer text-slate-700 hover:text-slate-900"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onPaste}
          title="Paste (Ctrl+V)"
          className="p-1 rounded-md hover:bg-slate-200/80 transition-colors cursor-pointer text-slate-700 hover:text-slate-900"
        >
          <Clipboard className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Font Styling */}
      <div className="flex items-center gap-1 px-1.5 border-r border-slate-200">
        {/* Font size */}
        <select
          value={currentStyle.fontSize || 13}
          onChange={(e) => onApplyStyle({ fontSize: parseInt(e.target.value, 10) })}
          className="h-6 px-1.5 rounded border border-slate-300 bg-white text-slate-800 outline-none cursor-pointer text-xs font-medium"
          title="Font Size"
        >
          {[10, 11, 12, 13, 14, 16, 18, 20, 24].map((size) => (
            <option key={size} value={size}>
              {size}px
            </option>
          ))}
        </select>

        <button
          onClick={() => onApplyStyle({ bold: !currentStyle.bold })}
          title="Bold (Ctrl+B)"
          className={`p-1 rounded-md transition-all cursor-pointer ${
            currentStyle.bold 
              ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300 font-bold' 
              : 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
          }`}
        >
          <Bold className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onApplyStyle({ italic: !currentStyle.italic })}
          title="Italic (Ctrl+I)"
          className={`p-1 rounded-md transition-all cursor-pointer ${
            currentStyle.italic 
              ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300 font-bold' 
              : 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
          }`}
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onApplyStyle({ underline: !currentStyle.underline })}
          title="Underline (Ctrl+U)"
          className={`p-1 rounded-md transition-all cursor-pointer ${
            currentStyle.underline 
              ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300 font-bold' 
              : 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
          }`}
        >
          <Underline className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onApplyStyle({ strikethrough: !currentStyle.strikethrough })}
          title="Strikethrough"
          className={`p-1 rounded-md transition-all cursor-pointer ${
            currentStyle.strikethrough 
              ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300 font-bold' 
              : 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
          }`}
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* TEXT COLOUR DROPDOWN SECTION */}
      <div className="flex items-center gap-1 px-1.5 border-r border-slate-200 relative" ref={textColorRef}>
        <span className="font-semibold text-[11px] text-slate-600 shrink-0">Text:</span>
        
        {/* Direct HTML Dropdown for selecting any colour by name */}
        <select
          value={currentStyle.textColor && currentStyle.textColor.startsWith('#') ? currentStyle.textColor.toLowerCase() : ''}
          onChange={(e) => onApplyStyle({ textColor: e.target.value ? e.target.value : undefined })}
          title="Select Text Colour from dropdown"
          className="h-6 px-1.5 rounded border border-slate-300 bg-white text-xs font-semibold cursor-pointer outline-none transition-all max-w-[100px]"
          style={{ color: activeTextColor }}
        >
          <option value="" className="text-slate-900">Default</option>
          {NAMED_COLORS.map((c) => (
            <option key={c.hex} value={c.hex.toLowerCase()}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Visual Palette & Spectrum Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowTextColorPicker(!showTextColorPicker);
            setShowBgColorPicker(false);
            setShowMoveCopyMenu(false);
          }}
          title="Open Text Color Palette"
          className={`p-1 rounded-md border border-slate-300 bg-white hover:bg-slate-100 transition-all cursor-pointer ${
            showTextColorPicker ? 'ring-2 ring-blue-500 bg-blue-50' : ''
          }`}
        >
          <div className="flex flex-col items-center">
            <Palette className="w-3.5 h-3.5 text-slate-700" />
            <div 
              className="w-3.5 h-1 rounded-xs mt-0.5" 
              style={{ backgroundColor: activeTextColor }} 
            />
          </div>
        </button>

        {showTextColorPicker && (
          <ExcelColorPicker
            title="Text Colour"
            type="text"
            currentColor={currentStyle.textColor}
            onSelectColor={(color) => onApplyStyle({ textColor: color })}
            onClose={() => setShowTextColorPicker(false)}
          />
        )}
      </div>

      {/* FILL COLOUR DROPDOWN SECTION */}
      <div className="flex items-center gap-1 px-1.5 border-r border-slate-200 relative" ref={bgColorRef}>
        <span className="font-semibold text-[11px] text-slate-600 shrink-0">Fill:</span>
        
        {/* Direct HTML Dropdown for selecting fill colour by name */}
        <select
          value={currentStyle.bgColor || ''}
          onChange={(e) => onApplyStyle({ bgColor: e.target.value ? e.target.value : undefined })}
          title="Select Fill Colour from dropdown"
          className="h-6 px-1.5 rounded border border-slate-300 bg-white text-xs font-semibold cursor-pointer outline-none transition-all max-w-[100px]"
        >
          {FILL_OPTIONS.map((f) => (
            <option key={f.name} value={f.hex}>
              {f.name}
            </option>
          ))}
        </select>

        {/* Visual Palette & Spectrum Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowBgColorPicker(!showBgColorPicker);
            setShowTextColorPicker(false);
            setShowMoveCopyMenu(false);
          }}
          title="Open Fill Color Palette"
          className={`p-1 rounded-md border border-slate-300 bg-white hover:bg-slate-100 transition-all cursor-pointer ${
            showBgColorPicker ? 'ring-2 ring-blue-500 bg-blue-50' : ''
          }`}
        >
          <div className="flex flex-col items-center">
            <PaintBucket className="w-3.5 h-3.5 text-slate-700" />
            <div 
              className="w-3.5 h-1 rounded-xs mt-0.5 border border-slate-300" 
              style={{ backgroundColor: activeBgColor === 'transparent' ? '#ffffff' : activeBgColor }} 
            />
          </div>
        </button>

        {showBgColorPicker && (
          <ExcelColorPicker
            title="Fill Colour"
            type="fill"
            currentColor={currentStyle.bgColor}
            onSelectColor={(color) => onApplyStyle({ bgColor: color })}
            onClose={() => setShowBgColorPicker(false)}
          />
        )}
      </div>

      {/* Alignment */}
      <div className="flex items-center gap-0.5 px-1.5 border-r border-slate-200">
        {(['left', 'center', 'right'] as CellAlign[]).map((align) => {
          const isActive = (currentStyle.align || 'left') === align;
          const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight;
          return (
            <button
              key={align}
              onClick={() => onApplyStyle({ align })}
              title={`Align ${align}`}
              className={`p-1 rounded-md transition-all cursor-pointer ${
                isActive 
                  ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300 font-bold' 
                  : 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          );
        })}
      </div>

      {/* Number Formatting */}
      <div className="flex items-center gap-1 px-1.5 border-r border-slate-200">
        <button
          onClick={() => onApplyStyle({ format: currentStyle.format === 'currency' ? 'general' : 'currency' })}
          title="Format as Currency ($)"
          className={`p-1 rounded-md transition-all cursor-pointer ${
            currentStyle.format === 'currency' 
              ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300 font-bold' 
              : 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onApplyStyle({ format: currentStyle.format === 'percent' ? 'general' : 'percent' })}
          title="Format as Percentage (%)"
          className={`p-1 rounded-md transition-all cursor-pointer ${
            currentStyle.format === 'percent' 
              ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300 font-bold' 
              : 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
          }`}
        >
          <Percent className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onApplyStyle({ format: currentStyle.format === 'number' ? 'general' : 'number' })}
          title="Format as Decimal (0.00)"
          className={`p-1 rounded-md transition-all cursor-pointer ${
            currentStyle.format === 'number' 
              ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300 font-bold' 
              : 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
          }`}
        >
          <Hash className="w-3.5 h-3.5" />
        </button>

        <select
          value={currentStyle.format || 'general'}
          onChange={(e) => onApplyStyle({ format: e.target.value as CellFormat })}
          className="h-6 px-1.5 rounded border border-slate-300 bg-white text-slate-800 outline-none cursor-pointer text-xs"
          title="Number format"
        >
          <option value="general">General</option>
          <option value="currency">Currency ($)</option>
          <option value="percent">Percentage (%)</option>
          <option value="number">Decimal (0.00)</option>
          <option value="integer">Integer (0)</option>
          <option value="date">Date (YYYY-MM-DD)</option>
        </select>
      </div>

      {/* Row & Column Operations (+Row, +Column, and Move / Copy) */}
      <div className="flex items-center gap-1.5 px-1.5 border-r border-slate-200">
        <button
          onClick={() => onInsertRow('below')}
          title="Insert 1 Row Below"
          className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap text-[11px] font-semibold text-slate-700 shadow-2xs"
        >
          <Plus className="w-3 h-3 text-blue-600" />
          <span>Row</span>
        </button>

        <button
          onClick={() => onInsertCol('right')}
          title="Insert 1 Column to the right"
          className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap text-[11px] font-semibold text-slate-700 shadow-2xs"
        >
          <Plus className="w-3 h-3 text-blue-600" />
          <span>Column</span>
        </button>

        {/* Move & Copy Dropdown for Rows and Columns */}
        <div className="relative" ref={moveCopyRef}>
          <button
            onClick={() => {
              setShowMoveCopyMenu(!showMoveCopyMenu);
              setShowTextColorPicker(false);
              setShowBgColorPicker(false);
            }}
            title="Move or Copy Rows and Columns"
            className={`px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap text-[11px] font-semibold text-slate-700 shadow-2xs ${
              showMoveCopyMenu ? 'ring-1 ring-blue-500 bg-blue-50' : ''
            }`}
          >
            <ArrowLeftRight className="w-3 h-3 text-blue-600" />
            <span>Move/Copy</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showMoveCopyMenu && (
            <div
              className="absolute left-0 mt-1.5 w-60 rounded-xl shadow-xl border border-slate-200 bg-white p-2 z-50 text-xs text-slate-800 animate-in fade-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Row Operations Header */}
              <div className="px-2 py-1 font-bold text-[10px] uppercase tracking-wider text-slate-400 flex items-center justify-between border-b border-slate-100 pb-1 mb-1">
                <span>Row {curRow + 1} Actions</span>
                <span className="text-[9px] text-slate-400 font-normal">Active Row</span>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  onCopyRow?.();
                  showFeedback(`Copied Row ${curRow + 1}`);
                  setShowMoveCopyMenu(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 flex items-center gap-2 cursor-pointer text-slate-700 text-xs"
              >
                <Copy className="w-3.5 h-3.5 text-blue-600" />
                <span>Copy Row {curRow + 1}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onDuplicateRow?.();
                  showFeedback(`Duplicated Row ${curRow + 1}`);
                  setShowMoveCopyMenu(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 flex items-center gap-2 cursor-pointer text-slate-700 text-xs"
              >
                <Files className="w-3.5 h-3.5 text-blue-600" />
                <span>Duplicate Row Below</span>
              </button>

              <div className="flex items-center gap-1.5 px-1 py-1">
                <button
                  type="button"
                  onClick={() => onMoveRow?.('up')}
                  disabled={curRow <= 0}
                  className="flex-1 py-1 px-2 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-700 cursor-pointer"
                >
                  <ArrowUp className="w-3 h-3 text-slate-600" />
                  <span>Move Up</span>
                </button>
                <button
                  type="button"
                  onClick={() => onMoveRow?.('down')}
                  className="flex-1 py-1 px-2 rounded border border-slate-200 hover:bg-slate-100 flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-700 cursor-pointer"
                >
                  <ArrowDown className="w-3 h-3 text-slate-600" />
                  <span>Move Down</span>
                </button>
              </div>

              {/* Column Operations Header */}
              <div className="px-2 py-1 font-bold text-[10px] uppercase tracking-wider text-slate-400 flex items-center justify-between border-b border-t border-slate-100 pt-1.5 pb-1 my-1">
                <span>Column {colLetter} Actions</span>
                <span className="text-[9px] text-slate-400 font-normal">Active Col</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  onCopyCol?.();
                  showFeedback(`Copied Column ${colLetter}`);
                  setShowMoveCopyMenu(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 flex items-center gap-2 cursor-pointer text-slate-700 text-xs"
              >
                <Copy className="w-3.5 h-3.5 text-blue-600" />
                <span>Copy Column {colLetter}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onDuplicateCol?.();
                  showFeedback(`Duplicated Column ${colLetter}`);
                  setShowMoveCopyMenu(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 flex items-center gap-2 cursor-pointer text-slate-700 text-xs"
              >
                <Files className="w-3.5 h-3.5 text-blue-600" />
                <span>Duplicate Column Right</span>
              </button>

              <div className="flex items-center gap-1.5 px-1 py-1">
                <button
                  type="button"
                  onClick={() => onMoveCol?.('left')}
                  disabled={curCol <= 0}
                  className="flex-1 py-1 px-2 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-700 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3 text-slate-600" />
                  <span>Move Left</span>
                </button>
                <button
                  type="button"
                  onClick={() => onMoveCol?.('right')}
                  className="flex-1 py-1 px-2 rounded border border-slate-200 hover:bg-slate-100 flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-700 cursor-pointer"
                >
                  <ArrowRight className="w-3 h-3 text-slate-600" />
                  <span>Move Right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Toast Notification */}
      {feedbackMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-3.5 py-2 rounded-xl border border-blue-600 bg-slate-900 text-white shadow-2xl font-semibold text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
          ✓ {feedbackMsg}
        </div>
      )}

      {/* Utilities: Filter, Search, Chart & Clear */}
      <div className="flex items-center gap-1 pl-1">
        {/* Auto-Filter Button */}
        <button
          onClick={onOpenFilter}
          title={
            activeFilter
              ? `Auto-Filter: Active on Col ${colIndexToLetter(activeFilter.col)} (${hiddenRowCount} rows hidden)`
              : 'Auto-Filter: Hide rows that do not match criteria'
          }
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
            activeFilter
              ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-400 font-bold shadow-2xs'
              : 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
          }`}
        >
          <Filter className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-[11px] font-semibold hidden md:inline">
            {activeFilter ? `Filter: Col ${colIndexToLetter(activeFilter.col)}` : 'Filter'}
          </span>
          {activeFilter && (
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          )}
        </button>

        <button
          onClick={onOpenSearch}
          title="Find and Replace (Ctrl+F)"
          className="p-1 rounded-md hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOpenChart}
          title="Visualize Data Chart"
          className="p-1 rounded-md hover:bg-slate-200/80 text-blue-600 transition-colors cursor-pointer"
        >
          <BarChart3 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onClearCells}
          title="Clear selected cells (Delete)"
          className="p-1 rounded-md hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
