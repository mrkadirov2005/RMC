import { ArrowLeft, BookOpen, DollarSign, Eye, EyeClosed, Loader2, MapPin, PlayCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/utils/helpers';
import { useLanguage } from '../../../i18n/LanguageContext';
import TeacherStudentDirectory, { type TeacherStudentItem } from './TeacherStudentDirectory';
import { useState } from 'react';

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
  onStartLesson: () => void;
  startingLesson?: boolean;
  students: TeacherStudentItem[];
}

// type ClassSchedule = { days: string[]; time: string; endTime?: string };

export default function TeacherClassDetailPanel({
  classData,
  loading = false,
  onBack,
  onStartLesson,
  startingLesson = false,
  students,
}: TeacherClassDetailPanelProps) {
  const { t } = useLanguage();

  // const parseSchedule = (section?: string): ClassSchedule => {
  //   if (!section) return { days: [], time: '', endTime: '' };
  //   try {
  //     const parsed = JSON.parse(section);
  //     return {
  //       days: Array.isArray(parsed?.days) ? parsed.days.map((day: unknown) => String(day)) : [],
  //       time: String(parsed?.time || ''),
  //       endTime: String(parsed?.endTime || ''),
  //     };
  //   } catch {
  //     return { days: [], time: '', endTime: '' };
  //   }
  // };

  const className = classData?.class_name || t('Class');
  const visibleStudents = students.filter((student) => !student.deleted_at);
  const activeStudents = visibleStudents.filter((student) => String(student.status || '').toLowerCase() === 'active').length;
  const capacity = Number(classData?.capacity || 0);
  const [viewDetails, setViewDetails] = useState(false)

  

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
          
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold text-slate-950 dark:text-card-foreground">{className}</h2>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!viewDetails?<Eye onClick={()=>setViewDetails((prev)=>!prev)}></Eye>:<EyeClosed onClick={()=>setViewDetails((prev)=>!prev)}></EyeClosed>}

            {/* here */}
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

      { viewDetails && <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between gap-4 overflow-x-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo-50 text-indigo-700">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('Active students')}</p>
                <p className="text-sm font-semibold">{activeStudents}</p>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200/70" />

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('Capacity')}</p>
                <p className="text-sm font-semibold">{capacity || '-'}</p>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200/70" />

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-50 text-amber-700">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('Room')}</p>
                <p className="text-sm font-semibold">{classData?.room_number || t('Not specified')}</p>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200/70" />

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-fuchsia-50 text-fuchsia-700">
                <DollarSign className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('Tuition')}</p>
                <p className="text-sm font-semibold">{formatMoney(classData?.payment_amount) || '-'}</p>
              </div>
            </div>
          </div>

        </div>
      </div>
}
      <div className="mt-3 text-base">
        <TeacherStudentDirectory
          isViewDetails={viewDetails}
          students={visibleStudents}
          title={t("Mening o'quvchilarim")}
          loading={loading}
          emptyMessage={t('No students enrolled.')}
          defaultClassName={className}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : null}
    </div>
  );
}
