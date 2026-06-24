import { useEffect, useMemo, useState } from 'react';
import { BarChart3, DollarSign, GraduationCap, Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import { ownerManagerApi } from './api';
import type { OwnerManagerStatisticsCollections } from './types';
import { OwnerFinancePanel } from './components/OwnerFinancePanel';
import { StudentStatsCarousel } from './components/student-stats/StudentStatsCarousel';
import { TeacherStatsPanel } from './components/teacher-stats/TeacherStatsPanel';

type ReportTab = 'finance' | 'students' | 'teachers';

const tabs = [
  { value: 'finance', label: 'Moliya', Icon: DollarSign },
  { value: 'students', label: "O'quvchilar", Icon: GraduationCap },
  { value: 'teachers', label: "O'qituvchilar", Icon: Users },
] as const;

const emptyCollections: OwnerManagerStatisticsCollections = {
  students: [],
  teachers: [],
  classes: [],
  payments: [],
  deletedStudents: [],
};

const OwnerReports = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<ReportTab>('finance');
  const [collections, setCollections] = useState<OwnerManagerStatisticsCollections>(emptyCollections);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const loadReports = async () => {
      setLoading(true);
      try {
        const [studentsRes, teachersRes, classesRes, paymentsRes, deletedStudentsRes] = await Promise.all([
          ownerManagerApi.students.getAllAcrossCenters(),
          ownerManagerApi.teachers.getAllAcrossCenters(),
          ownerManagerApi.classes.getAllAcrossCenters(),
          ownerManagerApi.payments.getAllAcrossCenters(),
          ownerManagerApi.students.getDeletedAcrossCenters().catch(() => ({ data: [] })),
        ]);
        if (!alive) return;
        setCollections({
          students: toRows(studentsRes),
          teachers: toRows(teachersRes),
          classes: toRows(classesRes),
          payments: toRows(paymentsRes),
          deletedStudents: toRows(deletedStudentsRes),
        });
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadReports();
    return () => {
      alive = false;
    };
  }, []);

  const summary = useMemo(
    () => [
      { label: 'Students', value: collections.students.length.toLocaleString(), tone: 'from-amber-500 to-orange-600' },
      { label: 'Teachers', value: collections.teachers.length.toLocaleString(), tone: 'from-emerald-600 to-teal-600' },
      { label: 'Groups', value: collections.classes.length.toLocaleString(), tone: 'from-blue-600 to-cyan-600' },
      { label: 'Payments', value: collections.payments.length.toLocaleString(), tone: 'from-rose-600 to-pink-600' },
    ],
    [collections]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/70 to-fuchsia-50/60 text-foreground dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-cyan-200 bg-gradient-to-br from-white via-cyan-50 to-fuchsia-50 p-4 shadow-sm dark:border-white/10 dark:from-white/[0.06] dark:via-white/[0.03] dark:to-white/[0.04]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-lg shadow-slate-500/25">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{t('Reports')}</h1>
                <p className="text-sm text-slate-500 dark:text-white/55">{t('Finance, student, and teacher analytics across every branch.')}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {summary.map((item) => (
              <div key={item.label} className={cn('rounded-md bg-gradient-to-br p-3 text-white shadow-lg', item.tone)}>
                <p className="text-[10px] font-black uppercase text-white/75">{t(item.label)}</p>
                <p className="text-xl font-black leading-tight">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-1 overflow-x-auto rounded-md border border-slate-200/70 bg-white/90 p-1 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            {tabs.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded px-3 py-2 text-sm font-black transition-colors',
                  activeTab === value
                    ? 'bg-gradient-to-r from-slate-800 to-slate-950 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white'
                )}
              >
                <Icon className="h-4 w-4" />
                {t(label)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center rounded-md border bg-white py-12 dark:border-white/10 dark:bg-white/[0.03]">
            <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
          </div>
        ) : (
          <>
            {activeTab === 'finance' && <OwnerFinancePanel collections={collections} loading={false} />}
            {activeTab === 'students' && <StudentStatsCarousel data={collections.students} collections={collections} />}
            {activeTab === 'teachers' && <TeacherStatsPanel data={collections.teachers} collections={collections} />}
          </>
        )}
      </div>
    </div>
  );
};

const toRows = (response: any) => (Array.isArray(response) ? response : response?.data || []);

export default OwnerReports;
