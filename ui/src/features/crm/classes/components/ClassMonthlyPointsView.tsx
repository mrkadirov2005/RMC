import type { Dispatch, SetStateAction } from 'react';
import { ChevronLeft, ChevronRight, Loader2, PencilLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getMonthKey, monthLabel, shiftMonth } from '../utils/date';
import { getCombinedLessonPoints, getPointTone } from '../utils/points';

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

    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
      <div className="flex items-center justify-between rounded-md border bg-white px-2.5 py-2 shadow-sm">
        <p className="text-[11px] font-semibold text-muted-foreground">Lesson days</p>
        <p className="text-base font-black text-slate-950">{monthlyLessonDays.length}</p>
      </div>
      <div className="flex items-center justify-between rounded-md border bg-white px-2.5 py-2 shadow-sm">
        <p className="text-[11px] font-semibold text-muted-foreground">Filled</p>
        <p className="text-base font-black text-emerald-700">{monthlyPointStats.filled}/{monthlyPointStats.cells}</p>
      </div>
      <div className="flex items-center justify-between rounded-md border bg-white px-2.5 py-2 shadow-sm">
        <p className="text-[11px] font-semibold text-muted-foreground">Missing</p>
        <p className="text-base font-black text-rose-700">{monthlyPointStats.missing}</p>
      </div>
      <div className="flex items-center justify-between rounded-md border bg-white px-2.5 py-2 shadow-sm">
        <p className="text-[11px] font-semibold text-muted-foreground">Average</p>
        <p className="text-base font-black text-violet-700">{monthlyPointStats.average}</p>
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
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <Table className="text-xs">
          <TableHeader className="bg-slate-50/95">
            <TableRow>
              <TableHead className="sticky left-0 z-10 h-9 min-w-[164px] bg-slate-50 px-2 text-[11px] font-bold uppercase tracking-wide">Student</TableHead>
              {monthlyLessonDays.map((day) => (
                <TableHead key={day.dateKey} className="h-9 min-w-[70px] px-1 text-center">
                  <div className="flex items-center justify-center gap-1 leading-none">
                    <span className="text-xs font-black">{day.day}</span>
                    <span className="text-[9px] font-bold uppercase text-muted-foreground">{day.dayName.slice(0, 2)}</span>
                    {!day.session ? <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="No session" /> : null}
                  </div>
                </TableHead>
              ))}
              <TableHead className="h-9 min-w-[64px] px-1 text-center text-[11px] font-bold uppercase tracking-wide">Total</TableHead>
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
                <TableRow key={studentId || index} className="group h-9">
                  <TableCell className="sticky left-0 z-10 bg-transparent px-2 py-1 font-semibold group-hover:bg-violet-50/40">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <div className={"text-black"}>
                       {index+1}
                      </div>
                      <span className="max-w-[128px] truncate text-[11px]">{student.last_name} {student.first_name} </span>
                    </div>
                  </TableCell>
                  {monthlyLessonDays.map((day) => {
                    const sessionId = Number(day.session?.session_id || day.session?.id || 0);
                    const grade = sessionId ? monthlyPointsBySessionStudent.get(`${sessionId}:${studentId}`) : null;
                    const points = getCombinedLessonPoints(grade);
                    if (points !== null) {
                      studentTotal += points;
                      studentFilled += 1;
                    }
                    const tone = getPointTone(points);
                    return (
                      <TableCell key={`${studentId}-${day.dateKey}`} className="px-1 py-1 text-center">
                        <span className={`inline-flex h-6 min-w-[46px] items-center justify-center gap-1 rounded-md border px-1.5 text-[10px] font-black ${tone.className}`}>
                          <span className="text-[9px]">{tone.icon}</span>
                          {points === null ? '-' : points}
                        </span>
                      </TableCell>
                    );
                  })}
                  <TableCell className="px-1 py-1 text-center">
                    <span className="inline-flex h-6 min-w-[46px] items-center justify-center rounded-md bg-violet-100 px-1.5 text-[11px] font-black text-violet-800">
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
