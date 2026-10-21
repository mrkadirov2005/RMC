// The rooms dashboard at the top of Statistics: how many rooms there are, how many are in use or
// free right now, and how much of the opening hours the lessons take.
import { Building2, CalendarClock, DoorClosed, DoorOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/i18n/LanguageContext';
import { capitalDay, type Weekly } from '../weeklyModel';

export const RoomsDashboard = ({ weekly }: { weekly: Weekly | null }) => {
  const { t } = useLanguage();
  if (!weekly) return null;
  const { summary } = weekly;
  const total = summary.rooms;
  const freePercent = total ? 100 - summary.in_use_now_percent : 0;
  const cards = [
    { label: t('Total rooms'), value: String(total), note: t('{count} rooms without seats set', { count: summary.rooms_without_capacity }), icon: Building2, tone: 'text-indigo-600' },
    { label: t('In use now'), value: `${summary.in_use_now}`, note: t('{percent}% of the rooms', { percent: summary.in_use_now_percent }), icon: DoorClosed, tone: 'text-rose-600' },
    { label: t('Free now'), value: `${summary.free_now}`, note: t('{percent}% of the rooms', { percent: freePercent }), icon: DoorOpen, tone: 'text-emerald-600' },
    { label: t('Hours booked'), value: `${summary.booked_percent}%`, note: t('of opening hours on lesson days'), icon: CalendarClock, tone: 'text-amber-600' },
  ];
  return (
    <div className="space-y-2 px-4 pt-4" data-testid="rooms-dashboard">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, note, icon: Icon, tone }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
                <p className="text-xs text-muted-foreground">{note}</p>
              </div>
              <Icon className={`h-7 w-7 ${tone}`} />
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{t('Now: {day} {time}', { day: t(capitalDay(summary.now.day)), time: summary.now.time })}</p>
    </div>
  );
};
