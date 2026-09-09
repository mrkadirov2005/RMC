// Superuser-only overview for vocabulary consolidation exercises. One main
// chart (effectiveness: pass-by-attempt-number + violations) with click-to-
// drill-down, plus two actions in the top-right corner: "Create Consolidator"
// (the Teacher -> Class -> Session picker, which opens the same creation/
// results component already on a session's own workflow page — a set created
// there is automatically tied to that session, nothing extra to wire up) and
// "Results" (the detailed per-teacher / per-session tables).

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { teacherAPI, classAPI } from '@/shared/api/api';
import { unwrapApiRows } from '@/shared/api/response';
import { consolidationApi, type ConsolidationOutcome, type ConsolidationOverview } from '../classes/api/consolidationApi';
import ConsolidationTab from '../classes/components/ConsolidationTab';
import EffectivenessChart, { type EffectivenessBarKey } from './EffectivenessChart';

interface TeacherOption {
  teacher_id: number;
  first_name: string;
  last_name: string;
}

interface ClassOption {
  class_id: number;
  class_name: string;
}

interface SessionOption {
  session_id: number;
  session_date: string;
}

const formatPercent = (value: number | null) => (value == null ? '—' : `${Math.round(value * 100)}%`);

const BAR_LABELS: Record<EffectivenessBarKey, string> = {
  passed_1: 'Passed on 1st try',
  passed_2: 'Passed on 2nd try',
  passed_3_plus: 'Passed on 3rd+ try',
  never_passed: 'Never passed',
  had_violations: 'Had lockdown violations',
};

const matchesBucket = (outcome: ConsolidationOutcome, bucket: EffectivenessBarKey) =>
  bucket === 'had_violations' ? outcome.violation_count > 0 : outcome.bucket === bucket;

export default function ConsolidationsOverviewPage() {
  const [overview, setOverview] = useState<ConsolidationOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState('');
  const [selectedBar, setSelectedBar] = useState<EffectivenessBarKey | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);

  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);

  const [teacherId, setTeacherId] = useState<string>('');
  const [classId, setClassId] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [classesLoading, setClassesLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const loadOverview = async () => {
    setOverviewLoading(true);
    setOverviewError('');
    try {
      const data = await consolidationApi.getOverview();
      setOverview(data);
    } catch {
      setOverviewError('Failed to load consolidation statistics.');
    } finally {
      setOverviewLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
    teacherAPI.getAll().then((response) => setTeachers(unwrapApiRows<TeacherOption>(response)));
  }, []);

  useEffect(() => {
    setClassId('');
    setSessionId('');
    setClasses([]);
    setSessions([]);
    if (!teacherId) return;
    setClassesLoading(true);
    classAPI
      .getAll({ teacher_id: teacherId })
      .then((response) => setClasses(unwrapApiRows<ClassOption>(response)))
      .finally(() => setClassesLoading(false));
  }, [teacherId]);

  useEffect(() => {
    setSessionId('');
    setSessions([]);
    if (!classId) return;
    setSessionsLoading(true);
    classAPI
      .getSessions(Number(classId))
      .then((response) => setSessions(unwrapApiRows<SessionOption>(response)))
      .finally(() => setSessionsLoading(false));
  }, [classId]);

  // Refresh the stats once a set is created from the picker, so the chart
  // doesn't go stale until a manual page reload.
  const handleSetChanged = () => {
    void loadOverview();
  };

  const sortedSets = useMemo(
    () => (overview?.sets ?? []).slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    [overview]
  );

  const drillDownRows = useMemo(() => {
    if (!overview || !selectedBar) return [];
    return overview.outcomes.filter((outcome) => matchesBucket(outcome, selectedBar));
  }, [overview, selectedBar]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-foreground">Consolidations</h1>
          <p className="text-sm text-muted-foreground">Vocabulary consolidation exercises across every teacher and class.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setResultsOpen(true)}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Results
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Consolidator
          </Button>
        </div>
      </div>

      {overviewError && (
        <Alert variant="destructive">
          <AlertDescription>{overviewError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-foreground">Effectiveness</h2>
          {overviewLoading || !overview ? (
            <div className="flex min-h-[160px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : (
            <EffectivenessChart
              effectiveness={overview.effectiveness}
              totalAttempts={overview.outcomes.length}
              selected={selectedBar}
              onSelect={(key) => setSelectedBar(key)}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={selectedBar !== null} onOpenChange={(open) => !open && setSelectedBar(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedBar ? BAR_LABELS[selectedBar] : ''} ({drillDownRows.length})
            </DialogTitle>
          </DialogHeader>
          {drillDownRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students in this bucket.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-3">Student</th>
                    <th className="py-2 pr-3">Teacher</th>
                    <th className="py-2 pr-3">Class</th>
                    <th className="py-2 pr-3">Session</th>
                    <th className="py-2 pr-3">Set</th>
                    <th className="py-2 pr-3">Attempts</th>
                    <th className="py-2 pr-3">First passed on</th>
                    <th className="py-2 pr-3">Violations</th>
                  </tr>
                </thead>
                <tbody>
                  {drillDownRows.map((row) => (
                    <tr key={`${row.consolidation_set_id}-${row.student_id}`} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{row.student_name}</td>
                      <td className="py-2 pr-3">{row.teacher_name}</td>
                      <td className="py-2 pr-3">{row.class_name}</td>
                      <td className="py-2 pr-3">{row.session_date}</td>
                      <td className="py-2 pr-3">{row.set_title || '—'}</td>
                      <td className="py-2 pr-3">{row.trial_count}</td>
                      <td className="py-2 pr-3">{row.first_pass_attempt ?? '—'}</td>
                      <td className="py-2 pr-3">
                        {row.violation_count > 0 ? <span className="font-medium text-red-600">{row.violation_count}</span> : 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={resultsOpen} onOpenChange={setResultsOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Results</DialogTitle>
          </DialogHeader>
          {overviewLoading || !overview ? (
            <div className="flex min-h-[120px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground">Total sets</p>
                    <p className="text-2xl font-semibold">{overview.totals.total_sets}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground">Total trials</p>
                    <p className="text-2xl font-semibold">{overview.totals.total_trials}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground">Students submitted</p>
                    <p className="text-2xl font-semibold">{overview.totals.total_students_submitted}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground">Overall pass rate</p>
                    <p className="text-2xl font-semibold">{formatPercent(overview.totals.overall_pass_rate)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground">Lockdown violations</p>
                    <p className={`text-2xl font-semibold ${overview.totals.total_violations > 0 ? 'text-red-600' : ''}`}>
                      {overview.totals.total_violations}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-foreground">By teacher</h2>
                {overview.by_teacher.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No consolidation sets created yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                          <th className="py-2 pr-3">Teacher</th>
                          <th className="py-2 pr-3">Sets</th>
                          <th className="py-2 pr-3">Trials</th>
                          <th className="py-2 pr-3">Students</th>
                          <th className="py-2 pr-3">Pass rate</th>
                          <th className="py-2 pr-3">Violations</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.by_teacher.map((row) => (
                          <tr key={row.teacher_id} className="border-b last:border-0">
                            <td className="py-2 pr-3 font-medium">{row.teacher_name}</td>
                            <td className="py-2 pr-3">{row.sets_count}</td>
                            <td className="py-2 pr-3">{row.trial_count}</td>
                            <td className="py-2 pr-3">{row.student_count}</td>
                            <td className="py-2 pr-3">{formatPercent(row.pass_rate)}</td>
                            <td className="py-2 pr-3">
                              {row.total_violations > 0 ? <span className="font-medium text-red-600">{row.total_violations}</span> : 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-foreground">By class / session</h2>
                {sortedSets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No consolidation sets created yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                          <th className="py-2 pr-3">Class</th>
                          <th className="py-2 pr-3">Session</th>
                          <th className="py-2 pr-3">Teacher</th>
                          <th className="py-2 pr-3">Title</th>
                          <th className="py-2 pr-3">Words</th>
                          <th className="py-2 pr-3">Trials</th>
                          <th className="py-2 pr-3">Students</th>
                          <th className="py-2 pr-3">Pass rate</th>
                          <th className="py-2 pr-3">Violations</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedSets.map((row) => (
                          <tr key={row.consolidation_set_id} className="border-b last:border-0">
                            <td className="py-2 pr-3 font-medium">{row.class_name}</td>
                            <td className="py-2 pr-3">{row.session_date}</td>
                            <td className="py-2 pr-3">{row.teacher_name}</td>
                            <td className="py-2 pr-3">{row.title || '—'}</td>
                            <td className="py-2 pr-3">{row.word_count}</td>
                            <td className="py-2 pr-3">{row.trial_count}</td>
                            <td className="py-2 pr-3">{row.student_count}</td>
                            <td className="py-2 pr-3">{formatPercent(row.pass_rate)}</td>
                            <td className="py-2 pr-3">
                              {row.total_violations > 0 ? <span className="font-medium text-red-600">{row.total_violations}</span> : 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create or view a session's exercise</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label className="mb-1 block">Teacher</Label>
                <Select value={teacherId} onValueChange={setTeacherId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.teacher_id} value={String(teacher.teacher_id)}>
                        {teacher.first_name} {teacher.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-1 block">Class</Label>
                <Select value={classId} onValueChange={setClassId} disabled={!teacherId || classesLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={classesLoading ? 'Loading…' : 'Choose a class'} />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((klass) => (
                      <SelectItem key={klass.class_id} value={String(klass.class_id)}>
                        {klass.class_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-1 block">Session</Label>
                <Select value={sessionId} onValueChange={setSessionId} disabled={!classId || sessionsLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={sessionsLoading ? 'Loading…' : 'Choose a session'} />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((session) => (
                      <SelectItem key={session.session_id} value={String(session.session_id)}>
                        {session.session_date}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {sessionId && (
              <div className="border-t pt-4">
                <ConsolidationTab sessionId={Number(sessionId)} onChanged={handleSetChanged} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
