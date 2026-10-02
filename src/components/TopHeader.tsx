import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Upload, 
  Check, 
  FileSpreadsheet,
  FileText,
  ChevronDown,
  Layers,
  File,
  Table,
} from 'lucide-react';
import { Sheet, Workbook } from '../types/spreadsheet';

interface TopHeaderProps {
  workbook: Workbook;
  activeSheet: Sheet;
  hasUnsavedChanges: boolean;
  onAddNewSheet: () => void;
  onOpenImportModal: () => void;
  onDownloadExcel: (scope: 'current' | 'all') => void;
  onDownloadPDF: (scope: 'current' | 'all') => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  workbook,
  activeSheet,
  hasUnsavedChanges,
  onAddNewSheet,
  onOpenImportModal,
  onDownloadExcel,
  onDownloadPDF,
}) => {
  const [openMenu, setOpenMenu] = useState<'excel' | 'pdf' | null>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    if (openMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [openMenu]);

  return (
    <header className="relative z-50 flex items-center justify-between px-5 py-2.5 bg-slate-900 border-b border-slate-800 text-white select-none shadow-md">
      {/* Zone 1: Branding & Status Indicator */}
      <div className="flex items-center gap-3">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-400 p-0.5 shadow-md shadow-blue-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-900/40 rounded-[10px] flex items-center justify-center backdrop-blur-xs">
              <Table className="w-4 h-4 text-white stroke-[2.5]" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <h1 className="text-lg font-black tracking-wider text-white select-none">
              SAGAR
            </h1>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.2 rounded">
              Sheets
            </span>
          </div>
        </div>

        {/* Separator Pipe */}
        <div className="h-4 w-px bg-slate-800" />

        {/* Auto-Saved Status */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] font-medium text-slate-300">
          {hasUnsavedChanges ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-300">Saving...</span>
            </>
          ) : (
            <>
              <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
              <span className="text-slate-300">Saved</span>
            </>
          )}
        </div>
      </div>

      {/* Zone 2: Sheet Navigation & Controls */}
      <nav className="flex items-center gap-2 text-xs font-semibold">
        {/* Total Sheets Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/70 border border-slate-700/60 text-slate-300 text-xs">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>{workbook.sheets.length} {workbook.sheets.length === 1 ? 'Sheet' : 'Sheets'}</span>
        </div>

        {/* Add New Page Button */}
        <button
          onClick={onAddNewSheet}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer text-slate-100 hover:text-white"
          title="Add a new blank sheet page"
        >
          <Plus className="w-3.5 h-3.5 text-blue-400" />
          <span>New Sheet</span>
        </button>

        {/* Import CSV */}
        <button
          onClick={onOpenImportModal}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer text-slate-100 hover:text-white"
          title="Import CSV data into sheet"
        >
          <Upload className="w-3.5 h-3.5 text-blue-400" />
          <span>Import CSV</span>
        </button>
      </nav>

      {/* Zone 3: Download Section (Single Sheet or All Sheets for Excel and PDF) */}
      <div className="flex items-center gap-2 relative" ref={menuContainerRef}>
        {/* Excel Button & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'excel' ? null : 'excel')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
              openMenu === 'excel'
                ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
            title="Download Excel: choose single sheet or all sheets"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Excel</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${openMenu === 'excel' ? 'rotate-180' : ''}`} />
          </button>

          {/* Excel Dropdown: Single Sheet or All Sheets */}
          {openMenu === 'excel' && (
            <div className="absolute right-0 top-9 z-50 w-64 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl p-1.5 text-slate-100 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800 mb-1 flex items-center justify-between">
                <span>Download Excel (.xlsx)</span>
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              </div>

              {/* Option 1: Single Sheet (Active Sheet) */}
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(null);
                  onDownloadExcel('current');
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 flex items-start gap-2.5 text-xs transition-colors cursor-pointer group"
              >
                <File className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white group-hover:text-blue-300">
                    Single Sheet: "{activeSheet.name}"
                  </div>
                  <div className="text-[10px] text-slate-400 leading-tight">
                    Exports only the currently active sheet
                  </div>
                </div>
              </button>

              {/* Option 2: All Sheets */}
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(null);
                  onDownloadExcel('all');
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 flex items-start gap-2.5 text-xs transition-colors cursor-pointer group mt-0.5"
              >
                <Layers className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white group-hover:text-blue-300">
                    All Sheets ({workbook.sheets.length} {workbook.sheets.length === 1 ? 'Sheet' : 'Sheets'})
                  </div>
                  <div className="text-[10px] text-slate-400 leading-tight">
                    Exports full workbook with normal tabs
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* PDF Button & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'pdf' ? null : 'pdf')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
              openMenu === 'pdf'
                ? 'bg-rose-700 text-white ring-2 ring-rose-400'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
            title="Download PDF: choose single sheet or all sheets"
          >
            <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>PDF</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${openMenu === 'pdf' ? 'rotate-180' : ''}`} />
          </button>

          {/* PDF Dropdown: Single Sheet or All Sheets */}
          {openMenu === 'pdf' && (
            <div className="absolute right-0 top-9 z-50 w-64 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl p-1.5 text-slate-100 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-rose-300/80 border-b border-slate-800 mb-1 flex items-center justify-between">
                <span>Download PDF (.pdf)</span>
                <FileText className="w-3.5 h-3.5 text-rose-400" />
              </div>

              {/* Option 1: Single Sheet (Active Sheet) */}
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(null);
                  onDownloadPDF('current');
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 flex items-start gap-2.5 text-xs transition-colors cursor-pointer group"
              >
                <File className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white group-hover:text-rose-200">
                    Single Sheet: "{activeSheet.name}"
                  </div>
                  <div className="text-[10px] text-slate-400 leading-tight">
                    Exports active sheet as clean document
                  </div>
                </div>
              </button>

              {/* Option 2: All Sheets */}
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(null);
                  onDownloadPDF('all');
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 flex items-start gap-2.5 text-xs transition-colors cursor-pointer group mt-0.5"
              >
                <Layers className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white group-hover:text-rose-200">
                    All Sheets ({workbook.sheets.length} {workbook.sheets.length === 1 ? 'Sheet' : 'Sheets'})
                  </div>
                  <div className="text-[10px] text-slate-400 leading-tight">
                    Multi-page PDF report
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
