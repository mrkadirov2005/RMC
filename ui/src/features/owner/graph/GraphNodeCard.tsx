import { Handle, Position, type NodeProps } from '@xyflow/react';
import { ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NODE_HEIGHT, NODE_WIDTH, type GraphKind } from './graphModel';

const TONES: Record<GraphKind, string> = {
  root: 'border-slate-900 bg-slate-900 text-white dark:border-primary dark:bg-primary dark:text-primary-foreground',
  center: 'border-indigo-300 bg-indigo-50 text-indigo-950 dark:border-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-50',
  teacher: 'border-sky-300 bg-sky-50 text-sky-950 dark:border-sky-700 dark:bg-sky-950/50 dark:text-sky-50',
  student: 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-50',
  tab: 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-50',
  item: 'border-slate-200 bg-card text-foreground',
  more: 'border-dashed border-slate-300 bg-muted/40 text-muted-foreground',
};

export type GraphCardData = { kind: GraphKind; label: string; sub?: string; expandable: boolean; open: boolean; loading: boolean };

export const GraphNodeCard = ({ data }: NodeProps) => {
  const { kind, label, sub, expandable, open, loading } = data as GraphCardData;
  return (
    <div
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
      className={cn('flex items-center gap-2 rounded-lg border px-3 shadow-sm', TONES[kind], expandable && 'cursor-pointer hover:shadow-md', open && 'ring-2 ring-primary/40')}
      title={sub ? `${label} · ${sub}` : label}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-0 !bg-slate-400" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold leading-tight">{label}</div>
        {sub && <div className="truncate text-[11px] leading-tight opacity-70">{sub}</div>}
      </div>
      {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : expandable && <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-90')} />}
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-0 !bg-slate-400" />
    </div>
  );
};
