import { Award, BookOpen, Coins, GraduationCap, School, ShieldCheck, UserCheck, Users, VenusAndMars } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

const normalizeLabel = (value: unknown, fallback: string) => {
  const label = String(value || '').trim();
  return label || fallback;
};

const percent = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

const topCounts = (items: Student[], getKey: (student: Student) => string | null, limit = 6) => {
  const counts = new Map<string, number>();
  for (const student of items) {
    const key = getKey(student);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
};

const MetricCard = ({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: typeof Users;
  color: string;
}) => (
  <Card className={`${color} owner-primary-card overflow-hidden border-0 text-white shadow-sm`}>
    <CardContent className="flex items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase text-white/80">{label}</p>
        <p className="mt-1 text-2xl font-extrabold tracking-normal">{value}</p>
        <p className="mt-1 truncate text-xs font-medium text-white/85">{sub}</p>
      </div>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/18">
        <Icon className="h-5 w-5" />
      </div>
    </CardContent>
  </Card>
);

const ProgressRow = ({ label, value, total, color }: { label: string; value: number; total: number; color: string }) => {
  const width = percent(value, total);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-slate-700 dark:text-foreground">{label}</span>
        <span className="font-bold text-slate-950 dark:text-foreground">{value} / {total}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-muted">
        <div className={`${color} h-full rounded-full`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
};

const CountList = ({
  title,
  icon: Icon,
  rows,
  total,
  color,
  empty,
}: {
  title: string;
  icon: typeof Users;
  rows: { label: string; count: number }[];
  total: number;
  color: string;
  empty: string;
}) => (
  <Card className="border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
    <CardContent className="p-3">
      <div className="mb-3 flex items-center gap-2">
        <div className={`${color} flex h-7 w-7 items-center justify-center rounded-lg text-white`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-sm font-semibold text-slate-950 dark:text-foreground">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-medium">{row.label}</span>
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-muted dark:text-foreground">{row.count}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-muted">
                <div className={`${color} h-full rounded-full`} style={{ width: `${percent(row.count, total)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

export const StudentsStatisticsTab = ({ students, teacherOptions, loading }: Props) => {
  const total = students.length;
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
  const activeCount = students.filter((student) => String(student.status || '').toLowerCase() === 'active').length;
  const assignedTeacherCount = students.filter((student) => toNumberId(student.teacher_id)).length;
  const assignedClassCount = students.filter((student) => toNumberId(student.class_id)).length;
  const withCoinsCount = students.filter((student) => Number(student.coins || 0) > 0).length;
  const coinsTotal = students.reduce((sum, student) => sum + (Number(student.coins) || 0), 0);
  const topTeacher = teacherRows.find((teacher) => teacher.count > 0);

  const statusRows = topCounts(students, (student) => normalizeLabel(student.status, 'No status'));
  const genderRows = topCounts(students, (student) => normalizeLabel(student.gender, 'No gender'));
  const schoolRows = topCounts(students, (student) => {
    const school = String(student.school_name || '').trim();
    return school || null;
  });
  const classRows = topCounts(students, (student) => {
    const group = String(student.class_name || student.school_class || '').trim();
    return group || null;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">Loading statistics...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total students" value={total} sub={`${activeCount} active`} icon={Users} color="bg-blue-600" />
        <MetricCard label="Teacher assigned" value={`${percent(assignedTeacherCount, total)}%`} sub={`${assignedTeacherCount} students`} icon={UserCheck} color="bg-emerald-600" />
        <MetricCard label="Class assigned" value={`${percent(assignedClassCount, total)}%`} sub={`${assignedClassCount} students`} icon={GraduationCap} color="bg-amber-500" />
        <MetricCard label="Coins total" value={coinsTotal.toLocaleString()} sub={`${withCoinsCount} students with coins`} icon={Coins} color="bg-fuchsia-600" />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
          <CardContent className="p-3">
            <div className="mb-3 flex flex-col gap-0.5">
              <h3 className="text-sm font-bold text-slate-950 dark:text-foreground">Student coverage</h3>
              <p className="text-xs text-muted-foreground">Assignment, status, and coin readiness across the current scope.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <ProgressRow label="Active students" value={activeCount} total={total} color="bg-blue-600" />
              <ProgressRow label="Teacher assigned" value={assignedTeacherCount} total={total} color="bg-emerald-600" />
              <ProgressRow label="Class assigned" value={assignedClassCount} total={total} color="bg-amber-500" />
              <ProgressRow label="Has coin balance" value={withCoinsCount} total={total} color="bg-fuchsia-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 bg-cyan-600 text-white shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase text-white/75">Top teacher</p>
                <h3 className="mt-1 text-lg font-extrabold">{topTeacher?.name || 'No assignments yet'}</h3>
                <p className="mt-1 text-xs font-medium text-white/85">{topTeacher?.count || 0} assigned students</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/18">
                <Award className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <CountList title="Status breakdown" icon={ShieldCheck} rows={statusRows} total={total} color="bg-blue-600" empty="No statuses found." />
        <CountList title="Gender breakdown" icon={VenusAndMars} rows={genderRows} total={total} color="bg-emerald-600" empty="No gender data found." />
        <CountList title="Top schools" icon={School} rows={schoolRows} total={total} color="bg-amber-500" empty="No school data found." />
        <CountList title="Top groups" icon={BookOpen} rows={classRows} total={total} color="bg-fuchsia-600" empty="No group data found." />
      </div>

      <Card className="border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div>
              <h3 className="text-sm font-bold text-slate-950 dark:text-foreground">Teacher leaderboard</h3>
              <p className="text-xs text-muted-foreground">Students assigned per teacher.</p>
            </div>
            <div className="rounded-lg bg-blue-600 px-2 py-1.5 text-xs font-bold text-white">{teacherRows.length} teachers</div>
          </div>
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead className="h-8 px-3 text-xs">Teacher</TableHead>
                <TableHead className="h-8 px-3 text-xs">Coverage</TableHead>
                <TableHead className="h-8 px-3 text-right text-xs">Students</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teacherRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    No teacher statistics found.
                  </TableCell>
                </TableRow>
              ) : (
                teacherRows.map((teacher, index) => (
                  <TableRow key={teacher.id || teacher.name}>
                    <TableCell className="px-3 py-2 font-medium">{teacher.name}</TableCell>
                    <TableCell className="px-3 py-2">
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-muted">
                        <div
                          className={index % 2 === 0 ? 'h-full rounded-full bg-blue-600' : 'h-full rounded-full bg-emerald-600'}
                          style={{ width: `${percent(teacher.count, total)}%` }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right">
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-800 dark:bg-muted dark:text-foreground">
                        {teacher.count}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
