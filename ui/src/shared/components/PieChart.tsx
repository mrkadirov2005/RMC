import { memo, useMemo } from 'react';

export interface PieSlice {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieSlice[];
  size?: number;
  strokeWidth?: number;
}

const clampPositive = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0);

export const PieChart = memo(({ data, size = 220, strokeWidth = 26 }: PieChartProps) => {
  const normalized = useMemo(() => data.map((slice) => ({ ...slice, value: clampPositive(slice.value) })), [data]);
  const total = useMemo(() => normalized.reduce((sum, slice) => sum + slice.value, 0), [normalized]);

  const radius = Math.max(size / 2 - strokeWidth / 2, 0);
  const circumference = 2 * Math.PI * radius;

  const segments = useMemo(() => {
    if (total <= 0 || circumference <= 0) return [];
    let offset = 0;
    return normalized
      .filter((slice) => slice.value > 0)
      .map((slice) => {
        const length = (slice.value / total) * circumference;
        const segment = {
          ...slice,
          length,
          offset,
        };
        offset += length;
        return segment;
      });
  }, [circumference, normalized, total]);

  if (total <= 0) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 text-sm text-white/55"
        style={{ width: size, height: size }}
      >
        No data
      </div>
    );
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        {segments.map((slice) => (
          <circle
            key={slice.label}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={slice.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${slice.length} ${circumference}`}
            strokeDashoffset={-slice.offset}
          />
        ))}
      </g>
    </svg>
  );
});

PieChart.displayName = 'PieChart';

