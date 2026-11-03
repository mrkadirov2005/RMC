// The four headline figures. Inactive loses the tile it used to hold — a count
// nobody acts on — and becomes a caption under Total, which frees two slots for
// the measures the section never showed: how students actually score, and how
// often they clear the pass mark.

import type { TestTotals } from '../api/testStatisticsApi';
import { useLanguage } from '@/i18n/LanguageContext';

type Translate = (value: string, vars?: Record<string, string | number>) => string;
const asIs: Translate = (value, vars) => value.replace(/\{(\w+)\}/g, (_, key) => String(vars?.[key] ?? `{${key}}`));

interface Tile {
  label: string;
  value: string;
  caption: string;
}

const formatPercent = (value: number | null) => (value == null ? '—' : `${value}%`);

export const buildTestStatTiles = (totals: TestTotals, t: Translate = asIs): Tile[] => [
  {
    label: t('Total tests'),
    value: String(totals.tests),
    caption: t('{count} active', { count: totals.active }),
  },
  {
    label: t('Submissions'),
    value: totals.submissions.toLocaleString(),
    caption:
      totals.awaiting_grading > 0
        ? t('{count} awaiting grading', { count: totals.awaiting_grading })
        : t('nothing awaiting grading'),
  },
  {
    label: t('Average score'),
    value: formatPercent(totals.average_score),
    caption: t('across graded submissions'),
  },
  {
    label: t('Pass rate'),
    value: formatPercent(totals.pass_rate),
    caption: t("against each test's pass mark"),
  },
];

export const TestStatTiles = ({ totals }: { totals: TestTotals }) => {
  const { t } = useLanguage();
  return (
  <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border lg:grid-cols-4">
    {buildTestStatTiles(totals, t).map((tile) => (
      <div key={tile.label} className="bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tile.label}</p>
        <p className="mt-1.5 text-2xl font-semibold tabular-nums text-foreground">{tile.value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{tile.caption}</p>
      </div>
    ))}
  </div>
  );
};

export default TestStatTiles;
