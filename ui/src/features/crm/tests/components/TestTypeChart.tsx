// Donut: how the centre's test catalogue splits by question type. The types
// partition every test exactly once, so a ring is the honest form for it.
//
// Eight question types exist, which would put four slivers on the ring nobody
// could compare, so the chart holds the four largest and folds the rest into a
// single "Other types" slice that lists what it contains. Clicking a slice hands
// the type back to the parent, which switches to the list tab with that filter
// already applied — reusing the filter the page already had.
//
// Colours are the first five slots of the validated categorical palette, in
// fixed order, with a dark step for each. Every slice is directly labelled in
// the legend beside the ring, which is also what satisfies the contrast relief
// rule for the lighter slots on a light surface.

import { formatTestType } from '../testVisuals';

export interface TestTypeSlice {
  key: string;
  label: string;
  tests: number;
  types: string[];
}

// Written out rather than derived, because Tailwind only emits a class it can
// see in the source; a class name assembled at runtime produces no colour.
const SLICE_STROKES = [
  'stroke-[#2a78d6] dark:stroke-[#3987e5]',
  'stroke-[#eb6834] dark:stroke-[#d95926]',
  'stroke-[#1baf7a] dark:stroke-[#199e70]',
  'stroke-[#eda100] dark:stroke-[#c98500]',
  'stroke-[#e87ba4] dark:stroke-[#d55181]',
];

const SWATCH_FILLS = [
  'bg-[#2a78d6] dark:bg-[#3987e5]',
  'bg-[#eb6834] dark:bg-[#d95926]',
  'bg-[#1baf7a] dark:bg-[#199e70]',
  'bg-[#eda100] dark:bg-[#c98500]',
  'bg-[#e87ba4] dark:bg-[#d55181]',
];

const VISIBLE_SLICES = 4;
const RADIUS = 70;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 2;

// Largest first, then fold the tail into one slice that still names its members.
export const buildTypeSlices = (counts: { test_type: string; tests: number }[]): TestTypeSlice[] => {
  const sorted = [...counts]
    .filter((row) => Number(row.tests) > 0)
    .sort((a, b) => Number(b.tests) - Number(a.tests) || String(a.test_type).localeCompare(String(b.test_type)));

  if (sorted.length <= VISIBLE_SLICES + 1) {
    return sorted.map((row) => ({
      key: row.test_type,
      label: formatTestType(row.test_type),
      tests: Number(row.tests),
      types: [row.test_type],
    }));
  }

  const head = sorted.slice(0, VISIBLE_SLICES).map((row) => ({
    key: row.test_type,
    label: formatTestType(row.test_type),
    tests: Number(row.tests),
    types: [row.test_type],
  }));
  const tail = sorted.slice(VISIBLE_SLICES);

  return [
    ...head,
    {
      key: '__other__',
      label: `Other ${tail.length} types`,
      tests: tail.reduce((sum, row) => sum + Number(row.tests), 0),
      types: tail.map((row) => row.test_type),
    },
  ];
};

interface TestTypeChartProps {
  counts: { test_type: string; tests: number }[];
  selected: string | null;
  onSelect: (slice: TestTypeSlice) => void;
}

export const TestTypeChart = ({ counts, selected, onSelect }: TestTypeChartProps) => {
  const slices = buildTypeSlices(counts);
  const total = slices.reduce((sum, slice) => sum + slice.tests, 0);

  if (total === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No tests have been created yet.</p>;
  }

  let cumulative = 0;
  const arcs = slices.map((slice, index) => {
    const length = (slice.tests / total) * CIRCUMFERENCE;
    const arc = {
      ...slice,
      index,
      percent: Math.round((slice.tests / total) * 100),
      dash: Math.max(length - GAP, 0),
      offset: -cumulative,
    };
    cumulative += length;
    return arc;
  });

  return (
    <div className="grid items-center gap-6 sm:grid-cols-[200px_1fr]">
      <svg viewBox="0 0 200 200" className="h-[200px] w-[200px] max-w-full" role="img" aria-label="Tests by question type">
        <g transform="rotate(-90 100 100)">
          {arcs.map((arc) => (
            <circle
              key={arc.key}
              cx="100"
              cy="100"
              r={RADIUS}
              fill="none"
              strokeWidth={selected === arc.key ? 30 : 26}
              strokeDasharray={`${arc.dash} ${CIRCUMFERENCE - arc.dash}`}
              strokeDashoffset={arc.offset}
              className={`${SLICE_STROKES[arc.index]} cursor-pointer transition-[stroke-width] ${
                selected && selected !== arc.key ? 'opacity-40' : ''
              }`}
              onClick={() => onSelect(arc)}
            />
          ))}
        </g>
        <text x="100" y="96" textAnchor="middle" className="fill-foreground text-[26px] font-semibold tabular-nums">
          {total}
        </text>
        <text x="100" y="116" textAnchor="middle" className="fill-muted-foreground text-[11px]">
          tests
        </text>
      </svg>

      <ul className="grid gap-0">
        {arcs.map((arc) => (
          <li key={arc.key}>
            <button
              type="button"
              onClick={() => onSelect(arc)}
              title={arc.key === '__other__' ? arc.types.map(formatTestType).join(', ') : undefined}
              className={`flex w-full items-center gap-3 border-b px-1 py-2 text-left text-sm last:border-b-0 hover:bg-muted/50 ${
                selected === arc.key ? 'bg-muted/60' : ''
              }`}
            >
              <span className={`h-3 w-3 shrink-0 rounded-sm ${SWATCH_FILLS[arc.index]}`} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-foreground">{arc.label}</span>
              <span className="tabular-nums text-muted-foreground">{arc.tests}</span>
              <span className="w-12 text-right tabular-nums text-muted-foreground">{arc.percent}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TestTypeChart;
