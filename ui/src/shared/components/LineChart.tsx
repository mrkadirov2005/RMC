import { memo, useMemo } from 'react';
import { useContainerWidth } from '../hooks/useContainerWidth';

export interface LinePoint {
  label: string;
  value: number;
}

interface LineChartProps {
  data: LinePoint[];
  height?: number;
  color?: string;
  showEmptyState?: boolean;
}

const MIN_POINT_SPACING = 64;

const clampFinite = (value: number) => (Number.isFinite(value) ? value : 0);

export const LineChart = memo(({ data, height = 200, color = '#2563eb', showEmptyState = true }: LineChartProps) => {
  const normalized = useMemo(() => data.map((point) => ({ ...point, value: clampFinite(point.value) })), [data]);
  const hasData = normalized.length > 0;
  const { ref, width: containerWidth } = useContainerWidth(280);

  if (!hasData && showEmptyState) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 text-sm text-white/55"
        style={{ height }}
      >
        No data
      </div>
    );
  }

  const max = Math.max(1, ...normalized.map((point) => point.value));
  const min = Math.min(0, ...normalized.map((point) => point.value));
  const range = max - min || 1;
  const padding = 28;
  // Fill the full container width when there's room; only grow past it (with horizontal
  // scroll) once there are enough points that a comfortable per-point spacing needs more.
  const width = Math.max(normalized.length * MIN_POINT_SPACING, containerWidth || 280, 280);
  const innerHeight = height - padding * 2;

  const points = normalized.map((point, index) => {
    const x = normalized.length > 1
      ? (index / (normalized.length - 1)) * (width - padding * 2) + padding
      : width / 2;
    const y = padding + innerHeight - ((point.value - min) / range) * innerHeight;
    return { ...point, x, y };
  });

  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = points.length > 1
    ? `${linePath} L ${points[points.length - 1].x} ${padding + innerHeight} L ${points[0].x} ${padding + innerHeight} Z`
    : '';

  return (
    <div ref={ref} className="w-full overflow-x-auto">
      <svg width={width} height={height} className="block" role="img" aria-label="Line chart">
        <defs>
          <linearGradient id="lineChartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {areaPath ? <path d={areaPath} fill="url(#lineChartFill)" stroke="none" /> : null}
        {points.length > 1 ? (
          <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
        {points.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle cx={point.x} cy={point.y} r={4} fill={color} stroke="white" strokeWidth={1.5} />
            <text x={point.x} y={Math.max(point.y - 10, 12)} textAnchor="middle" className="fill-foreground text-[10px] font-black">
              {point.value}
            </text>
            <text x={point.x} y={height - 6} textAnchor="middle" className="fill-muted-foreground text-[9px] font-semibold">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
});

LineChart.displayName = 'LineChart';
