import { BarChart3, BookOpen, GraduationCap, UserCheck, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Student } from '../types';

interface Option {
  id?: number;
  label: string;
  value: string | number;
}

interface Props {
  students: Student[];
  teacherOptions: Option[];
  loading: boolean;
}

const toNumberId = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

export const StudentsStatisticsTab = ({ students, teacherOptions, loading }: Props) => {
  const teacherCounts = new Map<number, { id: number; name: string; count: number }>();
  for (const teacher of teacherOptions) {
    const teacherId = toNumberId(teacher.value || teacher.id);
    if (teacherId) teacherCounts.set(teacherId, { id: teacherId, name: teacher.label, count: 0 });
  }
  for (const student of students) {
    const teacherId = toNumberId(student.teacher_id);
    if (!teacherId) continue;
    const existing = teacherCounts.get(teacherId) || { id: teacherId, name: `Teacher #${teacherId}`, count: 0 };
    teacherCounts.set(teacherId, { ...existing, count: existing.count + 1 });
  }
  const teacherRows = Array.from(teacherCounts.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const unassignedCount = students.filter((student) => !toNumberId(student.teacher_id)).length;
  const assignedCount = students.length - unassignedCount;
  const activeCount = students.filter((student) => String(student.status).toLowerCase() === 'active').length;
  const topTeacher = teacherRows.find((teacher) => teacher.count > 0);

  const cards = [
    { label: 'Total students', value: students.length, icon: Users, sub: 'All scoped students', gradient: 'from-blue-500 via-blue-600 to-indigo-600 shadow-blue-500/40' },
    { label: 'Assigned students', value: assignedCount, icon: UserCheck, sub: 'Students with teachers', gradient: 'from-emerald-400 via-emerald-500 to-teal-600 shadow-emerald-500/40' },
    { label: 'Active students', value: activeCount, icon: GraduationCap, sub: 'Current active status', gradient: 'from-amber-400 via-orange-500 to-orange-600 shadow-orange-500/40' },
    { label: 'Top teacher', value: topTeacher?.count || 0, icon: BookOpen, sub: topTeacher?.name || 'No assignments yet', gradient: 'from-violet-500 via-purple-600 to-indigo-600 shadow-violet-500/40' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className={`border-0 bg-gradient-to-br ${card.gradient} shadow-md`}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white/20 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-white/80">{card.label}</p>
                  <p className="text-2xl font-bold text-white">{loading ? '-' : card.value}</p>
                  <p className="truncate text-xs text-white/70">{card.sub}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Students per Teacher</h3>
          </div>
          {loading ? (
            <p className="py-10 text-center text-muted-foreground">Loading statistics...</p>
          ) : teacherRows.length === 0 && unassignedCount === 0 ? (
            <p className="py-10 text-center text-muted-foreground">No student statistics found.</p>
          ) : (
            <div className="space-y-3">
              {teacherRows.map((teacher, i) => {
                const maxCount = teacherRows[0]?.count || 1;
                const pct = Math.max((teacher.count / maxCount) * 100, 2);
                const barColors = [
                  'from-blue-500 to-indigo-600',
                  'from-emerald-400 to-teal-600',
                  'from-amber-400 to-orange-500',
                  'from-violet-500 to-purple-600',
                  'from-rose-400 to-pink-600',
                  'from-cyan-400 to-sky-600',
                ];
                return (
                  <div key={teacher.id || teacher.name} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 truncate text-sm font-medium">{teacher.name}</span>
                    <div className="relative flex-1 h-8 rounded-md bg-slate-100 dark:bg-muted overflow-hidden">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-md bg-gradient-to-r ${barColors[i % barColors.length]} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                      <span className="absolute inset-y-0 right-2 flex items-center text-xs font-bold text-slate-700 dark:text-slate-200">
                        {teacher.count}
                      </span>
                    </div>
                  </div>
                );
              })}
              {unassignedCount > 0 && (
                <div className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-sm font-medium text-muted-foreground">Unassigned</span>
                  <div className="relative flex-1 h-8 rounded-md bg-slate-100 dark:bg-muted overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-md bg-gradient-to-r from-slate-300 to-slate-400 transition-all duration-500"
                      style={{ width: `${Math.max((unassignedCount / (teacherRows[0]?.count || 1)) * 100, 2)}%` }}
                    />
                    <span className="absolute inset-y-0 right-2 flex items-center text-xs font-bold text-slate-700 dark:text-slate-200">
                      {unassignedCount}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
