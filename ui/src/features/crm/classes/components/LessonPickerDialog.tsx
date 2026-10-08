import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { sessionWorkflowApi } from '../api/sessionWorkflowApi';
import { toDateKey } from '../utils/date';
import { dayNames, parseSchedule } from '../utils/schedule';
import {
  buildSessionWorkflowPath,
  defaultLessonActions,
  findSessionOnDate,
  getSessionId,
  hasScoringAction,
  lessonActionOptions,
  type LessonAction,
} from '../lessonStart';

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const monthStart = (dateKey: string) => {
  const date = parseDateKey(dateKey);
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const getCalendarDays = (month: Date) => {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
};

interface LessonPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: number | null;
  /** Group name shown in the description. */
  label?: string;
  /** Raw class `section` JSON, used to highlight scheduled lesson days. */
  section?: string;
  /** Date preselected when the dialog opens; defaults to today (local). */
  initialDate?: string;
  /** Forwarded to the workflow page so Back/Save return to the right place. */
  from?: 'teacher';
}

// Picks the lesson date and the actions to record, then opens the session workflow.
// It never creates a session: the workflow page creates one only when the lesson is saved.
export function LessonPickerDialog({ open, onOpenChange, classId, ...rest }: LessonPickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        {/* Mounted per opening, so every opening starts from fresh state. */}
        {open && classId ? <LessonPickerBody classId={classId} onClose={() => onOpenChange(false)} {...rest} /> : null}
      </DialogContent>
    </Dialog>
  );
}

type LessonPickerBodyProps = Omit<LessonPickerDialogProps, 'open' | 'onOpenChange' | 'classId'> & {
  classId: number;
  onClose: () => void;
};

function LessonPickerBody({ classId, onClose, label, section, initialDate, from }: LessonPickerBodyProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(() => initialDate || toDateKey(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(() => monthStart(initialDate || toDateKey(new Date())));
  const [actions, setActions] = useState<LessonAction[]>(defaultLessonActions);
  const [sessions, setSessions] = useState<any[]>([]);
  const [attendanceDates, setAttendanceDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    sessionWorkflowApi.loadLessonCalendar(classId)
      .then((calendar) => {
        if (cancelled) return;
        setSessions(calendar.sessions);
        setAttendanceDates(calendar.attendanceDates);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [classId]);

  const lessonDays = useMemo(() => parseSchedule(section).days.map((day) => day.toLowerCase()), [section]);
  const calendarDays = getCalendarDays(calendarMonth);
  const calendarMonthLabel = calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const todayKey = toDateKey(new Date());

  const toggleAction = (action: LessonAction, checked: boolean) => {
    setActions((current) => (checked ? Array.from(new Set([...current, action])) : current.filter((item) => item !== action)));
  };

  const start = () => {
    if (!hasScoringAction(actions)) {
      showToast.error('Pick attendance, homework, activity, or points before starting.');
      return;
    }
    const existing = findSessionOnDate(sessions, selectedDate);
    onClose();
    navigate(buildSessionWorkflowPath({
      classId,
      sessionId: existing ? getSessionId(existing) : null,
      date: selectedDate,
      actions,
      from,
    }));
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('Pick lesson session')}</DialogTitle>
        <DialogDescription>
          {t('Choose the date and what you want to record for {lesson}.', { lesson: label || t('this group') })}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Label>{t('Session date')}</Label>
        <div className="rounded-xl border p-3">
          <div className="mb-3 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              aria-label={t('Previous month')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-bold capitalize">{calendarMonthLabel}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              aria-label={t('Next month')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="mb-1 grid grid-cols-7 text-center text-[0.625rem] font-bold uppercase text-muted-foreground">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date) => {
              const dateKey = toDateKey(date);
              const inMonth = date.getMonth() === calendarMonth.getMonth();
              const dayName = dayNames[date.getDay()].toLowerCase();
              const isLessonDay = lessonDays.some((day) => day === dayName || day.slice(0, 3) === dayName.slice(0, 3));
              const isSelected = dateKey === selectedDate;
              const isPastOrToday = dateKey <= todayKey;
              const hasAttendance = attendanceDates.has(dateKey);
              const attendanceColor = hasAttendance
                ? 'bg-emerald-100 font-semibold text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-900'
                : isLessonDay && isPastOrToday
                  ? 'bg-red-100 font-semibold text-red-900 hover:bg-red-200 dark:bg-red-950 dark:text-red-200 dark:hover:bg-red-900'
                  : isLessonDay
                    ? 'bg-slate-200 font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    : 'hover:bg-muted';
              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedDate(dateKey)}
                  className={`relative h-9 rounded-md text-sm transition ${
                    isSelected ? 'bg-primary font-bold text-primary-foreground' : attendanceColor
                  } ${inMonth ? '' : 'text-muted-foreground/40'}`}
                  aria-label={`${dateKey}${isLessonDay ? ' scheduled lesson day' : ''}`}
                >
                  {date.getDate()}
                  {isLessonDay && !isSelected && (
                    <span className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${hasAttendance ? 'bg-emerald-600 dark:bg-emerald-400' : isPastOrToday ? 'bg-red-600 dark:bg-red-400' : 'bg-slate-500 dark:bg-slate-400'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-emerald-700 dark:text-emerald-300">{t('Green')}</span> {t('means attendance was recorded,')} <span className="font-semibold text-red-700 dark:text-red-300">red</span> {t('means a past lesson has no attendance, and')} <span className="font-semibold text-slate-600 dark:text-slate-300">gray</span> {t('means the lesson has not happened yet.')}
        </p>
        {loading && <p className="text-xs text-muted-foreground">{t('Loading attendance history...')}</p>}
        <div className="text-sm font-semibold">{t('Selected:')} {selectedDate}</div>
      </div>
      <div className="grid gap-2">
        {lessonActionOptions.map((option) => {
          const Icon = option.icon;
          return (
            <label
              key={option.id}
              htmlFor={`lesson-action-${option.id}`}
              className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition hover:bg-slate-50 dark:hover:bg-muted/40"
            >
              <Checkbox
                id={`lesson-action-${option.id}`}
                checked={actions.includes(option.id)}
                onCheckedChange={(value) => toggleAction(option.id, value === true)}
                className="mt-1"
              />
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{t(option.label)}</span>
                <span className="block text-xs text-muted-foreground">{t(option.detail)}</span>
              </span>
            </label>
          );
        })}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {t('Cancel')}
        </Button>
        {/* Wait for the session list so an existing lesson on this date is reopened, not duplicated. */}
        <Button type="button" disabled={loading} onClick={start} className="bg-rose-600 text-white hover:bg-rose-700">
          <PlayCircle className="mr-2 h-4 w-4" />
          {t('Start session')}
        </Button>
      </DialogFooter>
    </>
  );
}
