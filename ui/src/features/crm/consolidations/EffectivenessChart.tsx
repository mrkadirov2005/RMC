// Donut chart: how consolidation attempts resolve, center-wide. Four buckets
// partition every (student, set) attempt (passed on try 1/2/3+, or never
// passed) — a true part-to-whole, so a pie/donut is the honest form for it.
// "Had violations" is a separate, overlapping flag (a student can pass and
// still have left the screen), so it's never a fifth slice of the same whole —
// it's shown as its own clickable status callout beside the ring. Clicking any
// slice or the violations callout opens a modal with the students behind it
// (handled by the parent). Colors: the three pass buckets share one hue (blue)
// in monotone lightness steps — an ordinal "how many tries it took" ramp,
// validated with the dataviz skill's ordinal checks — while "never passed" and
// "had violations" use the skill's fixed status palette (critical / warning),
// since they're a different kind of signal, not another rung on the same
// ladder. Fills are Tailwind arbitrary-value classes (with a dark: variant
// where the validated dark-mode hex differs) rather than inline styles,
// matching this app's class-based dark mode.
import { AlertTriangle } from 'lucide-react';
import type { ConsolidationEffectiveness, ConsolidationOutcomeBucket } from '../classes/api/consolidationApi';

export type EffectivenessBarKey = ConsolidationOutcomeBucket | 'had_violations';

interface SliceSpec {
  key: ConsolidationOutcomeBucket;
  label: string;
  fillClass: string;
}

const SLICES: SliceSpec[] = [
  { key: 'passed_1', label: 'Passed on 1st try', fillClass: 'fill-[#1c5cab]' },
  { key: 'passed_2', label: 'Passed on 2nd try', fillClass: 'fill-[#3987e5]' },
  { key: 'passed_3_plus', label: 'Passed on 3rd+ try', fillClass: 'fill-[#86b6ef]' },
  { key: 'never_passed', label: 'Never passed', fillClass: 'fill-[#d03b3b] dark:fill-[#e66767]' },
];

const RADIUS = 80;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 3;

interface EffectivenessChartProps {
  effectiveness: ConsolidationEffectiveness;
  totalAttempts: number;
  selected: EffectivenessBarKey | null;
  onSelect: (key: EffectivenessBarKey) => void;
}

export default function EffectivenessChart({ effectiveness, totalAttempts, selected, onSelect }: EffectivenessChartProps) {
  if (totalAttempts === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No attempts recorded yet.</p>;
  }

  const passRate = Math.round(((effectiveness.passed_1 + effectiveness.passed_2 + effectiveness.passed_3_plus) / totalAttempts) * 100);

  // Each arc starts where the ones before it ended, so the offsets are a running
  // total over the slices rather than a counter mutated during the render.
  const arcs = SLICES.map((slice, index) => {
    const value = effectiveness[slice.key];
    const startedAt = SLICES.slice(0, index).reduce(
      (sum, earlier) => sum + (effectiveness[earlier.key] / totalAttempts) * CIRCUMFERENCE,
      0
    );
    const segLen = (value / totalAttempts) * CIRCUMFERENCE;
    const dash = Math.max(segLen - GAP, 0);
    const pct = Math.round((value / totalAttempts) * 100);
    return { ...slice, value, pct, dash, offset: -startedAt };
  });

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center">
      <div className="relative shrink-0">
        <svg
          viewBox="0 0 200 200"
          width={200}
          height={200}
          role="img"
          aria-label={`Consolidation effectiveness: ${passRate}% overall pass rate across ${totalAttempts} attempts`}
        >
          <circle cx={100} cy={100} r={RADIUS} strokeWidth={26} className="fill-none stroke-muted" />
          <g transform="rotate(-90 100 100)">
            {arcs.map((arc) => (
              <circle
                key={arc.key}
                cx={100}
                cy={100}
                r={RADIUS}
                strokeWidth={26}
                strokeDasharray={`${arc.dash} ${CIRCUMFERENCE - arc.dash}`}
                strokeDashoffset={arc.offset}
                strokeLinecap="round"
                className={`fill-none cursor-pointer transition-opacity ${arc.fillClass} ${
                  selected && selected !== arc.key ? 'opacity-40' : 'opacity-100'
                }`}
                onClick={() => onSelect(arc.key)}
              >
                <title>
                  {arc.label}: {arc.value} ({arc.pct}%)
                </title>
              </circle>
            ))}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold tabular-nums text-foreground">{passRate}%</span>
          <span className="text-xs text-muted-foreground">pass rate</span>
        </div>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2">
        {arcs.map((arc) => {
          const isSelected = selected === arc.key;
          return (
            <button
              key={arc.key}
              type="button"
              onClick={() => onSelect(arc.key)}
              aria-pressed={isSelected}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-muted/30 ${
                isSelected ? 'bg-slate-50 ring-1 ring-slate-300 dark:bg-muted/40 dark:ring-slate-600' : ''
              }`}
            >
              <svg width={10} height={10} className="shrink-0">
                <rect width={10} height={10} rx={2} className={arc.fillClass} />
              </svg>
              <span className="flex-1 text-muted-foreground">{arc.label}</span>
              <span className="font-semibold tabular-nums text-foreground">
                {arc.value} <span className="font-normal text-muted-foreground">({arc.pct}%)</span>
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onSelect('had_violations')}
          aria-pressed={selected === 'had_violations'}
          className={`mt-1 flex items-center gap-2 rounded-md border border-dashed px-2 py-1.5 text-left text-sm transition-colors hover:bg-amber-50 dark:hover:bg-amber-950/20 ${
            selected === 'had_violations'
              ? 'border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30'
              : 'border-amber-200 dark:border-amber-900'
          }`}
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          <span className="flex-1 text-muted-foreground">Had lockdown violations</span>
          <span className="font-semibold tabular-nums text-foreground">{effectiveness.had_violations}</span>
        </button>
        <p className="px-2 text-xs text-muted-foreground">
          Click a slice or the violations callout to see the students behind it. Violations overlap the ring above — a
          student can pass and still have left the screen.
        </p>
      </div>
    </div>
  );
}
