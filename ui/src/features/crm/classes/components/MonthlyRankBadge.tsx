import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import type { MonthlyRank } from '../utils/monthlyRanking';

/** "1-o'rin"…"5-o'rin" in green for the top five, a red marker for the lowest five. */
export function MonthlyRankBadge({ rank }: { rank?: MonthlyRank }) {
  const { t } = useLanguage();
  if (!rank) return null;
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center rounded-full px-1.5 text-[0.625rem] font-black leading-none text-white',
        rank.tone === 'top' ? 'bg-emerald-600' : 'bg-rose-600'
      )}
      title={rank.tone === 'top' ? t('Place {place} this month', { place: rank.place }) : t('Lowest five this month')}
    >
      {rank.tone === 'top' ? t('{place}-place', { place: rank.place }) : '↓'}
    </span>
  );
}
