// Source file for the dashboard area in the crm feature.

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardStatCard } from '../types';

interface DashboardStatCardsProps {
  cards: DashboardStatCard[];
  onCardClick?: (card: DashboardStatCard) => void;
}

const lightCardThemes = [
  {
    shell: 'from-indigo-50 via-white to-sky-50',
    border: 'border-indigo-100/90',
    glow: 'from-indigo-200/60 to-sky-200/60',
    label: 'text-indigo-700',
    value: 'text-indigo-950',
    hint: 'text-sky-700',
  },
  {
    shell: 'from-emerald-50 via-white to-teal-50',
    border: 'border-emerald-100/90',
    glow: 'from-emerald-200/60 to-teal-200/60',
    label: 'text-emerald-700',
    value: 'text-emerald-950',
    hint: 'text-teal-700',
  },
  {
    shell: 'from-amber-50 via-white to-orange-50',
    border: 'border-amber-100/90',
    glow: 'from-amber-200/70 to-orange-200/60',
    label: 'text-amber-700',
    value: 'text-amber-950',
    hint: 'text-orange-700',
  },
  {
    shell: 'from-cyan-50 via-white to-fuchsia-50',
    border: 'border-cyan-100/90',
    glow: 'from-cyan-200/60 to-fuchsia-200/60',
    label: 'text-cyan-700',
    value: 'text-slate-950',
    hint: 'text-fuchsia-700',
  },
];

// Renders the dashboard stat cards module.
export const DashboardStatCards = ({ cards, onCardClick }: DashboardStatCardsProps) => {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const clickable = Boolean(card.detailsType && onCardClick);
        const theme = lightCardThemes[index % lightCardThemes.length];

        return (
          <Card
            key={`${card.label}-${index}`}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={() => clickable && onCardClick?.(card)}
            onKeyDown={(event) => {
              if (!clickable) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onCardClick?.(card);
              }
            }}
            className={`group relative overflow-hidden bg-gradient-to-br ${theme.shell} ${theme.border} shadow-[0_14px_38px_-28px_rgba(15,23,42,0.6)] hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-32px_rgba(15,23,42,0.65)] dark:border-border dark:bg-card dark:bg-none dark:shadow-sm dark:hover:translate-y-0 dark:hover:shadow-md ${
              clickable ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2' : ''
            }`}
          >
            <div className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.accent} dark:hidden`} />
            <div className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${theme.glow} opacity-80 blur-2xl dark:hidden`} />
            <div className="pointer-events-none absolute bottom-0 left-0 h-16 w-full bg-gradient-to-t from-white/65 to-transparent dark:hidden" />
            <CardHeader className="relative flex flex-row items-center justify-between px-4 pb-1 pt-4">
              <CardTitle className={`text-xs font-semibold uppercase ${theme.label} dark:text-muted-foreground`}>
                {card.label}
              </CardTitle>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br ${card.accent} text-white shadow-lg shadow-slate-900/10 dark:h-8 dark:w-8 dark:shadow-none`}
              >
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="relative px-4 pb-4 pt-0">
              <div className={`text-2xl font-bold ${theme.value} dark:text-card-foreground`}>{card.value}</div>
              {card.subValue && (
                <div className="mt-1 text-xs text-muted-foreground">{card.subValue}</div>
              )}
              {clickable && (
                <div className={`mt-1 text-[11px] font-medium ${theme.hint} dark:text-muted-foreground`}>
                  Click to view details
                </div>
              )}
              <div className="mt-3 h-1.5 rounded-full bg-slate-100 dark:bg-muted">
                <div
                  className={`h-1.5 rounded-full bg-gradient-to-r ${card.accent}`}
                  style={{ width: `${card.progress ?? 60}%` }}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
