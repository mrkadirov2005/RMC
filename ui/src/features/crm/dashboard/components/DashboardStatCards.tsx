// Source file for the dashboard area in the crm feature.

import { MetricCard } from '@/components/common/MetricCard';
import { useLanguage } from '../../../../i18n/LanguageContext';
import type { DashboardStatCard } from '../types';

interface DashboardStatCardsProps {
  cards: DashboardStatCard[];
  onCardClick?: (card: DashboardStatCard) => void;
}

const tones = ['blue', 'green', 'amber', 'purple', 'red', 'neutral'] as const;

// Renders the dashboard stat cards module.
export const DashboardStatCards = ({ cards, onCardClick }: DashboardStatCardsProps) => {
  const { t } = useLanguage();
  const gridClass = cards.length <= 2 ? 'lg:grid-cols-2' : cards.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4';

  return (
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${gridClass}`}>
      {cards.map((card, index) => {
        const clickable = Boolean(card.detailsType && onCardClick);

        return (
          <MetricCard
            key={`${card.label}-${index}`}
            label={t(card.label)}
            value={card.value}
            detail={card.subValue ? t(card.subValue) : (clickable ? t('Open details') : undefined)}
            icon={card.icon}
            tone={tones[index % tones.length]}
            onClick={clickable ? () => onCardClick?.(card) : undefined}
          />
        );
      })}
    </div>
  );
};
