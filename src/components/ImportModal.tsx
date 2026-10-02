import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, Plus, AlertCircle } from 'lucide-react';
import { parseCSVToSheet } from '../utils/exportUtils';
import { CellData } from '../types/spreadsheet';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportData: (
    data: { rowCount: number; colCount: number; cells: Record<string, CellData> },
    mode: 'replaceCurrent' | 'newSheet',
    newSheetName?: string
  ) => void;
  currentSheetName: string;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportData,
  currentSheetName,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [csvContent, setCsvContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [mode, setMode] = useState<'replaceCurrent' | 'newSheet'>('newSheet');
  const [newSheetName, setNewSheetName] = useState('Imported Data');
  const [previewData, setPreviewData] = useState<{
    rowCount: number;
    colCount: number;
    cells: Record<string, CellData>;
  } | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    setNewSheetName(cleanName);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setCsvContent(text);
        const parsed = parseCSVToSheet(text);
        setPreviewData(parsed);
      }
    };
    reader.readAsText(file);
  };

  const handleTextChange = (text: string) => {
    setCsvContent(text);
    if (text.trim()) {
      const parsed = parseCSVToSheet(text);
      setPreviewData(parsed);
    } else {
      setPreviewData(null);
    }
  };

  const handleExecuteImport = () => {
    if (!previewData) return;
    onImportData(previewData, mode, newSheetName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 bg-white overflow-hidden flex flex-col text-slate-800 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Upload className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Import CSV Data</h3>
              <p className="text-[11px] text-slate-500">Upload or paste tabular CSV records</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* File selector or drop area */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-300 rounded-xl p-5 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors cursor-pointer bg-slate-50/40"
            >
              <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
              <div className="font-semibold text-center text-slate-800">
                {fileName ? fileName : 'Click to select CSV file from your computer'}
              </div>
              <div className="text-[11px] text-slate-500">
                Supports comma-separated values (.csv) with commas, quotes, and UTF-8
              </div>
            </button>
          </div>

          {/* Paste CSV directly alternative */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Or Paste Raw CSV Data
            </label>
            <textarea
              value={csvContent}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Year, Revenue, Expenses&#10;2024, 120000, 85000&#10;2025, 145000, 92000"
              rows={3}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-[11px] bg-slate-50 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Target destination */}
          {previewData && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-1.5 text-blue-700 font-semibold text-[11px]">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Detected: ~{previewData.rowCount} rows × {previewData.colCount} columns</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Import Destination
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      mode === 'newSheet' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500 font-medium' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={mode === 'newSheet'}
                      onChange={() => setMode('newSheet')}
                      className="accent-blue-600"
                    />
                    <div className="flex items-center gap-1 text-slate-800">
                      <Plus className="w-3.5 h-3.5 text-blue-600" />
                      <span>Create New Sheet</span>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      mode === 'replaceCurrent' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500 font-medium' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={mode === 'replaceCurrent'}
                      onChange={() => setMode('replaceCurrent')}
                      className="accent-blue-600"
                    />
                    <span className="text-slate-800">Replace in "{currentSheetName}"</span>
                  </label>
                </div>
              </div>

              {mode === 'newSheet' && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">New Sheet Name</label>
                  <input
                    type="text"
                    value={newSheetName}
                    onChange={(e) => setNewSheetName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
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
            onClick={handleExecuteImport}
            disabled={!previewData}
            className="px-4 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 bg-blue-600 hover:bg-blue-700"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Confirm & Import</span>
          </button>
        </div>
      </div>
    </div>
  );
};
