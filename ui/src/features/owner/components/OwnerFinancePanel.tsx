// Finance panel for owner-level payment review.

import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, DollarSign, Search, Users, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/helpers';
import { buildOwnerPaymentMonthStats, buildOwnerTeacherEarnings } from '../utils';
import type { OwnerManagerStatisticsCollections } from '../types';

interface Props {
  collections: OwnerManagerStatisticsCollections;
  loading: boolean;
}

const getId = (item: any, key: string) => Number(item?.[key] || item?.id || 0);
const getName = (item: any, fallback: string) =>
  [item?.first_name, item?.last_name].filter(Boolean).join(' ').trim() || item?.class_name || fallback;
const getMonthKey = (value: unknown) => {
  const date = value ? new Date(String(value)) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};
const isPaidPayment = (payment: any) => {
  const status = String(payment?.status || payment?.payment_status || '').toLowerCase();
  return status === 'paid' || status === 'completed';
};

export const OwnerFinancePanel = ({ collections, loading }: Props) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [mode, setMode] = useState<'stats' | 'teachers' | 'detail'>('stats');
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const paymentStats = useMemo(
    () => buildOwnerPaymentMonthStats(collections.students, collections.payments, selectedMonth),
    [collections.payments, collections.students, selectedMonth]
  );

  const teacherRows = useMemo(
    () => buildOwnerTeacherEarnings(
      collections.students,
      collections.teachers,
      collections.classes,
      collections.payments,
      selectedMonth
    ),
    [collections.classes, collections.payments, collections.students, collections.teachers, selectedMonth]
  );

  const totalEarned = teacherRows.reduce((sum, row) => sum + row.earnedAmount, 0);
  const selectedTeacher = collections.teachers.find((teacher) => getId(teacher, 'teacher_id') === selectedTeacherId);
  const selectedTeacherName = selectedTeacher ? getName(selectedTeacher, `Teacher ${selectedTeacherId}`) : 'Teacher';
  const filteredTeachers = teacherRows.filter((row) => row.teacherName.toLowerCase().includes(searchTerm.toLowerCase()));

  const classGroups = useMemo(() => {
    if (!selectedTeacherId) return [];
    const teacherClasses = collections.classes.filter((cls) => Number(cls?.teacher_id || 0) === selectedTeacherId);
    return teacherClasses.map((cls) => {
      const classId = getId(cls, 'class_id');
      const classStudents = collections.students.filter((student) => Number(student?.class_id || 0) === classId);
      const rows = classStudents.map((student) => {
        const studentId = getId(student, 'student_id');
        const studentPayments = collections.payments.filter((payment) =>
          Number(payment?.student_id || 0) === studentId &&
          getMonthKey(payment?.payment_date || payment?.created_at) === selectedMonth &&
          isPaidPayment(payment)
        );
        const paidAmount = studentPayments.reduce((sum, payment) => sum + Number(payment?.amount || 0), 0);
        return {
          id: studentId,
          name: getName(student, `Student ${studentId}`),
          paid: studentPayments.length > 0,
          paidAmount,
          expectedAmount: Number(cls?.payment_amount || 0),
        };
      });
      return {
        id: classId,
        name: cls?.class_name || `Class ${classId}`,
        paidCount: rows.filter((row) => row.paid).length,
        students: rows,
      };
    });
  }, [collections.classes, collections.payments, collections.students, selectedMonth, selectedTeacherId]);

  const statCards = [
    { label: 'Collected', value: formatMoney(totalEarned), detail: `${paymentStats.paidPercent}% paid`, icon: DollarSign, tone: 'from-emerald-500 to-teal-500' },
    { label: 'Paid students', value: paymentStats.paidStudents.toLocaleString(), detail: `${paymentStats.unpaidStudents} unpaid`, icon: CheckCircle2, tone: 'from-blue-500 to-cyan-500' },
    { label: 'Unpaid students', value: paymentStats.unpaidStudents.toLocaleString(), detail: `${paymentStats.unpaidPercent}% remaining`, icon: XCircle, tone: 'from-rose-500 to-orange-500' },
    { label: 'Teachers', value: teacherRows.length.toLocaleString(), detail: 'Open teacher finance', icon: Users, tone: 'from-violet-500 to-fuchsia-500' },
  ];

  if (loading) {
    return <div className="rounded-xl border bg-white p-8 text-center text-sm font-semibold text-slate-500">Loading finance...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">Finance dashboard</h2>
          <p className="text-sm text-slate-500 dark:text-white/55">Monthly collection overview first, teacher details when needed.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="w-40" />
          {mode !== 'stats' && <Button variant="outline" onClick={() => setMode('stats')}><ArrowLeft className="mr-2 h-4 w-4" />Stats</Button>}
          <Button onClick={() => setMode('teachers')} className="bg-emerald-600 text-white hover:bg-emerald-700">
            <Users className="mr-2 h-4 w-4" />Teachers
          </Button>
        </div>
      </div>

      {(mode === 'stats' || mode === 'teachers') && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className={cn('overflow-hidden border-0 bg-gradient-to-br text-white shadow-lg', card.tone)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase text-white/80">{card.label}</p>
                      <p className="mt-2 text-3xl font-black">{card.value}</p>
                      <p className="mt-1 text-sm font-semibold text-white/80">{card.detail}</p>
                    </div>
                    <Icon className="h-8 w-8 text-white/85" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {mode === 'stats' && (
        <Card>
          <CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-lg font-black text-slate-950 dark:text-white">Teacher finance is hidden until you need it.</p>
              <p className="text-sm text-slate-500 dark:text-white/55">Click Teachers to choose a teacher and inspect grouped class payments.</p>
            </div>
            <Button onClick={() => setMode('teachers')} className="bg-violet-600 text-white hover:bg-violet-700">
              Open teachers <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {mode === 'teachers' && (
        <div className="space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input className="pl-9" placeholder="Search teachers..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredTeachers.map((teacher) => (
              <button
                key={teacher.teacherId}
                type="button"
                onClick={() => {
                  setSelectedTeacherId(teacher.teacherId);
                  setMode('detail');
                }}
                className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-white/10 dark:bg-white/[0.03]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950 dark:text-white">{teacher.teacherName}</p>
                    <p className="mt-1 text-sm text-slate-500">{teacher.classCount} groups · {teacher.totalStudents} students</p>
                  </div>
                  <p className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700">{formatMoney(teacher.earnedAmount)}</p>
                </div>
                <div className="mt-3 flex gap-2 text-xs font-bold">
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">{teacher.paidStudents} paid</span>
                  <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">{teacher.unpaidStudents} unpaid</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'detail' && (
        <div className="space-y-3">
          <Button variant="outline" onClick={() => setMode('teachers')}><ArrowLeft className="mr-2 h-4 w-4" />Teachers</Button>
          <h3 className="text-xl font-black text-slate-950 dark:text-white">{selectedTeacherName}</h3>
          {classGroups.map((group) => (
            <Card key={group.id}>
              <CardContent className="p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-black text-slate-950 dark:text-white">{group.name}</p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">{group.paidCount}/{group.students.length} paid</span>
                </div>
                <div className="divide-y rounded-lg border">
                  {group.students.map((student) => (
                    <div key={student.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-3 py-2 text-sm">
                      <span className="truncate font-semibold">{student.name}</span>
                      <span className="text-xs font-bold text-slate-500">{formatMoney(student.paid ? student.paidAmount : student.expectedAmount)}</span>
                      <span className={cn('rounded-full px-2 py-1 text-xs font-black', student.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
                        {student.paid ? 'Paid' : 'Not paid'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
