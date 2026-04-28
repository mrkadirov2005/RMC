// Source file for the dashboard area in the crm feature.

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardStatCard } from '../types';

interface DashboardStatCardsProps {
  cards: DashboardStatCard[];
}

// Renders the dashboard stat cards module.
export const DashboardStatCards = ({ cards }: DashboardStatCardsProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;

        return (
          <Card key={`${card.label}-${index}`} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <div
                className={`h-9 w-9 rounded-lg bg-gradient-to-br ${card.accent} text-white flex items-center justify-center`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <div className="mt-2 h-1.5 rounded-full bg-muted">
                <div
                  className={`h-1.5 rounded-full bg-gradient-to-r ${card.accent}`}
                  style={{ width: '60%' }}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

