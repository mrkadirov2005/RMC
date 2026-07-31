import type { Dispatch, SetStateAction } from 'react';
import { ChevronLeft, ChevronRight, Loader2, PencilLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getMonthKey, monthLabel, shiftMonth } from '../utils/date';
import { getPointTone } from '../utils/points';

type StudentRow = {
  student_id?: number;
  id?: number;
  first_name?: string;
  last_name?: string;
};

type LessonDay = {
  dateKey: string;
  day: number;
  dayName: string;
  session?: any;
};

type ClassMonthlyPointsViewProps = {
  scheduleDays: string[];
  pointsMonth: string;
  setPointsMonth: Dispatch<SetStateAction<string>>;
  monthlyLessonDays: LessonDay[];
  monthlyPointStats: {
    cells: number;
    filled: number;
    missing: number;
    average: number;
  };
  pointsLoading: boolean;
  studentRows: StudentRow[];
  monthlyPointsBySessionStudent: Map<string, any>;
};

export const ClassMonthlyPointsView = ({
  scheduleDays,
  pointsMonth,
  setPointsMonth,
  monthlyLessonDays,
  monthlyPointStats,
  pointsLoading,
  studentRows,
  monthlyPointsBySessionStudent,
}: ClassMonthlyPointsViewProps) => (
  <div className="space-y-3">
    <div className="flex flex-col gap-2 rounded-lg border border-violet-100 bg-violet-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white">
          <PencilLine className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-950">Monthly points</p>
          <p className="text-xs text-muted-foreground">
            {monthLabel(pointsMonth || getMonthKey())} lessons from {scheduleDays.length ? scheduleDays.join(', ') : 'class settings'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-9 w-9 bg-white" onClick={() => setPointsMonth((month) => shiftMonth(month || getMonthKey(), -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Input
          type="month"
          value={pointsMonth}
          onChange={(event) => setPointsMonth(event.target.value)}
          className="h-9 w-[160px] border-violet-200 bg-white text-sm font-semibold"
        />
        <Button variant="outline" size="icon" className="h-9 w-9 bg-white" onClick={() => setPointsMonth((month) => shiftMonth(month || getMonthKey(), 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>

    <div className="grid gap-2 sm:grid-cols-4">
      <div className="rounded-lg border bg-white p-3">
        <p className="text-xs font-semibold text-muted-foreground">Lesson days</p>
        <p className="mt-1 text-xl font-black text-slate-950">{monthlyLessonDays.length}</p>
      </div>
      <div className="rounded-lg border bg-white p-3">
        <p className="text-xs font-semibold text-muted-foreground">Filled cells</p>
        <p className="mt-1 text-xl font-black text-emerald-700">{monthlyPointStats.filled}/{monthlyPointStats.cells}</p>
      </div>
      <div className="rounded-lg border bg-white p-3">
        <p className="text-xs font-semibold text-muted-foreground">Missing</p>
        <p className="mt-1 text-xl font-black text-rose-700">{monthlyPointStats.missing}</p>
      </div>
      <div className="rounded-lg border bg-white p-3">
        <p className="text-xs font-semibold text-muted-foreground">Average</p>
        <p className="mt-1 text-xl font-black text-violet-700">{monthlyPointStats.average}</p>
      </div>
    </div>

    {scheduleDays.length === 0 ? (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No class weekdays are configured in class settings.
      </div>
    ) : monthlyLessonDays.length === 0 ? (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No scheduled lesson days found for this month.
      </div>
    ) : (
      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 min-w-[220px] bg-white">Student</TableHead>
              {monthlyLessonDays.map((day) => (
                <TableHead key={day.dateKey} className="min-w-[104px] text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-sm font-black">{day.day}</span>
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">{day.dayName.slice(0, 3)}</span>
                    {!day.session ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">No session</span> : null}
                  </div>
                </TableHead>
              ))}
              <TableHead className="min-w-[92px] text-center">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pointsLoading ? (
              <TableRow><TableCell colSpan={monthlyLessonDays.length + 2} className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
            ) : studentRows.length === 0 ? (
              <TableRow><TableCell colSpan={monthlyLessonDays.length + 2} className="py-10 text-center text-muted-foreground">No students enrolled.</TableCell></TableRow>
            ) : studentRows.map((student, index) => {
              const studentId = Number(student.student_id || student.id || 0);
              let studentTotal = 0;
              let studentFilled = 0;
              return (
                <TableRow key={studentId || index}>
                  <TableCell className="sticky left-0 z-10 bg-white py-2 font-semibold">
                    <div className="flex items-center gap-2">
                      <div className={`${index % 4 === 0 ? 'bg-blue-600' : index % 4 === 1 ? 'bg-emerald-600' : index % 4 === 2 ? 'bg-amber-500' : 'bg-fuchsia-600'} flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold text-white`}>
                        {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                      </div>
                      <span>{student.first_name} {student.last_name}</span>
                    </div>
                  </TableCell>
                  {monthlyLessonDays.map((day) => {
                    const sessionId = Number(day.session?.session_id || day.session?.id || 0);
                    const grade = sessionId ? monthlyPointsBySessionStudent.get(`${sessionId}:${studentId}`) : null;
                    const points = grade?.points_score === null || grade?.points_score === undefined ? null : Number(grade.points_score || 0);
                    if (points !== null) {
                      studentTotal += points;
                      studentFilled += 1;
                    }
                    const tone = getPointTone(points);
                    return (
                      <TableCell key={`${studentId}-${day.dateKey}`} className="text-center">
                        <span className={`inline-flex h-8 min-w-[72px] items-center justify-center gap-1 rounded-md border px-2 text-xs font-black ${tone.className}`}>
                          <span>{tone.icon}</span>
                          {points === null ? '-' : points}
                        </span>
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center">
                    <span className="inline-flex min-w-[72px] items-center justify-center rounded-md bg-violet-50 px-2 py-1 text-sm font-black text-violet-800">
                      {studentFilled ? studentTotal : '-'}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    )}
  </div>
);
