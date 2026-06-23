import { useState } from 'react';
import { List } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PieChart } from '@/shared/components/PieChart';
import { cn } from '@/lib/utils';
import type { StudentChartMode, StudentStatRow } from './types';

interface Props {
  mode: StudentChartMode;
  rows: StudentStatRow[];
  total: number;
  modalListTitle?: string;
}

const percentOf = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

const summarizeRows = (rows: StudentStatRow[], limit: number): StudentStatRow[] => {
  if (rows.length <= limit) return rows;
  const visible = rows.slice(0, limit);
  const otherCount = rows.slice(limit).reduce((sum, row) => sum + row.count, 0);
  return [
    ...visible,
    {
      label: 'Other',
      count: otherCount,
      color: '#94a3b8',
    },
  ];
};

export const StudentStatsChart = ({ mode, rows, total, modalListTitle }: Props) => {
  const [listOpen, setListOpen] = useState(false);
  const visibleRows = rows.slice(0, 10);
  const max = Math.max(...visibleRows.map((row) => row.count), 1);
  const pieRows = modalListTitle ? summarizeRows(rows, 8) : visibleRows;
  const linePoints =
    visibleRows.length > 1
      ? visibleRows
          .map((row, index) => {
            const x = (index / (visibleRows.length - 1)) * 100;
            const y = 92 - (row.count / max) * 84;
            return `${x},${y}`;
          })
          .join(' ')
      : '';

  if (visibleRows.length === 0) {
    return <div className="flex h-72 items-center justify-center text-sm font-semibold text-slate-500">No data</div>;
  }

  if (mode === 'pie') {
    if (modalListTitle) {
      return (
        <>
          <div className="animate-chart-open flex min-h-[320px] flex-col items-center justify-center gap-3">
            <div className="relative flex items-center justify-center">
              <PieChart
                size={310}
                strokeWidth={42}
                data={pieRows.map((row) => ({
                  label: row.label,
                  value: row.count,
                  color: row.color || '#2563eb',
                }))}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[11px] font-black uppercase text-slate-400">{modalListTitle}</span>
                <span className="text-3xl font-black text-slate-950 dark:text-white">{total.toLocaleString()}</span>
              </div>
            </div>
            <ColorNotes rows={pieRows} total={total} />
            <button
              type="button"
              onClick={() => setListOpen(true)}
              className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
            >
              <List className="mr-1.5 h-4 w-4" />
              View all {modalListTitle.toLowerCase()} ({rows.length})
            </button>
          </div>
          <RowsDialog open={listOpen} onOpenChange={setListOpen} title={modalListTitle} rows={rows} total={total} />
        </>
      );
    }

    return (
      <div className="animate-chart-open grid gap-3 lg:grid-cols-[260px_1fr]">
        <div className="flex items-center justify-center">
          <PieChart
            size={230}
            strokeWidth={34}
            data={visibleRows.map((row) => ({
              label: row.label,
              value: row.count,
              color: row.color || '#2563eb',
            }))}
          />
        </div>
        <StatLegend rows={visibleRows} total={total} />
      </div>
    );
  }

  if (mode === 'line') {
    return (
      <div className="animate-chart-open space-y-3">
        <div className="h-64 rounded-md bg-white p-4 dark:bg-white/[0.03]">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
            <polyline
              className="animate-chart-line-draw"
              pathLength={100}
              points={linePoints}
              fill="none"
              stroke="#2563eb"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {visibleRows.map((row, index) => {
              const x = visibleRows.length > 1 ? (index / (visibleRows.length - 1)) * 100 : 50;
              const y = 92 - (row.count / max) * 84;
              return <circle key={row.label} className="animate-chart-point-pop" cx={x} cy={y} r="1.9" fill={row.color || '#10b981'} style={{ animationDelay: `${index * 80 + 450}ms` }} />;
            })}
          </svg>
        </div>
        <StatLegend rows={visibleRows} total={total} compact />
      </div>
    );
  }

  return (
    <div className="animate-chart-open space-y-2">
      {visibleRows.map((row) => {
        const percent = percentOf(row.count, total);
        return (
          <div key={row.label} className="grid grid-cols-[minmax(90px,180px)_1fr_58px] items-center gap-2 text-xs">
            <span className="truncate font-black text-slate-700 dark:text-white/80">{row.label}</span>
            <div className="flex h-6 overflow-hidden rounded bg-slate-100 dark:bg-white/10">
              <div
                className="animate-chart-bar-fill rounded bg-blue-600"
                style={{ width: `${Math.max(Math.round((row.count / max) * 100), row.count > 0 ? 3 : 0)}%`, backgroundColor: row.color }}
              />
            </div>
            <span className="text-right font-black text-slate-600 dark:text-white/70">{percent}%</span>
          </div>
        );
      })}
    </div>
  );
};

const RowsDialog = ({
  open,
  onOpenChange,
  title,
  rows,
  total,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  rows: StudentStatRow[];
  total: number;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color || '#2563eb' }} />
              <span className="truncate text-sm font-black text-slate-800 dark:text-white/85">{row.label}</span>
            </div>
            <span className="text-sm font-black text-slate-950 dark:text-white">{row.count.toLocaleString()}</span>
            <span className="w-10 text-right text-xs font-bold text-slate-500">{percentOf(row.count, total)}%</span>
          </div>
        ))}
      </div>
    </DialogContent>
  </Dialog>
);

const ColorNotes = ({ rows, total }: { rows: StudentStatRow[]; total: number }) => (
  <div className="grid w-full max-w-2xl grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
    {rows.map((row) => (
      <div
        key={row.label}
        className="flex min-w-0 items-center gap-1.5 rounded border border-slate-100 bg-white px-2 py-1 dark:border-white/10 dark:bg-white/[0.04]"
      >
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color || '#2563eb' }} />
        <span className="truncate text-[11px] font-black text-slate-700 dark:text-white/80">{row.label}</span>
        <span className="ml-auto shrink-0 text-[10px] font-bold text-slate-500">{percentOf(row.count, total)}%</span>
      </div>
    ))}
  </div>
);

const StatLegend = ({ rows, total, compact = false }: { rows: StudentStatRow[]; total: number; compact?: boolean }) => (
  <div className={cn('grid gap-2', compact ? 'grid-cols-2 lg:grid-cols-5' : 'content-center')}>
    {rows.map((row) => (
      <div key={row.label} className="rounded-md border border-slate-100 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color || '#2563eb' }} />
          <p className="truncate text-xs font-black text-slate-800 dark:text-white/85">{row.label}</p>
        </div>
        <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{row.count.toLocaleString()}</p>
        <p className="text-[10px] font-bold text-slate-500">{percentOf(row.count, total)}%</p>
      </div>
    ))}
  </div>
);
