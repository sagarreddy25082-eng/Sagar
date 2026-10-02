import React, { useState } from 'react';
import { Ban, Check } from 'lucide-react';

interface ExcelColorPickerProps {
  title: string;
  type: 'text' | 'fill';
  currentColor?: string;
  onSelectColor: (color: string | undefined) => void;
  onClose: () => void;
}

// All major named colors for the dropdown selector
export const NAMED_COLORS = [
  { name: 'Pure Red', hex: '#ff0000' },
  { name: 'Crimson', hex: '#dc2626' },
  { name: 'Dark Red', hex: '#991b1b' },
  { name: 'Maroon', hex: '#800000' },
  { name: 'Coral / Salmon', hex: '#f87171' },
  { name: 'Orange', hex: '#ff8000' },
  { name: 'Dark Orange', hex: '#ea580c' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Gold', hex: '#ffd700' },
  { name: 'Metallic Gold', hex: '#d4af37' },
  { name: 'Yellow', hex: '#ffff00' },
  { name: 'Light Yellow', hex: '#fef08a' },
  { name: 'Lime Green', hex: '#84cc16' },
  { name: 'Bright Green', hex: '#22c55e' },
  { name: 'Forest Green', hex: '#16a34a' },
  { name: 'Dark Green', hex: '#14532d' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Mint Green', hex: '#6ee7b7' },
  { name: 'Teal', hex: '#0d9488' },
  { name: 'Cyan / Aqua', hex: '#06b6d4' },
  { name: 'Sky Blue', hex: '#0ea5e9' },
  { name: 'Royal Blue', hex: '#2563eb' },
  { name: 'Deep Navy Blue', hex: '#1e3a8a' },
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'Purple', hex: '#9333ea' },
  { name: 'Dark Purple', hex: '#581c87' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Magenta / Fuchsia', hex: '#d946ef' },
  { name: 'Hot Pink', hex: '#ff1493' },
  { name: 'Soft Pink', hex: '#f472b6' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Chocolate Brown', hex: '#7c2d12' },
  { name: 'Saddle Brown', hex: '#854d0e' },
  { name: 'Tan / Khaki', hex: '#d2b48c' },
  { name: 'Pure White', hex: '#ffffff' },
  { name: 'Ivory / Champagne', hex: '#fef5e7' },
  { name: 'Light Gray', hex: '#d1d5db' },
  { name: 'Medium Gray', hex: '#6b7280' },
  { name: 'Dark Gray / Charcoal', hex: '#374151' },
  { name: 'Pure Black', hex: '#000000' },
];

// Full Microsoft Excel 10x6 Theme Colors Matrix
export const EXCEL_THEME_MATRIX = [
  // 10 base columns
  ['#ffffff', '#000000', '#eeece1', '#1f497d', '#4f81bd', '#c0504d', '#9bbb59', '#8064a2', '#4bacc6', '#f79646'],
  // 80% lighter tint
  ['#f2f2f2', '#7f7f7f', '#ddd9c3', '#c6d9f0', '#dbe5f1', '#f2dcdb', '#ebf1dd', '#e5e0ec', '#dbeef3', '#fdeada'],
  // 60% lighter tint
  ['#d8d8d8', '#595959', '#c4bd97', '#8db3e2', '#b8cce4', '#e5b9b7', '#d7e3bc', '#ccc1d9', '#b7dde8', '#fbd5b5'],
  // 40% lighter tint
  ['#bfbfbf', '#3f3f3f', '#938953', '#548dd4', '#95b3d7', '#d99694', '#c3d69b', '#b2a2c7', '#92cddc', '#fac08f'],
  // 25% darker shade
  ['#a5a5a5', '#262626', '#494429', '#17365d', '#366092', '#953734', '#76933c', '#5f497a', '#31859b', '#e36c09'],
  // 50% darker shade
  ['#7f7f7f', '#0c0c0c', '#1d1b10', '#0f243e', '#244062', '#632423', '#4f6128', '#3f3151', '#205867', '#974806'],
];

// Excel Standard Colors
export const EXCEL_STANDARD_COLORS = [
  '#c00000', '#ff0000', '#ffc000', '#ffff00', '#92d050',
  '#00b050', '#00b0f0', '#0070c0', '#002060', '#7030a0'
];

const RECENT_COLORS_KEY = 'sagar_excel_recent_colors';

export const ExcelColorPicker: React.FC<ExcelColorPickerProps> = ({
  type,
  currentColor,
  onSelectColor,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'palette' | 'dropdown' | 'custom'>('palette');

  const [recentColors, setRecentColors] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_COLORS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#dc2626', '#ffffff'];
  });

  const [customHex, setCustomHex] = useState(
    currentColor && currentColor.startsWith('#') && currentColor.length === 7
      ? currentColor
      : '#2563eb'
  );

  const handlePick = (color: string | undefined) => {
    if (color && color !== 'transparent') {
      const updated = [color, ...recentColors.filter((c) => c !== color)].slice(0, 10);
      setRecentColors(updated);
      try {
        localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
    onSelectColor(color);
    onClose();
  };

  return (
    <div
      className="absolute top-full left-0 mt-1.5 w-[270px] p-3 rounded-xl shadow-2xl border border-slate-200 bg-white text-slate-800 z-50 select-none animate-in fade-in duration-100"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header bar: Title & Reset Button */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
          {type === 'fill' ? 'Fill Color' : 'Text Color'}
        </span>
        <button
          type="button"
          onClick={() => handlePick(undefined)}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-100 text-[10px] font-semibold text-slate-600 transition-colors cursor-pointer"
        >
          {type === 'fill' ? (
            <>
              <Ban className="w-2.5 h-2.5 text-rose-500" />
              <span>No Fill</span>
            </>
          ) : (
            <>
              <span>Automatic</span>
            </>
          )}
        </button>
      </div>

      {/* QUICK SELECT DROPDOWN LIST */}
      <div className="mb-2.5">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
          Select Colour From Dropdown:
        </label>
        <select
          value={currentColor && currentColor.startsWith('#') ? currentColor.toLowerCase() : ''}
          onChange={(e) => {
            if (e.target.value) handlePick(e.target.value);
          }}
          className="w-full px-2 py-1 rounded border border-slate-300 bg-slate-50 text-xs font-medium outline-none cursor-pointer text-slate-800 transition-colors"
        >
          <option value="" className="text-slate-500">
            -- Choose a colour from list ({NAMED_COLORS.length} colours) --
          </option>
          {NAMED_COLORS.map((c) => (
            <option key={c.hex} value={c.hex.toLowerCase()}>
              {c.name} ({c.hex})
            </option>
          ))}
        </select>
      </div>

      {/* Visual Navigation Tabs */}
      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 border border-slate-200 mb-2.5 text-[10px] font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('palette')}
          className={`flex-1 py-1 rounded transition-all cursor-pointer text-center ${
            activeTab === 'palette'
              ? 'bg-blue-600 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Excel Grid
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('dropdown')}
          className={`flex-1 py-1 rounded transition-all cursor-pointer text-center ${
            activeTab === 'dropdown'
              ? 'bg-blue-600 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All Colours
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('custom')}
          className={`flex-1 py-1 rounded transition-all cursor-pointer text-center ${
            activeTab === 'custom'
              ? 'bg-blue-600 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Custom
        </button>
      </div>

      {/* TAB 1: EXCEL THEME & STANDARD PALETTE */}
      {activeTab === 'palette' && (
        <div className="space-y-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 px-0.5">
              Theme Colors
            </div>
            {/* 10 Base Colors Header */}
            <div className="grid grid-cols-10 gap-1 mb-1">
              {EXCEL_THEME_MATRIX[0].map((color, colIdx) => {
                const isSelected = currentColor?.toLowerCase() === color.toLowerCase();
                return (
                  <button
                    key={`base-${colIdx}`}
                    type="button"
                    onClick={() => handlePick(color)}
                    title={color}
                    className={`w-[20px] h-[18px] rounded-xs transition-transform cursor-pointer hover:scale-125 hover:z-10 relative border border-slate-300 ${
                      isSelected ? 'ring-2 ring-blue-500 ring-offset-1 z-10' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                );
              })}
            </div>
            {/* 5 Shaded Tints Rows */}
            <div className="space-y-0.5">
              {EXCEL_THEME_MATRIX.slice(1).map((row, rowIdx) => (
                <div key={`shade-row-${rowIdx}`} className="grid grid-cols-10 gap-1">
                  {row.map((color, colIdx) => {
                    const isSelected = currentColor?.toLowerCase() === color.toLowerCase();
                    return (
                      <button
                        key={`shade-${rowIdx}-${colIdx}`}
                        type="button"
                        onClick={() => handlePick(color)}
                        title={color}
                        className={`w-[20px] h-[13px] rounded-xs transition-transform cursor-pointer hover:scale-125 hover:z-10 relative border border-slate-200 ${
                          isSelected ? 'ring-2 ring-blue-500 ring-offset-1 z-10' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 px-0.5">
              Standard Colors
            </div>
            <div className="grid grid-cols-10 gap-1">
              {EXCEL_STANDARD_COLORS.map((color) => {
                const isSelected = currentColor?.toLowerCase() === color.toLowerCase();
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handlePick(color)}
                    title={color}
                    className={`w-[20px] h-[18px] rounded-xs transition-transform cursor-pointer hover:scale-125 hover:z-10 border border-slate-300 ${
                      isSelected ? 'ring-2 ring-blue-500 ring-offset-1 z-10' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ALL NAMED COLOURS GRID */}
      {activeTab === 'dropdown' && (
        <div className="max-h-56 overflow-y-auto pr-1 space-y-1">
          {NAMED_COLORS.map((c) => {
            const isSelected = currentColor?.toLowerCase() === c.hex.toLowerCase();
            return (
              <button
                key={c.hex}
                type="button"
                onClick={() => handlePick(c.hex)}
                className={`w-full flex items-center justify-between px-2 py-1 rounded hover:bg-slate-100 transition-colors cursor-pointer text-xs ${
                  isSelected ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded border border-slate-300 shadow-2xs shrink-0"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span>{c.name}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
                  <span>{c.hex}</span>
                  {isSelected && <Check className="w-3 h-3 text-blue-600 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* TAB 3: CUSTOM SPECTRUM & INPUT */}
      {activeTab === 'custom' && (
        <div className="space-y-3 pt-1">
          {/* Full Rainbow Spectrum Picker Bar */}
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Color Spectrum:
            </div>
            <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:border-slate-300 transition-colors">
              <input
                type="color"
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-slate-300 bg-transparent p-0"
              />
              <div className="flex-1">
                <div className="text-xs font-bold text-slate-800">Click to Open Color Picker</div>
                <div className="text-[10px] text-slate-500 font-mono">Current: {customHex}</div>
              </div>
            </label>
          </div>

          {/* Hex Input & Apply Button */}
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Type or Paste Hex Code:
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
                placeholder="#2563eb"
                className="flex-1 px-2.5 py-1.5 rounded border border-slate-300 font-mono text-xs outline-none text-slate-800 bg-white"
              />
              <button
                type="button"
                onClick={() => handlePick(customHex)}
                className="px-3 py-1.5 rounded font-bold text-xs cursor-pointer hover:bg-blue-700 shadow-xs text-white bg-blue-600"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Recent Colors Strip */}
      {recentColors.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-slate-100">
          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Recent Colours:
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {recentColors.slice(0, 10).map((color, idx) => (
              <button
                key={`recent-${idx}`}
                type="button"
                onClick={() => handlePick(color)}
                title={color}
                className="w-[18px] h-[18px] rounded-xs transition-transform cursor-pointer hover:scale-125 border border-slate-300"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
