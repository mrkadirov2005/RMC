import { memo, useMemo } from 'react';

export interface BarDatum {
  label: string;
  value: number;
  color: string;
}

interface BarChartProps {
  data: BarDatum[];
  height?: number;
  barSize?: number;
}

const clampPositive = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0);

export const BarChart = memo(({ data, height = 180, barSize = 28 }: BarChartProps) => {
  const normalized = useMemo(() => data.map((bar) => ({ ...bar, value: clampPositive(bar.value) })), [data]);
  const max = useMemo(() => Math.max(1, ...normalized.map((bar) => bar.value)), [normalized]);
  const hasData = normalized.some((bar) => bar.value > 0);

  if (!hasData) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 text-sm text-white/55"
        style={{ height }}
      >
        No data
      </div>
    );
  }

  return (
    <div className="flex items-end gap-3 overflow-x-auto" style={{ height: height + 28 }}>
      {normalized.map((bar, index) => {
        const barHeight = Math.round((bar.value / max) * height);
        return (
          <div key={bar.label} className="flex flex-col items-center gap-1.5" style={{ width: barSize + 16 }}>
            <span className="text-xs font-black text-foreground">{bar.value}</span>
            <div className="flex items-end rounded-t-md bg-muted/40" style={{ height, width: barSize }}>
              <div
                className="w-full rounded-t-md transition-[height]"
                style={{
                  height: barHeight,
                  background: bar.color,
                  animation: `bar-grow-${index} 650ms cubic-bezier(0.22,1,0.36,1) both`,
                }}
              />
              <style>{`@keyframes bar-grow-${index} { from { height: 0; } to { height: ${barHeight}px; } }`}</style>
            </div>
            <span className="max-w-[64px] truncate text-[10px] font-semibold text-muted-foreground" title={bar.label}>
              {bar.label}
            </span>
          </div>
        );
      })}
    </div>
  );
});

BarChart.displayName = 'BarChart';
