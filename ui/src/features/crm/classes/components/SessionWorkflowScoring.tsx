import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Circle, MinusCircle, Star, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const stepToneClasses = {
  emerald: 'border-emerald-300 bg-emerald-50',
  sky: 'border-sky-300 bg-sky-50',
  violet: 'border-violet-300 bg-violet-50',
};

const getStudentId = (student: any) => Number(student.student_id || student.id || 0);

export type ScoreTone = 'emerald' | 'sky' | 'violet' | 'amber' | 'rose' | 'orange';

export type ScoreOption = {
  label: string;
  score: number;
  symbol: string;
  fill: number;
  tone: ScoreTone;
};

const optionToneClasses: Record<ScoreTone, { idle: string; active: string; fill: string; track: string }> = {
  emerald: {
    idle: 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-400',
    active: 'border-emerald-600 bg-emerald-600 text-white shadow-emerald-100',
    fill: '#10b981',
    track: '#d1fae5',
  },
  sky: {
    idle: 'border-sky-200 bg-sky-50 text-sky-900 hover:border-sky-400',
    active: 'border-sky-600 bg-sky-600 text-white shadow-sky-100',
    fill: '#0ea5e9',
    track: '#e0f2fe',
  },
  violet: {
    idle: 'border-violet-200 bg-violet-50 text-violet-900 hover:border-violet-400',
    active: 'border-violet-600 bg-violet-600 text-white shadow-violet-100',
    fill: '#7c3aed',
    track: '#ede9fe',
  },
  amber: {
    idle: 'border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-400',
    active: 'border-amber-500 bg-amber-500 text-white shadow-amber-100',
    fill: '#f59e0b',
    track: '#fef3c7',
  },
  rose: {
    idle: 'border-rose-200 bg-rose-50 text-rose-900 hover:border-rose-400',
    active: 'border-rose-600 bg-rose-600 text-white shadow-rose-100',
    fill: '#f43f5e',
    track: '#ffe4e6',
  },
  orange: {
    idle: 'border-orange-200 bg-orange-50 text-orange-900 hover:border-orange-400',
    active: 'border-orange-500 bg-orange-500 text-white shadow-orange-100',
    fill: '#f97316',
    track: '#ffedd5',
  },
};

const ScoreCircle = ({ option, active }: { option: ScoreOption; active: boolean }) => {
  const tone = optionToneClasses[option.tone];
  const degrees = Math.max(0, Math.min(100, option.fill)) * 3.6;
  return (
    <span
      className="grid h-6 w-6 shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(${tone.fill} ${degrees}deg, ${tone.track} 0deg)` }}
    >
      <span className={cn('grid h-4 w-4 place-items-center rounded-full bg-white text-[9px] shadow-sm', active && 'text-slate-950')}>
        {option.symbol}
      </span>
    </span>
  );
};

const SelectedFill = ({ option, active }: { option: ScoreOption; active: boolean }) => {
  const tone = optionToneClasses[option.tone];
  return (
    <span
      className={cn('h-5 w-2 rounded-full border transition', active ? 'border-white/70' : 'border-slate-200')}
      style={{
        background: active
          ? `linear-gradient(to top, ${tone.fill} ${option.fill}%, rgba(255,255,255,0.35) ${option.fill}%)`
          : `linear-gradient(to top, ${tone.track} ${option.fill}%, #ffffff ${option.fill}%)`,
      }}
    />
  );
};

const getPointStatus = (value: string | undefined) => {
  if (value === undefined || value === '') {
    return {
      label: 'Missing',
      icon: AlertCircle,
      className: 'border-rose-200 bg-rose-50 text-rose-800',
    };
  }
  const points = Number(value || 0);
  if (points === 0) {
    return {
      label: 'Zero',
      icon: MinusCircle,
      className: 'border-slate-200 bg-slate-50 text-slate-700',
    };
  }
  if (points < 50) {
    return {
      label: 'Low',
      icon: Circle,
      className: 'border-amber-200 bg-amber-50 text-amber-800',
    };
  }
  if (points < 80) {
    return {
      label: 'Good',
      icon: TrendingUp,
      className: 'border-sky-200 bg-sky-50 text-sky-800',
    };
  }
  return {
    label: 'Strong',
    icon: CheckCircle2,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  };
};

export const StepTile = ({ active, title, value, tone }: { active: boolean; title: string; value: string; tone: keyof typeof stepToneClasses }) => (
  <div className={cn('rounded-lg border p-3', active ? stepToneClasses[tone] : 'bg-muted/30')}>
    <p className="text-sm font-semibold">{title}</p>
    <p className="text-xs text-muted-foreground">{value}</p>
  </div>
);

export const ScoreTable = ({
  students,
  options,
  values,
  isEnabled,
  onToggle,
  onFillAll,
  getTotalScore,
  stellarStudentId,
  onToggleStellar,
  stellarBonusCoins = 30,
  action,
}: {
  students: any[];
  options: ScoreOption[];
  values: Map<number, string>;
  isEnabled?: (studentId: number) => boolean;
  onToggle: (studentId: number, value: string) => void;
  onFillAll: (value: string) => void;
  getTotalScore?: (studentId: number) => number;
  stellarStudentId?: number | null;
  onToggleStellar?: (studentId: number) => void;
  stellarBonusCoins?: number;
  action: ReactNode;
}) => (
  <div className="overflow-x-auto rounded-lg border">
    <div className="flex items-center gap-1.5 border-b bg-slate-50 px-3 py-2 dark:bg-slate-900/40">
      <span className="mr-1 shrink-0 text-xs font-semibold text-muted-foreground">Fill all</span>
      {options.map((option) => {
        const tone = optionToneClasses[option.tone];
        return (
          <button
            key={option.label}
            type="button"
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-full border px-2 text-[11px] font-bold shadow-sm transition',
              tone.idle,
            )}
            onClick={() => onFillAll(option.label)}
          >
            <ScoreCircle option={option} active={false} />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
    <Table>
      <TableHeader>
        <TableRow className="bg-primary">
          <TableHead className="h-10 w-[180px] min-w-[180px] px-3 text-xs font-semibold text-primary-foreground">Student</TableHead>
          {options.map((option) => (
            <TableHead key={option.label} className="h-9 w-[72px] min-w-[72px] px-1 text-center text-[11px] font-semibold text-primary-foreground">
              <span className="block truncate">{option.label}</span>
              <span className="block text-[10px] font-medium text-primary-foreground/80">{option.score} points</span>
            </TableHead>
          ))}
          {getTotalScore && <TableHead className="h-9 px-3 text-center text-xs font-semibold text-primary-foreground">Combined Score</TableHead>}
          {onToggleStellar && <TableHead className="h-9 px-3 text-center text-xs font-semibold text-primary-foreground">Stellar</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {students.length === 0 ? (
          <TableRow>
            <TableCell colSpan={options.length + (getTotalScore ? 1 : 0) + (onToggleStellar ? 1 : 0) + 1} className="py-10 text-center text-muted-foreground">No students found for this class.</TableCell>
          </TableRow>
        ) : students.map((student) => {
          const studentId = getStudentId(student);
          const selected = values.get(studentId) || '';
          const enabled = isEnabled ? isEnabled(studentId) : true;
          const isStellar = stellarStudentId === studentId;
          return (
            <TableRow key={studentId} className={cn('h-12', !enabled && 'opacity-40 grayscale')}>
              <TableCell className="w-[180px] max-w-[180px] px-3 py-1.5 text-sm font-medium">
                <span className="block truncate">{[student.first_name, student.last_name].filter(Boolean).join(' ') || 'Unnamed student'}</span>
              </TableCell>
              {options.map((option) => {
                const isSelected = selected === option.label;
                const tone = optionToneClasses[option.tone];
                return (
                  <TableCell key={option.label} className="w-[72px] px-1 py-1 text-center">
                    <button
                      type="button"
                      disabled={!enabled}
                      aria-label={`${option.label} ${option.score} points`}
                      className={cn(
                        'mx-auto flex h-7 w-12 items-center justify-center gap-1 rounded-full border px-0.5 shadow-sm transition disabled:pointer-events-none',
                        isSelected ? `${tone.active} ring-2 ring-offset-1 ring-offset-background` : tone.idle,
                      )}
                      onClick={() => onToggle(studentId, option.label)}
                    >
                      <ScoreCircle option={option} active={isSelected} />
                      <SelectedFill option={option} active={isSelected} />
                    </button>
                  </TableCell>
                );
              })}
              {getTotalScore && (
                <TableCell className="px-3 py-1.5 text-center text-base font-bold">
                  {getTotalScore(studentId)} <span className="text-xs text-muted-foreground">/ 100</span>
                </TableCell>
              )}
              {onToggleStellar && (
                <TableCell className="px-3 py-1.5 text-center">
                  <button
                    type="button"
                    disabled={!enabled}
                    className={cn(
                      'inline-flex h-8 items-center justify-center gap-1.5 rounded-full border px-3 text-[11px] font-bold shadow-sm transition disabled:pointer-events-none',
                      isStellar
                        ? 'border-amber-500 bg-amber-500 text-white shadow-amber-100'
                        : 'border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-400',
                    )}
                    onClick={() => onToggleStellar(studentId)}
                  >
                    <Star className={cn('h-3.5 w-3.5', isStellar && 'fill-white')} />
                    +{stellarBonusCoins}
                  </button>
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    <div className="flex justify-end gap-2 border-t p-3">{action}</div>
  </div>
);

export const ManualPointsTable = ({
  students,
  values,
  onChange,
  onFillAll,
  getTotalScore,
  action,
}: {
  students: any[];
  values: Map<number, string>;
  onChange: (studentId: number, value: string) => void;
  onFillAll: (value: string) => void;
  getTotalScore: (studentId: number) => number;
  action: ReactNode;
}) => (
  <div className="overflow-x-auto rounded-lg border">
    <div className="flex flex-wrap items-center gap-2 border-b bg-slate-50 px-3 py-2 dark:bg-slate-900/40">
      <span className="text-xs font-semibold text-muted-foreground">Fill all points</span>
      {[0, 5, 10, 20, 50, 100].map((value) => (
        <button
          key={value}
          type="button"
          className="h-8 rounded-full border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 shadow-sm transition hover:border-slate-400"
          onClick={() => onFillAll(String(value))}
        >
          {value}
        </button>
      ))}
    </div>
    <Table>
      <TableHeader>
        <TableRow className="bg-primary">
          <TableHead className="h-10 w-[220px] min-w-[220px] px-3 text-xs font-semibold text-primary-foreground">Student</TableHead>
          <TableHead className="h-10 w-[160px] min-w-[160px] px-3 text-center text-xs font-semibold text-primary-foreground">Manual Points</TableHead>
          <TableHead className="h-10 w-[140px] min-w-[140px] px-3 text-center text-xs font-semibold text-primary-foreground">Status</TableHead>
          <TableHead className="h-10 px-3 text-center text-xs font-semibold text-primary-foreground">Combined Score</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {students.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No students found for this class.</TableCell>
          </TableRow>
        ) : students.map((student) => {
          const studentId = getStudentId(student);
          const status = getPointStatus(values.get(studentId));
          const StatusIcon = status.icon;
          return (
            <TableRow key={studentId} className="h-12">
              <TableCell className="w-[220px] max-w-[220px] px-3 py-1.5 text-sm font-medium">
                <span className="block truncate">{[student.first_name, student.last_name].filter(Boolean).join(' ') || 'Unnamed student'}</span>
              </TableCell>
              <TableCell className="px-3 py-1.5">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={values.get(studentId) ?? ''}
                  onChange={(event) => onChange(studentId, event.target.value)}
                  className="mx-auto h-8 max-w-[120px] text-center text-sm font-semibold"
                  placeholder="0"
                />
              </TableCell>
              <TableCell className="px-3 py-1.5 text-center">
                <span className={cn('inline-flex h-8 min-w-[92px] items-center justify-center gap-1.5 rounded-full border px-3 text-[11px] font-bold', status.className)}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  {status.label}
                </span>
              </TableCell>
              <TableCell className="px-3 py-1.5 text-center text-base font-bold">
                {getTotalScore(studentId)} <span className="text-xs text-muted-foreground">/ 100</span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    <div className="flex justify-end gap-2 border-t p-3">{action}</div>
  </div>
);
