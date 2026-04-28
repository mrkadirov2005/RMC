// Source file for the calendar area in the crm feature.

import { Button } from '@/components/ui/button';
import type { ClassItem } from '../types';

interface PlannedClassItemProps {
  item: any;
  selectedDay: string;
  onStartLesson?: (classId: number, date: string, time: string) => void;
  onOpenDetails: (cls: ClassItem, isoDate: string) => void;
  onOpenChange: (open: boolean) => void;
  isStudent: boolean;
  canViewDetails: boolean;
  classes: ClassItem[];
  index: number;
}

// Renders the planned class item module.
export const PlannedClassItem = ({
  item,
  selectedDay,
  onStartLesson,
  onOpenDetails,
  onOpenChange,
  isStudent,
  canViewDetails,
  classes,
  index,
}: PlannedClassItemProps) => {
  return (
    <div
      key={`planned-${item.class_id}-${item.time}-${index}`}
      className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
    >
      <div>
        <div className="font-semibold text-amber-900">{item.class_name || 'Regular Class'}</div>
        <div className="text-xs text-amber-700">{item.time}</div>
      </div>
      <div className="flex items-center gap-2">
        {!isStudent && onStartLesson && (
          <Button
            size="sm"
            variant="default"
            className="bg-amber-600 hover:bg-amber-700 text-white border-none"
            onClick={() => onStartLesson(Number(item.class_id), selectedDay, item.time)}
          >
            Start Lesson
          </Button>
        )}
        {canViewDetails && (
          <Button
            size="sm"
            variant="outline"
            className="border-amber-200 text-amber-800 hover:bg-amber-100"
            onClick={() => {
              const cls = classes.find(c => Number(c.class_id || c.id) === Number(item.class_id));
              if (cls) {
                onOpenChange(false);
                onOpenDetails(cls, selectedDay);
              }
            }}
          >
            Summary
          </Button>
        )}
      </div>
    </div>
  );
};
