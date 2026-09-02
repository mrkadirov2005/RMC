import { BarChart3, CalendarRange, ChevronLeft, ChevronRight, GraduationCap, LineChart as LineChartIcon, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart } from '@/shared/components/BarChart';
import { LineChart } from '@/shared/components/LineChart';
import { Timeline } from '@/shared/components/Timeline';
import { useTeacherStatistics } from './useTeacherStatistics';

interface TeacherStatisticsTabProps {
  teacherId?: number;
  classes?: any[];
  students?: any[];
  /** When provided (owner-wide view across all teachers), the right-hand panel asks for a teacher first, then that teacher's classes. */
  teachers?: any[];
}

const TeacherStatisticsTab = ({ teacherId, classes = [], students = [], teachers = [] }: TeacherStatisticsTabProps) => {
  const stats = useTeacherStatistics(teacherId, classes, students, teachers);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/20">
      <div className="mb-4">
        <h3 className="text-base font-black text-slate-900 dark:text-white">Lesson statistics</h3>
        <p className="text-xs text-muted-foreground">
          See how each lesson has gone based on the score points added to students.
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-900/40">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <CalendarRange className="h-3.5 w-3.5" />
          Date range
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="mb-1 text-[10px] uppercase text-muted-foreground">From</Label>
            <Input
              type="date"
              value={stats.dateRange.start}
              min={stats.globalMin || undefined}
              max={stats.dateRange.end || stats.globalMax || undefined}
              disabled={!stats.hasSelection}
              onChange={(event) => stats.setDateRange((range) => ({ ...range, start: event.target.value }))}
              className="h-9 w-[160px]"
            />
          </div>
          <div>
            <Label className="mb-1 text-[10px] uppercase text-muted-foreground">To</Label>
            <Input
              type="date"
              value={stats.dateRange.end}
              min={stats.dateRange.start || stats.globalMin || undefined}
              max={stats.globalMax || undefined}
              disabled={!stats.hasSelection}
              onChange={(event) => stats.setDateRange((range) => ({ ...range, end: event.target.value }))}
              className="h-9 w-[160px]"
            />
          </div>
          {!stats.hasSelection && (
            <span className="text-xs text-muted-foreground">
              {stats.isGlobalMode
                ? 'Pick a teacher, then a class, to enable the date range.'
                : 'Pick a class from “Classes” to enable the date range.'}
            </span>
          )}
        </div>

        {stats.hasSelection && stats.globalMin && stats.globalMax && (
          <div className="w-full pt-1">
            <Timeline
              min={stats.globalMin}
              max={stats.globalMax}
              start={stats.dateRange.start}
              end={stats.dateRange.end}
              markers={stats.lessonMarkers}
              onChange={(range) => stats.setDateRange(range)}
            />
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={stats.groupsOpen ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5"
          onClick={() => stats.setGroupsOpen((open: boolean) => !open)}
        >
          <Users className="h-3.5 w-3.5" />
          {stats.isGlobalMode ? 'Browse' : 'Classes'}
          {stats.isGlobalMode && stats.scope === 'center' ? (
            <span className="ml-1 rounded-full bg-white/20 px-1.5 text-[10px]">Whole center</span>
          ) : stats.isGlobalMode && stats.selectedTeacher ? (
            <span className="ml-1 rounded-full bg-white/20 px-1.5 text-[10px]">
              {stats.selectedTeacher.label}
              {stats.selectedClass ? ` · ${stats.selectedClass.label}` : ''}
            </span>
          ) : stats.selectedClass ? (
            <span className="ml-1 rounded-full bg-white/20 px-1.5 text-[10px]">{stats.selectedClass.label}</span>
          ) : null}
        </Button>

        {stats.hasClassSelected && (
          <div className="min-w-[200px]">
            <Select value={stats.selectedStudentId} onValueChange={stats.setSelectedStudentId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All students" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All students (class average)</SelectItem>
                {stats.classStudents.map((student: any) => {
                  const id = student.student_id ?? student.id;
                  const name = `${student.first_name || ''} ${student.last_name || ''}`.trim() || `Student #${id}`;
                  return (
                    <SelectItem key={id} value={String(id)}>
                      {name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-slate-900">
          {(['daily', 'monthly'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => stats.setGranularity(mode)}
              className={`rounded-full px-3 py-1 text-xs font-bold capitalize transition ${
                stats.granularity === mode
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => stats.setChartType('line')}
            aria-label="Line chart"
            className={`rounded-full p-1.5 transition ${
              stats.chartType === 'line' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <LineChartIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => stats.setChartType('bar')}
            aria-label="Bar chart"
            className={`rounded-full p-1.5 transition ${
              stats.chartType === 'bar' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-sky-50 p-4 dark:border-white/10 dark:from-slate-900/50 dark:via-slate-900/70 dark:to-slate-900">
          {!stats.hasSelection ? (
            <div className="flex h-[220px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
              {stats.isGlobalMode
                ? 'Click “Browse” and pick a teacher, then a class, to see its lesson statistics.'
                : 'Click “Classes” and pick a class to see its lesson statistics.'}
            </div>
          ) : stats.sessionsLoading ? (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">Loading lessons…</div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                <span>
                  {stats.scope === 'center'
                    ? 'Whole center · All classes average'
                    : (
                      <>
                        {stats.isGlobalMode && stats.selectedTeacher ? `${stats.selectedTeacher.label} · ` : ''}
                        {stats.selectedClass?.label}
                        {stats.selectedStudentId !== 'all'
                          ? ` · ${stats.classStudents.find((s: any) => String(s.student_id ?? s.id) === stats.selectedStudentId)?.first_name || 'Student'}`
                          : ' · Class average'}
                      </>
                    )}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {stats.lessonCount} lesson{stats.lessonCount === 1 ? '' : 's'}
                </span>
              </div>
              {stats.chartType === 'line' ? (
                <LineChart data={stats.chartData} height={220} color={stats.granularity === 'daily' ? '#2563eb' : '#7c3aed'} />
              ) : (
                <BarChart data={stats.chartData} height={190} />
              )}
            </>
          )}
        </div>

        {stats.groupsOpen && (
          <aside className="w-72 shrink-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-slate-950/40">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {stats.isGlobalMode && stats.panelTeacherId ? stats.selectedTeacher?.label || 'Classes' : stats.isGlobalMode ? 'Browse' : 'Groups'}
              </span>
              <button type="button" onClick={() => stats.setGroupsOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            {stats.isGlobalMode && !stats.panelTeacherId ? (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={stats.selectCenter}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-bold transition ${
                    stats.scope === 'center'
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-200'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                    Whole center
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                </button>

                <div className="my-1 border-t border-slate-200 dark:border-white/10" />
                <div className="px-1 pb-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">By teacher</div>

                {stats.teacherOptions.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">No teachers with classes found.</div>
                ) : (
                  stats.teacherOptions.map((teacher: { id: number; label: string; classCount: number }) => (
                    <button
                      key={teacher.id}
                      type="button"
                      onClick={() => stats.selectPanelTeacher(teacher.id)}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-200"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <GraduationCap className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{teacher.label}</span>
                      </span>
                      <span className="flex items-center gap-1 shrink-0 text-slate-400">
                        <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {teacher.classCount}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <>
                {stats.isGlobalMode && (
                  <button
                    type="button"
                    onClick={stats.backToTeacherList}
                    className="mb-2 flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Back to teachers
                  </button>
                )}
                {stats.groups.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">No classes found.</div>
                ) : (
                  <div className="space-y-1.5">
                    {stats.groups.map((group: { id: number; label: string }) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => stats.selectClass(group.id)}
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-bold transition ${
                          stats.selectedClassId === group.id
                            ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-200'
                        }`}
                      >
                        <span className="truncate">{group.label}</span>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  );
};

export default TeacherStatisticsTab;
