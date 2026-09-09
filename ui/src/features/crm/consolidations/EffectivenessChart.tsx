// Horizontal bar chart: how consolidation attempts resolve, center-wide.
// Four buckets partition every (student, set) attempt (passed on try 1/2/3+, or
// never passed); "had violations" is a separate, overlapping flag shown as its
// own bar for comparison, not a fifth slice of the same whole. Colors: the three
// pass buckets share one hue (blue) in monotone lightness steps — an ordinal
// "how many tries it took" ramp, validated with the dataviz skill's ordinal
// checks — while the two negative outcomes use the skill's fixed status palette
// (critical / warning), since they're a different kind of signal, not another
// rung on the same ladder. Bar fill colors are Tailwind arbitrary-value classes
// (with a dark: variant where the validated dark-mode hex differs) rather than
// inline styles, matching this app's class-based dark mode.
import type { ConsolidationEffectiveness, ConsolidationOutcomeBucket } from '../classes/api/consolidationApi';

export type EffectivenessBarKey = ConsolidationOutcomeBucket | 'had_violations';

interface BarSpec {
  key: EffectivenessBarKey;
  label: string;
  colorClass: string;
}

const BARS: BarSpec[] = [
  { key: 'passed_1', label: 'Passed on 1st try', colorClass: 'bg-[#1c5cab]' },
  { key: 'passed_2', label: 'Passed on 2nd try', colorClass: 'bg-[#3987e5]' },
  { key: 'passed_3_plus', label: 'Passed on 3rd+ try', colorClass: 'bg-[#86b6ef]' },
  { key: 'never_passed', label: 'Never passed', colorClass: 'bg-[#d03b3b] dark:bg-[#e66767]' },
  { key: 'had_violations', label: 'Had lockdown violations', colorClass: 'bg-[#fab219]' },
];

interface EffectivenessChartProps {
  effectiveness: ConsolidationEffectiveness;
  totalAttempts: number;
  selected: EffectivenessBarKey | null;
  onSelect: (key: EffectivenessBarKey) => void;
}

export default function EffectivenessChart({ effectiveness, totalAttempts, selected, onSelect }: EffectivenessChartProps) {
  const values: Record<EffectivenessBarKey, number> = {
    passed_1: effectiveness.passed_1,
    passed_2: effectiveness.passed_2,
    passed_3_plus: effectiveness.passed_3_plus,
    never_passed: effectiveness.never_passed,
    had_violations: effectiveness.had_violations,
  };
  const maxValue = Math.max(1, ...BARS.map((bar) => values[bar.key]));

  if (totalAttempts === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No attempts recorded yet.</p>;
  }

  return (
    <div className="space-y-3">
      {BARS.map((bar) => {
        const value = values[bar.key];
        const pct = totalAttempts > 0 ? Math.round((value / totalAttempts) * 100) : 0;
        const widthPct = Math.max(2, (value / maxValue) * 100);
        const isSelected = selected === bar.key;
        return (
          <button
            key={bar.key}
            type="button"
            onClick={() => onSelect(bar.key)}
            className={`group flex w-full items-center gap-3 rounded-md p-1.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-muted/30 ${
              isSelected ? 'bg-slate-50 ring-1 ring-slate-300 dark:bg-muted/40 dark:ring-slate-600' : ''
            }`}
            aria-pressed={isSelected}
          >
            <span className="w-40 shrink-0 text-xs font-medium text-muted-foreground sm:w-48">{bar.label}</span>
            <span className="relative h-6 flex-1 overflow-hidden rounded bg-muted">
              <span className={`absolute inset-y-0 left-0 rounded transition-all ${bar.colorClass}`} style={{ width: `${widthPct}%` }} />
            </span>
            <span className="w-24 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
              {value} <span className="font-normal text-muted-foreground">({pct}%)</span>
            </span>
          </button>
        );
      })}
      <p className="text-xs text-muted-foreground">
        Click a bar to see the students behind it. Percentages are of {totalAttempts} total student attempts. "Had
        violations" overlaps the other buckets — a student can pass and still have left the screen.
      </p>
    </div>
  );
}
