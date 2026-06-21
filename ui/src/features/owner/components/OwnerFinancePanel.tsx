// Finance panel for owner-level payment review.

import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  DollarSign,
  Search,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
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

const salaryPercent = 20;
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
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'T';

export const OwnerFinancePanel = ({ collections, loading }: Props) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
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

  const monthPayments = useMemo(
    () =>
      collections.payments.filter(
        (payment) =>
          isPaidPayment(payment) &&
          getMonthKey(payment?.payment_date || payment?.created_at) === selectedMonth
      ),
    [collections.payments, selectedMonth]
  );

  const totalCollected = monthPayments.reduce((sum, payment) => sum + Number(payment?.amount || 0), 0);
  const totalSalary = Math.round((totalCollected * salaryPercent) / 100);
  const filteredTeachers = teacherRows.filter((row) =>
    row.teacherName.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  const selectedTeacherRow = teacherRows.find((teacher) => teacher.teacherId === selectedTeacherId) || null;
  const selectedTeacher = collections.teachers.find((teacher) => getId(teacher, 'teacher_id') === selectedTeacherId);
  const selectedTeacherName = selectedTeacherRow?.teacherName || (selectedTeacher ? getName(selectedTeacher, 'Teacher') : '');

  const teacherGroups = useMemo(() => {
    if (!selectedTeacherId) return [];
    const teacherClasses = collections.classes.filter((cls) => Number(cls?.teacher_id || 0) === selectedTeacherId);

    return teacherClasses.map((cls) => {
      const classId = getId(cls, 'class_id');
      const classStudents = collections.students.filter((student) => Number(student?.class_id || 0) === classId);
      const students = classStudents.map((student) => {
        const studentId = getId(student, 'student_id');
        const studentPayments = monthPayments.filter((payment) => Number(payment?.student_id || 0) === studentId);
        const paidAmount = studentPayments.reduce((sum, payment) => sum + Number(payment?.amount || 0), 0);
        return {
          id: studentId,
          name: getName(student, `Student ${studentId}`),
          paid: studentPayments.length > 0,
          paidAmount,
          expectedAmount: Number(student?.payment_amount || cls?.payment_amount || 0),
        };
      });
      const paidCount = students.filter((student) => student.paid).length;
      const groupCollected = students.reduce((sum, student) => sum + student.paidAmount, 0);
      return {
        id: classId,
        name: cls?.class_name || `Group ${classId}`,
        paidCount,
        unpaidCount: Math.max(students.length - paidCount, 0),
        totalStudents: students.length,
        groupCollected,
        salaryAmount: Math.round((groupCollected * salaryPercent) / 100),
        students,
      };
    });
  }, [collections.classes, collections.students, monthPayments, selectedTeacherId]);

  const selectedGroup = teacherGroups.find((group) => group.id === selectedGroupId) || null;

  if (loading) {
    return (
      <div className="rounded-md border bg-white p-6 text-center text-sm font-black text-slate-500">
        Loading finance...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-blue-100 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center gap-2 border-b bg-gradient-to-r from-blue-50 via-white to-emerald-50 p-3 dark:border-white/10 dark:from-white/[0.04] dark:via-white/[0.03] dark:to-white/[0.04]">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white">
            <DollarSign className="h-4 w-4" />
          </div>
          <p className="mr-2 text-sm font-black text-slate-950 dark:text-white">Maoshlar</p>
          <Input
            type="month"
            value={selectedMonth}
            onChange={(event) => {
              setSelectedMonth(event.target.value);
              setSelectedGroupId(null);
            }}
            className="h-8 w-40 bg-slate-100 text-xs font-bold"
          />
          <div className="ml-auto flex flex-wrap gap-1.5">
            <span className="rounded bg-blue-100 px-2 py-1 text-[11px] font-black text-blue-700">
              <Users className="mr-1 inline h-3 w-3" />
              {teacherRows.length} o'qituvchi
            </span>
            <span className="rounded bg-emerald-100 px-2 py-1 text-[11px] font-black text-emerald-700">
              <DollarSign className="mr-1 inline h-3 w-3" />
              {formatMoney(totalCollected)}
            </span>
            <span className="rounded bg-lime-100 px-2 py-1 text-[11px] font-black text-lime-700">
              <TrendingUp className="mr-1 inline h-3 w-3" />
              {formatMoney(totalSalary)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-2 md:grid-cols-5">
          {[
            ['Jami tolov', formatMoney(totalCollected), 'bg-blue-600'],
            ['Maosh 20%', formatMoney(totalSalary), 'bg-emerald-600'],
            ["To'lagan", paymentStats.paidStudents, 'bg-cyan-600'],
            ['Qarzdor', paymentStats.unpaidStudents, 'bg-rose-600'],
            ['Ulash', `${paymentStats.paidPercent}%`, 'bg-violet-600'],
          ].map(([label, value, tone]) => (
            <div key={label} className={cn('rounded px-2 py-1.5 text-white', tone as string)}>
              <p className="text-[10px] font-black uppercase text-white/75">{label}</p>
              <p className="text-sm font-black leading-tight">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center gap-2 border-b p-2 dark:border-white/10">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-8 bg-slate-100 pl-8 text-xs font-semibold"
              placeholder="Qidirish..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <span className="text-xs font-bold text-slate-500">{filteredTeachers.length} ta o'qituvchi</span>
        </div>

        <div className="flex gap-2 overflow-x-auto p-2">
          {filteredTeachers.map((teacher, index) => {
            const active = selectedTeacherId === teacher.teacherId;
            const teacherSalary = Math.round((teacher.earnedAmount * salaryPercent) / 100);
            return (
              <button
                key={teacher.teacherId}
                type="button"
                onClick={() => {
                  setSelectedTeacherId(teacher.teacherId);
                  setSelectedGroupId(null);
                }}
                className={cn(
                  'flex min-w-[190px] items-center gap-2 rounded-md border px-2 py-1.5 text-left transition',
                  active
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-cyan-300 hover:bg-cyan-50'
                )}
              >
                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded text-xs font-black text-white', index % 2 ? 'bg-orange-600' : 'bg-blue-600')}>
                  {initials(teacher.teacherName)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-black text-slate-950">{teacher.teacherName}</span>
                  <span className="block truncate text-[10px] font-bold text-slate-500">
                    {teacher.classCount} guruh · {teacher.totalStudents} talaba
                  </span>
                </span>
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-700">
                  {formatMoney(teacherSalary)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedTeacherRow && (
        <div className="rounded-md border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex flex-wrap items-center gap-2 border-b bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-sm font-black text-slate-950 dark:text-white">{selectedTeacherName}</p>
            <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">{selectedTeacherRow.classCount} guruh</span>
            <span className="rounded bg-cyan-100 px-2 py-1 text-[10px] font-black text-cyan-700">{selectedTeacherRow.totalStudents} talaba</span>
            <span className="ml-auto rounded bg-blue-100 px-2 py-1 text-[10px] font-black text-blue-700">
              Jami to'lov: {formatMoney(selectedTeacherRow.earnedAmount)}
            </span>
            <span className="rounded bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">
              Maosh ({salaryPercent}%): {formatMoney(Math.round((selectedTeacherRow.earnedAmount * salaryPercent) / 100))}
            </span>
          </div>

          <div className="divide-y dark:divide-white/10">
            {teacherGroups.length === 0 ? (
              <div className="p-4 text-sm font-semibold text-slate-500">Bu o'qituvchida guruh topilmadi.</div>
            ) : (
              teacherGroups.map((group, index) => {
                const active = selectedGroupId === group.id;
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setSelectedGroupId(active ? null : group.id)}
                    className={cn(
                      'grid w-full grid-cols-[36px_1fr_auto_auto_auto] items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-blue-50/70',
                      active && 'bg-blue-50'
                    )}
                  >
                    <span className="text-center font-black text-slate-400">{index + 1}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-black text-slate-950">{group.name}</span>
                      <span className="text-[10px] font-semibold text-slate-500">{group.totalStudents} talaba</span>
                    </span>
                    <span className="rounded bg-blue-100 px-2 py-1 font-black text-blue-700">{formatMoney(group.groupCollected)}</span>
                    <span className={cn('rounded px-2 py-1 font-black', group.unpaidCount ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700')}>
                      {group.unpaidCount ? `${group.unpaidCount} qarzdor` : "hammasi to'lagan"}
                    </span>
                    <ChevronDown className={cn('h-4 w-4 text-slate-400 transition', active && 'rotate-180')} />
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {selectedGroup && (
        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          <CardContent className="p-0">
            <div className="grid grid-cols-[44px_1.2fr_1fr_130px_120px] border-b bg-slate-100 px-3 py-2 text-[11px] font-black uppercase text-slate-500">
              <span>#</span>
              <span>Talaba</span>
              <span>Guruh</span>
              <span className="text-right">To'lov</span>
              <span className="text-center">Holat</span>
            </div>
            <div className="divide-y dark:divide-white/10">
              {selectedGroup.students.map((student, index) => (
                <div
                  key={student.id}
                  className="grid grid-cols-[44px_1.2fr_1fr_130px_120px] items-center px-3 py-1.5 text-xs hover:bg-cyan-50/50"
                >
                  <span className="font-semibold text-slate-400">{index + 1}</span>
                  <span className="truncate font-black text-slate-950 dark:text-white">{student.name}</span>
                  <span className="truncate text-slate-500">{selectedGroup.name}</span>
                  <span className="text-right font-black text-slate-700">
                    {student.paid ? formatMoney(student.paidAmount) : '-'}
                  </span>
                  <span className="text-center">
                    <span className={cn('inline-flex items-center rounded px-2 py-1 text-[10px] font-black', student.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
                      {student.paid ? (
                        <>
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Tolagan
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-1 h-3 w-3" />
                          Qarzdor
                        </>
                      )}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
