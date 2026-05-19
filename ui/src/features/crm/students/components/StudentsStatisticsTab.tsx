import { BookOpen, GraduationCap, UserCheck, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
    { label: 'Total students', value: students.length, icon: Users, sub: 'All scoped students' },
    { label: 'Assigned students', value: assignedCount, icon: UserCheck, sub: 'Students with teachers' },
    { label: 'Active students', value: activeCount, icon: GraduationCap, sub: 'Current active status' },
    { label: 'Top teacher', value: topTeacher?.count || 0, icon: BookOpen, sub: topTeacher?.name || 'No assignments yet' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold">{loading ? '-' : card.value}</p>
                  <p className="truncate text-xs text-muted-foreground">{card.sub}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Teacher</TableHead>
              <TableHead className="text-right">Students</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={2} className="py-10 text-center text-muted-foreground">
                  Loading statistics...
                </TableCell>
              </TableRow>
            ) : teacherRows.length === 0 && unassignedCount === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="py-10 text-center text-muted-foreground">
                  No student statistics found.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {teacherRows.map((teacher) => (
                  <TableRow key={teacher.id || teacher.name}>
                    <TableCell className="font-medium">{teacher.name}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{teacher.count}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {unassignedCount > 0 && (
                  <TableRow>
                    <TableCell className="font-medium text-muted-foreground">Unassigned</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{unassignedCount}</Badge>
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
