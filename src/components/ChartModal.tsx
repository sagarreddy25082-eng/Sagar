import React, { useState } from 'react';
import { X, BarChart3, LineChart, Layers } from 'lucide-react';
import { Sheet } from '../types/spreadsheet';
import { cellKey, colIndexToLetter } from '../utils/columnUtils';
import { getPopulatedBounds } from '../utils/exportUtils';

interface ChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: Sheet;
}

export const ChartModal: React.FC<ChartModalProps> = ({
  isOpen,
  onClose,
  sheet,
}) => {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'horizontal'>('bar');
  const [labelCol, setLabelCol] = useState(0);
  const [valueCol, setValueCol] = useState(1);

  if (!isOpen) return null;

  const { maxRow } = getPopulatedBounds(sheet);

  // Extract chart datapoints from chosen columns
  const dataPoints: { label: string; value: number }[] = [];
  const startRow = 1; // assume row 0 is header

  for (let r = startRow; r <= maxRow; r++) {
    const labelCell = sheet.cells[cellKey(r, labelCol)];
    const valueCell = sheet.cells[cellKey(r, valueCol)];

    const rawVal = valueCell ? (valueCell.computed !== undefined ? valueCell.computed : valueCell.raw) : '';
    const num = typeof rawVal === 'number' ? rawVal : parseFloat(rawVal.toString().replace(/[$,%]/g, ''));

    const labelText = labelCell ? (labelCell.computed !== undefined ? labelCell.computed : labelCell.raw) : `Row ${r + 1}`;

    if (!isNaN(num) && labelText.trim().length > 0) {
      dataPoints.push({
        label: labelText,
        value: num,
      });
    }
  }

  const values = dataPoints.map((d) => d.value);
  const maxValue = values.length > 0 ? Math.max(...values, 1) : 100;
  const minValue = values.length > 0 ? Math.min(0, Math.min(...values)) : 0;
  const range = maxValue - minValue || 1;

  // Chart Dimensions
  const chartHeight = 220;
  const chartWidth = 500;
  const paddingX = 40;
  const paddingY = 30;
  const innerWidth = chartWidth - paddingX * 2;
  const innerHeight = chartHeight - paddingY * 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
      <div
        className="w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 bg-white overflow-hidden flex flex-col text-slate-800 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Data Chart Visualizer</h3>
              <p className="text-[11px] text-slate-500">Live graphical chart generated from "{sheet.name}"</p>
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
          {/* Controls: Chart Type & Column Selectors */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 font-semibold uppercase">Chart Type</label>
              <div className="flex items-center rounded-lg border border-slate-300 p-0.5 bg-slate-50">
                <button
                  onClick={() => setChartType('bar')}
                  className={`flex-1 py-1 rounded text-center cursor-pointer transition-colors ${
                    chartType === 'bar' ? 'bg-white text-blue-600 font-bold shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Bar
                </button>
                <button
                  onClick={() => setChartType('line')}
                  className={`flex-1 py-1 rounded text-center cursor-pointer transition-colors ${
                    chartType === 'line' ? 'bg-white text-blue-600 font-bold shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Line
                </button>
                <button
                  onClick={() => setChartType('horizontal')}
                  className={`flex-1 py-1 rounded text-center cursor-pointer transition-colors ${
                    chartType === 'horizontal' ? 'bg-white text-blue-600 font-bold shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Row
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 mb-1 font-semibold uppercase">Labels Column (X-Axis)</label>
              <select
                value={labelCol}
                onChange={(e) => setLabelCol(parseInt(e.target.value, 10))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 outline-none"
              >
                {Array.from({ length: sheet.colCount }).map((_, c) => (
                  <option key={c} value={c}>
                    Column {colIndexToLetter(c)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 mb-1 font-semibold uppercase">Values Column (Y-Axis)</label>
              <select
                value={valueCol}
                onChange={(e) => setValueCol(parseInt(e.target.value, 10))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 outline-none"
              >
                {Array.from({ length: sheet.colCount }).map((_, c) => (
                  <option key={c} value={c}>
                    Column {colIndexToLetter(c)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SVG Canvas Area */}
          <div className="w-full h-[220px] rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-center p-2 relative overflow-hidden">
            {dataPoints.length === 0 ? (
              <div className="text-center text-slate-400">
                <BarChart3 className="w-8 h-8 mx-auto mb-1 opacity-40" />
                <p>No numeric values found in Column {colIndexToLetter(valueCol)}.</p>
                <p className="text-[10px] mt-0.5">Enter some numbers in rows below the header to plot.</p>
              </div>
            ) : (
              <svg width={chartWidth} height={chartHeight} className="overflow-visible">
                {/* Gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                  const y = paddingY + innerHeight - pct * innerHeight;
                  const val = minValue + pct * range;
                  return (
                    <g key={i}>
                      <line
                        x1={paddingX}
                        y1={y}
                        x2={chartWidth - paddingX}
                        y2={y}
                        stroke="#e2e8f0"
                        strokeDasharray="3,3"
                      />
                      <text
                        x={paddingX - 6}
                        y={y + 3}
                        fontSize="9"
                        textAnchor="end"
                        fill="#94a3b8"
                        className="font-mono"
                      >
                        {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : Math.round(val)}
                      </text>
                    </g>
                  );
                })}

                {/* Vertical Bar Chart */}
                {chartType === 'bar' && (
                  <>
                    {dataPoints.slice(0, 12).map((dp, idx, arr) => {
                      const barWidth = Math.min(36, innerWidth / arr.length - 8);
                      const slotWidth = innerWidth / arr.length;
                      const x = paddingX + idx * slotWidth + (slotWidth - barWidth) / 2;
                      const barHeight = Math.max(3, (dp.value / maxValue) * innerHeight);
                      const y = paddingY + innerHeight - barHeight;

                      return (
                        <g key={idx} className="group cursor-pointer">
                          <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={barHeight}
                            rx="3"
                            fill="#2563eb"
                            className="hover:fill-blue-500 transition-colors"
                          />
                          <text
                            x={x + barWidth / 2}
                            y={chartHeight - paddingY + 14}
                            fontSize="9"
                            textAnchor="middle"
                            fill="#64748b"
                            className="truncate"
                          >
                            {dp.label.slice(0, 7)}
                          </text>
                        </g>
                      );
                    })}
                  </>
                )}

                {/* Line Chart */}
                {chartType === 'line' && (
                  <>
                    <polyline
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.5"
                      points={dataPoints
                        .slice(0, 12)
                        .map((dp, idx, arr) => {
                          const slotWidth = innerWidth / (arr.length - 1 || 1);
                          const x = paddingX + idx * slotWidth;
                          const y = paddingY + innerHeight - Math.max(2, (dp.value / maxValue) * innerHeight);
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />
                    {dataPoints.slice(0, 12).map((dp, idx, arr) => {
                      const slotWidth = innerWidth / (arr.length - 1 || 1);
                      const x = paddingX + idx * slotWidth;
                      const y = paddingY + innerHeight - Math.max(2, (dp.value / maxValue) * innerHeight);
                      return (
                        <g key={idx}>
                          <circle cx={x} cy={y} r="3.5" fill="#ffffff" stroke="#2563eb" strokeWidth="2.5" />
                          <text
                            x={x}
                            y={chartHeight - paddingY + 14}
                            fontSize="9"
                            textAnchor="middle"
                            fill="#64748b"
                          >
                            {dp.label.slice(0, 7)}
                          </text>
                        </g>
                      );
                    })}
                  </>
                )}

                {/* Horizontal Row Chart */}
                {chartType === 'horizontal' && (
                  <>
                    {dataPoints.slice(0, 6).map((dp, idx, arr) => {
                      const rowHeight = 16;
                      const slotHeight = innerHeight / arr.length;
                      const y = paddingY + idx * slotHeight + (slotHeight - rowHeight) / 2;
                      const barWidth = Math.max(5, (dp.value / maxValue) * innerWidth);

                      return (
                        <g key={idx}>
                          <rect
                            x={paddingX}
                            y={y}
                            width={barWidth}
                            height={rowHeight}
                            rx="3"
                            fill="#2563eb"
                          />
                          <text
                            x={paddingX + barWidth + 6}
                            y={y + 11}
                            fontSize="9"
                            fill="#0f172a"
                            fontWeight="bold"
                          >
                            {dp.value}
                          </text>
                        </g>
                      );
                    })}
                  </>
                )}
              </svg>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-slate-100 bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg shadow-sm cursor-pointer bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Close Chart
          </button>
        </div>
      </div>
    </div>
  );
};
