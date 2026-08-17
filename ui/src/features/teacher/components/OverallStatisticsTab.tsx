import { useMemo, useState } from 'react';
import { BarChart3, CalendarCheck2, CircleDollarSign, TrendingUp, Users } from 'lucide-react';
import { PieChart } from '@/shared/components/PieChart';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type SectionKey = 'students' | 'attendance' | 'points' | 'payments';

interface OverallStatisticsTabProps {
  teacherId?: number;
  classes?: any[];
  students?: any[];
  attendance?: any[];
  grades?: any[];
  payments?: any[];
}

const palette = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#ec4899'];

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getDisplayName = (item: any, fallback: string) => {
  const value = item?.class_name ?? item?.name ?? item?.group_name ?? item?.title ?? fallback;
  return String(value || fallback);
};

const OverallStatisticsTab = ({
  teacherId,
  classes = [],
  students = [],
  attendance = [],
  grades = [],
  payments = [],
}: OverallStatisticsTabProps) => {
  const [activeSection, setActiveSection] = useState<SectionKey>('students');

  const teacherClasses = useMemo(() => {
    if (!teacherId) return classes;
    return classes.filter((item) => Number(item?.teacher_id ?? item?.teacherId ?? 0) === Number(teacherId));
  }, [classes, teacherId]);

  const teacherClassIds = useMemo(
    () => new Set(
      teacherClasses
        .map((item) => Number(item?.class_id ?? item?.id ?? 0))
        .filter((id) => id > 0)
    ),
    [teacherClasses]
  );

  const teacherStudents = useMemo(() => {
    if (teacherId && teacherClassIds.size > 0) {
      return students.filter((student) => teacherClassIds.has(Number(student?.class_id ?? student?.classId ?? 0)));
    }

    if (teacherId) {
      return students.filter((student) => Number(student?.teacher_id ?? student?.teacherId ?? 0) === Number(teacherId));
    }

    return students;
  }, [students, teacherClassIds, teacherId]);

  const teacherAttendance = useMemo(() => {
    if (teacherId && teacherClassIds.size > 0) {
      return attendance.filter((record) => teacherClassIds.has(Number(record?.class_id ?? record?.classId ?? 0)));
    }

    if (teacherId) {
      const studentIds = new Set(
        teacherStudents.map((student) => Number(student?.student_id ?? student?.id ?? 0)).filter((id) => id > 0)
      );
      return attendance.filter((record) => studentIds.has(Number(record?.student_id ?? record?.studentId ?? 0)));
    }

    return attendance;
  }, [attendance, teacherClassIds, teacherId, teacherStudents]);

  const teacherGrades = useMemo(() => {
    const studentIds = new Set(
      teacherStudents.map((student) => Number(student?.student_id ?? student?.id ?? 0)).filter((id) => id > 0)
    );
    if (studentIds.size === 0) return grades;
    return grades.filter((grade) => studentIds.has(Number(grade?.student_id ?? grade?.studentId ?? 0)));
  }, [grades, teacherStudents]);

  const teacherPayments = useMemo(() => {
    const studentIds = new Set(
      teacherStudents.map((student) => Number(student?.student_id ?? student?.id ?? 0)).filter((id) => id > 0)
    );
    if (studentIds.size === 0) return payments;
    return payments.filter((payment) => studentIds.has(Number(payment?.student_id ?? payment?.studentId ?? 0)));
  }, [payments, teacherStudents]);

  const studentGroups = useMemo(() => {
    const items = teacherClasses.length > 0 ? teacherClasses : [{ class_name: 'All students', class_id: 0, id: 0 }];
    return items.map((item, index) => {
      const classId = Number(item?.class_id ?? item?.id ?? 0);
      const count = classId > 0
        ? teacherStudents.filter((student) => Number(student?.class_id ?? student?.classId ?? 0) === classId).length
        : teacherStudents.length;

      return {
        id: classId,
        label: getDisplayName(item, `Group ${index + 1}`),
        value: count,
        color: palette[index % palette.length],
      };
    }).filter((group) => group.value > 0);
  }, [teacherClasses, teacherStudents]);

  const attendanceGroups = useMemo(() => {
    if (teacherAttendance.length === 0) {
      return [{ label: 'No attendance', value: 1, color: '#cbd5e1' }];
    }

    const classLabels = teacherClasses.length > 0 ? teacherClasses : [{ class_name: 'All groups', class_id: 0, id: 0 }];

    return classLabels.map((item, index) => {
      const classId = Number(item?.class_id ?? item?.id ?? 0);
      const studentsInClass = classId > 0
        ? teacherStudents.filter((student) => Number(student?.class_id ?? student?.classId ?? 0) === classId)
        : teacherStudents;
      const studentIds = new Set(
        studentsInClass.map((student) => Number(student?.student_id ?? student?.id ?? 0)).filter((id) => id > 0)
      );
      const classRecords = teacherAttendance.filter((record) =>
        studentIds.has(Number(record?.student_id ?? record?.studentId ?? 0))
      );
      const present = classRecords.filter((record) => {
        const status = String(record?.status ?? '').toLowerCase();
        return ['present', 'paid', 'attended', 'on_time'].includes(status);
      }).length;
      const total = classRecords.length || 1;
      const percent = (present / total) * 100;

      return {
        id: classId,
        label: getDisplayName(item, `Group ${index + 1}`),
        value: percent,
        color: palette[index % palette.length],
      };
    }).filter((group) => Number.isFinite(group.value));
  }, [teacherAttendance, teacherClasses, teacherStudents]);

  const pointsGroups = useMemo(() => {
    const classLabels = teacherClasses.length > 0 ? teacherClasses : [{ class_name: 'All groups', class_id: 0, id: 0 }];

    return classLabels.map((item, index) => {
      const classId = Number(item?.class_id ?? item?.id ?? 0);
      const studentsInClass = classId > 0
        ? teacherStudents.filter((student) => Number(student?.class_id ?? student?.classId ?? 0) === classId)
        : teacherStudents;
      const studentIds = new Set(
        studentsInClass.map((student) => Number(student?.student_id ?? student?.id ?? 0)).filter((id) => id > 0)
      );
      const classGrades = teacherGrades.filter((grade) =>
        studentIds.has(Number(grade?.student_id ?? grade?.studentId ?? 0))
      );
      const valid = classGrades.filter((grade) => toNumber(grade?.max_value, 0) > 0);
      const average = valid.length > 0
        ? valid.reduce((sum, grade) => {
            const value = toNumber(grade?.grade_value, 0);
            const max = toNumber(grade?.max_value, 0) || 100;
            return sum + ((value / max) * 100);
          }, 0) / valid.length
        : 0;

      return {
        id: classId,
        label: getDisplayName(item, `Group ${index + 1}`),
        value: average,
        color: palette[index % palette.length],
      };
    }).filter((group) => group.value > 0);
  }, [teacherClasses, teacherGrades, teacherStudents]);

  const paymentGroups = useMemo(() => {
    const classLabels = teacherClasses.length > 0 ? teacherClasses : [{ class_name: 'All groups', class_id: 0, id: 0 }];

    return classLabels.map((item, index) => {
      const classId = Number(item?.class_id ?? item?.id ?? 0);
      const studentsInClass = classId > 0
        ? teacherStudents.filter((student) => Number(student?.class_id ?? student?.classId ?? 0) === classId)
        : teacherStudents;
      const studentIds = new Set(
        studentsInClass.map((student) => Number(student?.student_id ?? student?.id ?? 0)).filter((id) => id > 0)
      );
      const classPayments = teacherPayments.filter((payment) =>
        studentIds.has(Number(payment?.student_id ?? payment?.studentId ?? 0))
      );
      const paid = classPayments.filter((payment) => {
        const status = String(payment?.payment_status ?? payment?.status ?? '').toLowerCase();
        return status === 'completed' || status === 'paid' || payment?.is_complete === true;
      }).length;

      return {
        id: classId,
        label: getDisplayName(item, `Group ${index + 1}`),
        value: paid,
        color: palette[index % palette.length],
      };
    }).filter((group) => group.value > 0);
  }, [teacherClasses, teacherPayments, teacherStudents]);

  const totalAttendanceRecords = teacherAttendance.length;
  const presentCount = teacherAttendance.filter((record) => {
    const status = String(record?.status ?? '').toLowerCase();
    return ['present', 'paid', 'attended', 'on_time'].includes(status);
  }).length;
  const overallAttendanceRate = totalAttendanceRecords > 0 ? (presentCount / totalAttendanceRecords) * 100 : 0;

  const scoredGrades = teacherGrades.filter((grade) => toNumber(grade?.max_value, 0) > 0);
  const totalScore = scoredGrades.reduce((sum, grade) => {
    const value = toNumber(grade?.grade_value, 0);
    const max = toNumber(grade?.max_value, 0) || 100;
    return sum + ((value / max) * 100);
  }, 0);
  const averageGrade = scoredGrades.length > 0 ? totalScore / scoredGrades.length : 0;

  const completedPaymentStudentIds = new Set(
    teacherPayments
      .filter((payment) => {
        const status = String(payment?.payment_status ?? payment?.status ?? '').toLowerCase();
        return status === 'completed' || status === 'paid' || payment?.is_complete === true;
      })
      .map((p) => Number(p?.student_id ?? p?.studentId ?? 0))
      .filter((id) => id > 0)
  );

  const completedPayments = completedPaymentStudentIds.size; // unique students who paid
  const totalStudentsForPayments = teacherStudents.length > 0
    ? teacherStudents.length
    : Array.from(new Set(teacherPayments.map((p) => Number(p?.student_id ?? p?.studentId ?? 0))).values()).filter((id) => id > 0).length;

  const paymentRate = totalStudentsForPayments > 0 ? (completedPayments / totalStudentsForPayments) * 100 : 0;

  const sectionMap: Record<SectionKey, { label: string; total: string; detail: string; data: { label: string; value: number; color: string }[]; icon: any }> = {
    students: {
      label: 'Students',
      total: `${teacherStudents.length}`,
      detail: `${teacherClasses.length || 1} groups`,
      data: studentGroups,
      icon: Users,
    },
    attendance: {
      label: 'Attendance',
      total: `${overallAttendanceRate.toFixed(1)}%`,
      detail: `${presentCount}/${totalAttendanceRecords || 0} present`,
      data: attendanceGroups,
      icon: CalendarCheck2,
    },
    points: {
      label: 'Points',
      total: `${averageGrade.toFixed(1)}%`,
      detail: `${scoredGrades.length} grade entries`,
      data: pointsGroups,
      icon: TrendingUp,
    },
    payments: {
      label: 'Payments',
      total: `${paymentRate.toFixed(1)}%`,
      detail: `${completedPayments}/${totalStudentsForPayments || 0} paid`,
      data: paymentGroups,
      icon: CircleDollarSign,
    },
  };

  const selectedSection = sectionMap[activeSection];
  const chartData = selectedSection.data.length > 0 ? selectedSection.data : [{ id: 0, label: 'No data', value: 1, color: '#cbd5e1' }];
  const [selectedGroup, setSelectedGroup] = useState<{ id: number; label: string } | null>(null);
  const [groupSearch, setGroupSearch] = useState('');

  const studentsInSelectedGroup = useMemo(() => {
    if (!selectedGroup) return [] as any[];
    if (selectedGroup.id === 0) return teacherStudents;
    return teacherStudents.filter((s) => Number(s?.class_id ?? s?.classId ?? 0) === selectedGroup.id);
  }, [selectedGroup, teacherStudents]);

  const filteredGroupStudents = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return studentsInSelectedGroup;
    return studentsInSelectedGroup.filter((s) => {
      const name = `${s.first_name || ''} ${s.last_name || ''}`.trim().toLowerCase();
      const email = String(s.email || '').toLowerCase();
      const id = String(s.student_id || s.id || '').toLowerCase();
      return name.includes(q) || email.includes(q) || id.includes(q);
    });
  }, [groupSearch, studentsInSelectedGroup]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/20">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 dark:border-white/10">
        {(
          [
            { key: 'students', label: 'Student count', icon: Users },
            { key: 'attendance', label: 'Attendance', icon: CalendarCheck2 },
            { key: 'points', label: 'Points', icon: TrendingUp },
            { key: 'payments', label: 'Payments', icon: CircleDollarSign },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveSection(key)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black transition ${
              activeSection === key
                ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-sky-50 p-4 dark:border-white/10 dark:from-slate-900/50 dark:via-slate-900/70 dark:to-slate-900">
          <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            <span>{selectedSection.label}</span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {selectedSection.detail}
            </span>
          </div>

          <div className="relative mx-auto flex h-[300px] w-[300px] items-center justify-center">
            <div className="absolute inset-0 flex items-center justify-center">
              <PieChart data={chartData} size={260} strokeWidth={42} />
            </div>
            <div className="relative z-10 flex h-[118px] w-[118px] items-center justify-center rounded-full border border-slate-200 bg-white shadow-inner dark:border-white/10 dark:bg-slate-950">
              <div className="text-center">
                <div className="text-3xl font-black leading-none text-slate-900 dark:text-white">{selectedSection.total}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  {selectedSection.label}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {chartData.map((item: any, index: number) => {
            const percent = chartData.reduce((sum, entry) => sum + entry.value, 0) > 0
              ? (item.value / chartData.reduce((sum, entry) => sum + entry.value, 0)) * 100
              : 0;

            return (
              <div
                key={`${item.label}-${index}`}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedGroup({ id: Number(item.id ?? 0), label: item.label })}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedGroup({ id: Number(item.id ?? 0), label: item.label }); }}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-900/40 cursor-pointer"
                style={{ borderLeft: `4px solid ${item.color}` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{item.label}</span>
                  </div>
                  <span className="text-sm font-black text-slate-900 dark:text-white">{item.value}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: item.color }}
                  />
                </div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  {percent.toFixed(0)}%
                </div>
              </div>
            );
          })}
        </div>

      <Dialog open={!!selectedGroup} onOpenChange={(open) => { if (!open) { setSelectedGroup(null); setGroupSearch(''); } }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="flex items-center gap-2">{selectedGroup ? selectedGroup.label : 'Group'} <span className="text-sm font-normal text-slate-500">students</span></DialogTitle>
                <DialogDescription className="mt-1">{selectedGroup ? `${studentsInSelectedGroup.length} students` : ''}</DialogDescription>
              </div>
              <div className="min-w-[220px]">
                <Label className="mb-1 text-[11px] uppercase">Search students</Label>
                <Input value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} placeholder="Name, email, or id" />
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4 max-h-[420px] overflow-auto">
            {filteredGroupStudents.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">No students found.</div>
            ) : (
              <div className="divide-y">
                {filteredGroupStudents.map((s) => {
                  const name = `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.name || 'Unnamed';
                  const initials = name.split(' ').map((p: string) => p[0]).slice(0,2).join('').toUpperCase();
                  return (
                    <div key={s.student_id ?? s.id} className="flex items-center justify-between gap-4 p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">{initials}</div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{name}</div>
                          <div className="text-xs text-slate-500">{s.email || s.enrollment || `ID: ${s.student_id ?? s.id ?? ''}`}</div>
                        </div>
                      </div>
                      <div className="text-sm text-slate-700">{s.phone || ''}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <div className="w-full flex justify-end">
              <Button variant="ghost" onClick={() => { setSelectedGroup(null); setGroupSearch(''); }}>Close</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-slate-900/40">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
          <BarChart3 className="h-4 w-4 text-blue-600" />
          {selectedSection.label} overview
        </div>
        <div className="text-sm font-black text-slate-900 dark:text-white">{selectedSection.total}</div>
      </div>
    </div>
  );
};

export default OverallStatisticsTab;