// Source file for the dashboard area in the crm feature.

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardStatCard } from '../types';

interface DashboardStatCardsProps {
  cards: DashboardStatCard[];
}

// Renders the dashboard stat cards module.
export const DashboardStatCards = ({ cards }: DashboardStatCardsProps) => {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;

        return (
          <Card key={`${card.label}-${index}`} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between px-4 pb-1 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br ${card.accent} text-white`}
              >
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="text-xl font-bold">{card.value}</div>
              {card.subValue && (
                <div className="mt-1 text-xs text-muted-foreground">{card.subValue}</div>
              )}
              <div className="mt-2 h-1 rounded-full bg-muted">
                <div
                  className={`h-1 rounded-full bg-gradient-to-r ${card.accent}`}
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
