import { ArrowLeft, BookOpen, DollarSign, Loader2, MapPin, PlayCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/utils/helpers';
import { useLanguage } from '../../../i18n/LanguageContext';
import TeacherStudentDirectory, { type TeacherStudentItem } from './TeacherStudentDirectory';

type ClassItem = {
  class_id?: number;
  id?: number;
  class_name?: string;
  class_code?: string;
  center_id?: number;
  level?: number;
  capacity?: number;
  teacher_id?: number;
  teacher_name?: string;
  room_number?: string;
  payment_amount?: number;
  payment_frequency?: string;
  section?: string;
};

interface TeacherClassDetailPanelProps {
  classData: ClassItem;
  loading?: boolean;
  onBack: () => void;
  onOpenSession: (session: any) => void;
  onStartLesson: () => void;
  sessions: any[];
  startingLesson?: boolean;
  students: TeacherStudentItem[];
}

type ClassSchedule = { days: string[]; time: string; endTime?: string };

export default function TeacherClassDetailPanel({
  classData,
  loading = false,
  onBack,
  onOpenSession,
  onStartLesson,
  sessions,
  startingLesson = false,
  students,
}: TeacherClassDetailPanelProps) {
  const { t } = useLanguage();

  const parseSchedule = (section?: string): ClassSchedule => {
    if (!section) return { days: [], time: '', endTime: '' };
    try {
      const parsed = JSON.parse(section);
      return {
        days: Array.isArray(parsed?.days) ? parsed.days.map((day: unknown) => String(day)) : [],
        time: String(parsed?.time || ''),
        endTime: String(parsed?.endTime || ''),
      };
    } catch {
      return { days: [], time: '', endTime: '' };
    }
  };

  const className = classData?.class_name || t('Class');
  const schedule = parseSchedule(classData?.section);
  const scheduleRange = schedule.time ? `${schedule.time}${schedule.endTime ? ` - ${schedule.endTime}` : ''}` : '';
  const scheduleText = [schedule.days.join(', '), scheduleRange].filter(Boolean).join(' / ') || t('No schedule');
  const visibleStudents = students.filter((student) => !student.deleted_at);
  const activeStudents = visibleStudents.filter((student) => String(student.status || '').toLowerCase() === 'active').length;
  const transferredStudents = visibleStudents.filter((student) => String(student.status || '').toLowerCase() === 'transferred').length;
  const latestSession = sessions
    .slice()
    .sort((a, b) => new Date(b.session_date || 0).getTime() - new Date(a.session_date || 0).getTime())[0];
  const capacity = Number(classData?.capacity || 0);

  const statTiles = [
    {
      label: t('Active students'),
      value: activeStudents,
      detail: `${transferredStudents} ${t('transferred')}`,
      icon: Users,
      color: 'bg-blue-600',
    },
    {
      label: t('Capacity'),
      value: capacity || '-',
      detail: scheduleText,
      icon: BookOpen,
      color: 'bg-emerald-600',
    },
    {
      label: t('Room'),
      value: classData?.room_number || t('Not specified'),
      detail: t('Classroom'),
      icon: MapPin,
      color: 'bg-amber-500',
    },
    {
      label: t('Tuition'),
      value: formatMoney(classData?.payment_amount),
      detail: classData?.payment_frequency || t('Monthly'),
      icon: DollarSign,
      color: 'bg-fuchsia-600',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-border dark:bg-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              size="sm"
              className="h-8 shrink-0 bg-slate-800 px-2.5 text-xs font-semibold text-white hover:bg-slate-900"
              onClick={onBack}
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              {t('Back')}
            </Button>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold text-slate-950 dark:text-card-foreground">{className}</h2>
              <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                <span className="rounded-md bg-emerald-600 px-2 py-1 text-white">{scheduleText}</span>
                {classData.level ? (
                  <span className="rounded-md bg-blue-600 px-2 py-1 text-white">
                    {t('Level')} {classData.level}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {latestSession ? (
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenSession(latestSession)}>
                {t('Open Session')}
              </Button>
            ) : null}
            <Button
              onClick={onStartLesson}
              disabled={startingLesson}
              className="h-9 bg-rose-600 px-3 text-xs font-bold text-white shadow-sm hover:bg-rose-700"
            >
              {startingLesson ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
              {t('Start Lesson')}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {statTiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <div key={tile.label} className={`${tile.color} rounded-lg p-3 text-white shadow-sm`}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase text-white/75">{tile.label}</p>
                  <p className="mt-0.5 truncate text-lg font-bold">{tile.value}</p>
                  <p className="truncate text-[11px] text-white/80">{tile.detail}</p>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <TeacherStudentDirectory
        students={visibleStudents}
        title={t("Mening o'quvchilarim")}
        loading={loading}
        emptyMessage={t('No students enrolled.')}
        defaultClassName={className}
      />

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : null}
    </div>
  );
}
