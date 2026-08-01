// Source file for the dashboard area in the crm feature.

import { useLanguage } from '../../../../i18n/LanguageContext';
import type { DashboardStatCard } from '../types';

interface DashboardStatCardsProps {
  cards: DashboardStatCard[];
  onCardClick?: (card: DashboardStatCard) => void;
}

const iconTones = [
  'bg-blue-50 text-blue-600',
  'bg-emerald-50 text-emerald-600',
  'bg-amber-50 text-amber-600',
  'bg-violet-50 text-violet-600',
  'bg-rose-50 text-rose-600',
];

// Renders the dashboard stat cards module.
export const DashboardStatCards = ({ cards, onCardClick }: DashboardStatCardsProps) => {
  const { t } = useLanguage();
  const gridClass = cards.length <= 2 ? 'lg:grid-cols-2' : cards.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4';

  return (
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${gridClass}`}>
      {cards.map((card, index) => {
        const clickable = Boolean(card.detailsType && onCardClick);
        const Icon = card.icon;

        return (
          <button
            key={`${card.label}-${index}`}
            type="button"
            disabled={!clickable}
            onClick={clickable ? () => onCardClick?.(card) : undefined}
            className="min-h-[114px] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md disabled:cursor-default dark:border-border dark:bg-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="min-h-7 text-[11px] font-semibold uppercase leading-4 text-slate-500">{t(card.label)}</p>
                <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-card-foreground">{card.value}</p>
                <p className="mt-1 min-h-6 text-[11px] leading-4 text-slate-500">
                  {card.subValue ? t(card.subValue) : clickable ? t('Open details') : ''}
                </p>
              </div>
              {Icon ? (
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconTones[index % iconTones.length]}`}>
                  <Icon className="h-5 w-5" />
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
};
