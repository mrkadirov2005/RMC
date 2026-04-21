import { CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAppSelector } from '@/features/crm/hooks';

interface CalendarPageHeaderProps {
  today: Date;
}

export const CalendarPageHeader = ({ today }: CalendarPageHeaderProps) => {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          {user?.userType === 'teacher'
            ? 'Your class schedule for the month.'
            : user?.userType === 'student'
            ? 'Your class schedule for the month.'
            : 'All classes for the month.'}
        </p>
      </div>
      <Badge variant="secondary" className="gap-2">
        <CalendarDays className="h-4 w-4" />
        {today.toLocaleString('default', { month: 'long', year: 'numeric' })}
      </Badge>
    </div>
  );
};
