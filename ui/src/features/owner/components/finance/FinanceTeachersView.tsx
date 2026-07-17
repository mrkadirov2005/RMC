import { CheckCircle2, Search, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/helpers';

interface TeacherRow {
  teacherId: number;
  teacherName: string;
  classCount: number;
  totalStudents: number;
  earnedAmount: number;
}

interface StudentPaymentRow {
  id: number;
  name: string;
  paid: boolean;
  paidAmount: number;
}

interface TeacherGroup {
  id: number;
  name: string;
  unpaidCount: number;
  totalStudents: number;
  groupCollected: number;
  students: StudentPaymentRow[];
}

interface Props {
  searchTerm: string;
  selectedTeacherId: number | null;
  selectedGroupId: number | null;
  selectedTeacherRow: TeacherRow | null;
  selectedTeacherName: string;
  filteredTeachers: TeacherRow[];
  teacherGroups: TeacherGroup[];
  selectedGroup: TeacherGroup | null;
  salaryPercent: number;
  initials: (name: string) => string;
  onSearchChange: (value: string) => void;
  onTeacherSelect: (teacherId: number) => void;
  onGroupToggle: (groupId: number) => void;
}

export const FinanceTeachersView = ({
  searchTerm,
  selectedTeacherId,
  selectedGroupId,
  selectedTeacherRow,
  selectedTeacherName,
  filteredTeachers,
  teacherGroups,
  selectedGroup,
  salaryPercent,
  initials,
  onSearchChange,
  onTeacherSelect,
  onGroupToggle,
}: Props) => (
  <>
    <div className="rounded-md border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-center gap-2 border-b p-2 dark:border-white/10">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            className="h-8 bg-slate-100 pl-8 text-xs font-semibold"
            placeholder="Qidirish..."
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <span className="text-xs font-bold text-slate-500">{filteredTeachers.length} ta o'qituvchi</span>
      </div>

      <div className={cn(selectedTeacherId ? 'flex gap-2 overflow-x-auto p-2' : 'divide-y dark:divide-white/10')}>
        {filteredTeachers.map((teacher, index) => {
          const active = selectedTeacherId === teacher.teacherId;
          const teacherSalary = Math.round((teacher.earnedAmount * salaryPercent) / 100);
          return (
            <button
              key={teacher.teacherId}
              type="button"
              onClick={() => onTeacherSelect(teacher.teacherId)}
              className={cn(
                'text-left transition',
                selectedTeacherId ? 'flex min-w-[190px] items-center gap-2 rounded-md border px-2 py-1.5' : 'grid w-full grid-cols-[40px_1fr_auto_auto] items-center gap-3 px-3 py-2 text-xs',
                active ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-cyan-300 hover:bg-cyan-50'
              )}
            >
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded text-xs font-black text-white', index % 2 ? 'bg-orange-600' : 'bg-blue-600')}>
                {initials(teacher.teacherName)}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-black text-slate-950">{teacher.teacherName}</span>
                <span className="block truncate text-[10px] font-bold text-slate-500">
                  {teacher.classCount} guruh · {teacher.totalStudents} talaba
                </span>
              </span>
              {!selectedTeacherId && (
                <span className="hidden rounded bg-blue-100 px-2 py-1 text-[10px] font-black text-blue-700 sm:inline">
                  {formatMoney(teacher.earnedAmount)}
                </span>
              )}
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-700">
                {formatMoney(teacherSalary)}
              </span>
            </button>
          );
        })}
      </div>
    </div>

    {selectedTeacherRow && (
      <TeacherGroupsHeader
        selectedTeacherName={selectedTeacherName}
        selectedTeacherRow={selectedTeacherRow}
        teacherGroups={teacherGroups}
        selectedGroupId={selectedGroupId}
        salaryPercent={salaryPercent}
        onGroupToggle={onGroupToggle}
      />
    )}

    {selectedGroup && <SelectedGroupTable selectedGroup={selectedGroup} />}
  </>
);

const TeacherGroupsHeader = ({
  selectedTeacherName,
  selectedTeacherRow,
  teacherGroups,
  selectedGroupId,
  salaryPercent,
  onGroupToggle,
}: {
  selectedTeacherName: string;
  selectedTeacherRow: TeacherRow;
  teacherGroups: TeacherGroup[];
  selectedGroupId: number | null;
  salaryPercent: number;
  onGroupToggle: (groupId: number) => void;
}) => (
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

    <div className="flex gap-1.5 overflow-x-auto border-b p-2 dark:border-white/10">
      {teacherGroups.length === 0 ? (
        <div className="p-3 text-sm font-semibold text-slate-500">Bu o'qituvchida guruh topilmadi.</div>
      ) : (
        teacherGroups.map((group) => {
          const active = selectedGroupId === group.id;
          const paidPercent = group.totalStudents > 0
            ? Math.round(((group.totalStudents - group.unpaidCount) / group.totalStudents) * 100)
            : 0;
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => onGroupToggle(group.id)}
              className={cn(
                'shrink-0 rounded border px-3 py-1.5 text-xs font-black transition',
                active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:bg-cyan-50'
              )}
            >
              <span className="block truncate">{group.name}</span>
              <span className="mt-1 flex h-1 overflow-hidden rounded-full bg-slate-100">
                <span className="block h-full bg-emerald-500" style={{ width: `${paidPercent}%` }} />
                <span className="block h-full bg-amber-500" style={{ width: `${Math.max(100 - paidPercent, 0)}%` }} />
              </span>
            </button>
          );
        })
      )}
    </div>
  </div>
);

const SelectedGroupTable = ({ selectedGroup }: { selectedGroup: TeacherGroup }) => (
  <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
    <CardContent className="p-0">
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="flex items-center justify-start gap-5 border-b bg-slate-100 px-3 py-2 text-[11px] font-black uppercase text-slate-500">
            <span className="w-8 shrink-0">#</span>
            <span className="w-52 shrink-0">Talaba</span>
            <span className="w-44 shrink-0">Guruh</span>
            <span className="w-28 shrink-0">To'lov</span>
            <span className="w-24 shrink-0">Holat</span>
          </div>
          <div className="flex items-center justify-start gap-5 border-b bg-blue-50/70 px-3 py-2 text-xs">
            <span className="w-8 shrink-0 font-black text-slate-400">-</span>
            <span className="w-52 shrink-0 truncate font-black text-slate-950">
              {selectedGroup.name}
              {selectedGroup.unpaidCount > 0 && (
                <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700">
                  {selectedGroup.unpaidCount} qarzdor
                </span>
              )}
            </span>
            <span className="w-44 shrink-0 truncate text-slate-500">{selectedGroup.name}</span>
            <span className="w-28 shrink-0 font-black text-blue-700">{formatMoney(selectedGroup.groupCollected)}</span>
            <span className="w-24 shrink-0 text-[10px] font-black text-slate-500">{selectedGroup.totalStudents} ta</span>
          </div>
          <div className="divide-y dark:divide-white/10">
            {selectedGroup.students.map((student, index) => (
              <StudentPaymentRow key={student.id} student={student} groupName={selectedGroup.name} index={index} />
            ))}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

const StudentPaymentRow = ({ student, groupName, index }: { student: StudentPaymentRow; groupName: string; index: number }) => (
  <div className="flex items-center justify-start gap-5 px-3 py-1.5 text-xs hover:bg-cyan-50/50">
    <span className="w-8 shrink-0 font-semibold text-slate-400">{index + 1}</span>
    <span className="w-52 shrink-0 truncate font-black text-slate-950 dark:text-white">{student.name}</span>
    <span className="w-44 shrink-0 truncate text-slate-500">{groupName}</span>
    <span className="w-28 shrink-0 font-black text-slate-700">{student.paid ? formatMoney(student.paidAmount) : '-'}</span>
    <span className="w-24 shrink-0">
      <span className={cn('inline-flex items-center rounded px-2 py-1 text-[10px] font-black', student.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
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
);
