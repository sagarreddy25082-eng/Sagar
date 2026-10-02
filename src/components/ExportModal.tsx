import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  Settings2, 
  Check, 
  Printer, 
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { Sheet, Workbook } from '../types/spreadsheet';
import { 
  exportToExcel, 
  exportToPDF, 
  getPopulatedBounds, 
  PDFExportOptions 
} from '../utils/exportUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  workbook: Workbook;
  activeSheet: Sheet;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  workbook,
  activeSheet,
}) => {
  const [format, setFormat] = useState<'excel' | 'pdf'>('excel');
  const [scope, setScope] = useState<'all' | 'current'>('all');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [pdfTheme, setPdfTheme] = useState<'simple' | 'clean' | 'emerald' | 'dark' | 'navy' | 'paper'>('simple');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const populated = getPopulatedBounds(activeSheet);

  const handleExecuteExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        if (format === 'excel') {
          exportToExcel(workbook, scope, activeSheet);
        } else {
          const pdfOptions: PDFExportOptions = {
            orientation,
            pageSize,
            includeHeaderDetails: includeHeaders,
            themeStyle: pdfTheme,
            scope,
          };
          exportToPDF(workbook, activeSheet, pdfOptions);
        }
        setIsExporting(false);
        onClose();
      } catch (err) {
        console.error('Export failed:', err);
        setIsExporting(false);
      }
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 bg-white overflow-hidden flex flex-col text-slate-800 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Download className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Export & Download</h3>
              <p className="text-[11px] text-slate-500">Choose between Microsoft Excel (.xlsx) or printable PDF</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Format Selector: Excel vs PDF */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Download Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Option 1: Microsoft Excel */}
              <button
                type="button"
                onClick={() => setFormat('excel')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  format === 'excel'
                    ? 'ring-2 ring-emerald-500 bg-emerald-50/40 border-emerald-500'
                    : 'border-slate-200 hover:bg-slate-50 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  {format === 'excel' && <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />}
                </div>
                <div className="font-bold text-xs text-slate-900 mt-1">Excel Workbook (.xlsx)</div>
                <div className="text-[10px] text-slate-500 leading-tight">
                  Standard Excel spreadsheet with separate worksheet tabs
                </div>
              </button>

              {/* Option 2: PDF Document */}
              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  format === 'pdf'
                    ? 'ring-2 ring-rose-500 bg-rose-50/40 border-rose-500'
                    : 'border-slate-200 hover:bg-slate-50 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <FileText className="w-5 h-5 text-rose-600" />
                  {format === 'pdf' && <Check className="w-4 h-4 text-rose-600 stroke-[3]" />}
                </div>
                <div className="font-bold text-xs text-slate-900 mt-1">PDF Document (.pdf)</div>
                <div className="text-[10px] text-slate-500 leading-tight">
                  Clean, printable document report
                </div>
              </button>
            </div>
          </div>

          {/* Scope (All Pages vs Current Page) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Sheets to Include
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <label
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                  scope === 'all' ? 'bg-blue-50/50 border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="scope"
                  checked={scope === 'all'}
                  onChange={() => setScope('all')}
                  className="accent-blue-600 mt-0.5"
                />
                <div>
                  <div className="font-bold flex items-center gap-1.5 text-slate-900 text-xs">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>All Sheets ({workbook.sheets.length})</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                    {workbook.sheets.length > 1
                      ? `Exports all ${workbook.sheets.length} sheets as regular tabs`
                      : 'Exports full active sheet'}
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                  scope === 'current' ? 'bg-blue-50/50 border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="scope"
                  checked={scope === 'current'}
                  onChange={() => setScope('current')}
                  className="accent-blue-600 mt-0.5"
                />
                <div>
                  <div className="font-bold text-slate-900 text-xs">
                    Current Sheet ({activeSheet.name})
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                    Exports only {activeSheet.name} ({populated.maxRow + 1} rows)
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* PDF-Specific Options */}
          {format === 'pdf' && (
            <div className="space-y-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
                <Settings2 className="w-3.5 h-3.5 text-blue-600" />
                <span>PDF Layout Settings</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Orientation */}
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Page Orientation</label>
                  <select
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value as 'portrait' | 'landscape')}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 outline-none cursor-pointer text-xs"
                  >
                    <option value="landscape">Landscape (Recommended)</option>
                    <option value="portrait">Portrait</option>
                  </select>
                </div>

                {/* Paper Size */}
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Paper Size</label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value as 'a4' | 'letter')}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 outline-none cursor-pointer text-xs"
                  >
                    <option value="a4">A4 (210 × 297 mm)</option>
                    <option value="letter">US Letter (8.5 × 11 in)</option>
                  </select>
                </div>
              </div>

              {/* Theme Style */}
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Theme Style</label>
                <select
                  value={pdfTheme}
                  onChange={(e) => setPdfTheme(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 outline-none cursor-pointer text-xs"
                >
                  <option value="simple">Simple (Clean Black & White - Best Visibility)</option>
                  <option value="clean">Clean Slate</option>
                  <option value="navy">Navy Blue</option>
                  <option value="emerald">Emerald Green</option>
                </select>
              </div>

              <div className="flex items-center pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeHeaders}
                    onChange={(e) => setIncludeHeaders(e.target.checked)}
                    className="rounded accent-blue-600"
                  />
                  <span className="text-[11px] text-slate-700">Include title & date header</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecuteExport}
            disabled={isExporting}
            className="px-4 py-1.5 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isExporting ? (
              <span>Preparing...</span>
            ) : format === 'excel' ? (
              <>
                <FileSpreadsheet className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>
                  {scope === 'all' && workbook.sheets.length > 1
                    ? `Download Excel (${workbook.sheets.length} Sheets)` 
                    : `Download Excel (.xlsx)`}
                </span>
              </>
            ) : (
              <>
                <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Download PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
