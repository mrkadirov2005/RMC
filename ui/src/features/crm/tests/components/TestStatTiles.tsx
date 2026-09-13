// The four headline figures. Inactive loses the tile it used to hold — a count
// nobody acts on — and becomes a caption under Total, which frees two slots for
// the measures the section never showed: how students actually score, and how
// often they clear the pass mark.

import type { TestTotals } from '../api/testStatisticsApi';

interface Tile {
  label: string;
  value: string;
  caption: string;
}

const formatPercent = (value: number | null) => (value == null ? '—' : `${value}%`);

export const buildTestStatTiles = (totals: TestTotals): Tile[] => [
  {
    label: 'Total tests',
    value: String(totals.tests),
    caption: `${totals.active} active`,
  },
  {
    label: 'Submissions',
    value: totals.submissions.toLocaleString(),
    caption:
      totals.awaiting_grading > 0
        ? `${totals.awaiting_grading} awaiting grading`
        : 'nothing awaiting grading',
  },
  {
    label: 'Average score',
    value: formatPercent(totals.average_score),
    caption: 'across graded submissions',
  },
  {
    label: 'Pass rate',
    value: formatPercent(totals.pass_rate),
    caption: "against each test's pass mark",
  },
];

export const TestStatTiles = ({ totals }: { totals: TestTotals }) => (
  <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-4">
    {buildTestStatTiles(totals).map((tile) => (
      <div key={tile.label} className="bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tile.label}</p>
        <p className="mt-1.5 text-2xl font-semibold tabular-nums text-foreground">{tile.value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{tile.caption}</p>
      </div>
    ))}
  </div>
);

export default TestStatTiles;
