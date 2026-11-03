// One test. Staff open it on its results: who took it, how the scores spread and which questions
// went wrong most, with each student's answers a click away. The questions tab shows every question
// with its right answer and explanation, by section; the info tab its settings and share link.
// A student sees what the test is and starts it.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, BookOpen, Check, ClipboardList, Clock, FileQuestion, Info, Loader2, Pencil, Play, Target, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/utils/errorMessage';
import { useLanguage } from '@/i18n/LanguageContext';
import { useUrlTab } from '@/shared/hooks/useUrlTab';
import { testAPI } from './api';
import { ShareTestPanel } from './components/ShareTestPanel';
import { useTestsHome } from './useTestsHome';
import { useAppSelector } from '../hooks';
import { formatTestType, getTestTypeBadgeClass } from './testVisuals';
import { testAnalysisApi, type TestAnalysis } from './api/testAnalysisApi';
import { HardestQuestions, ScoreSpreadChart } from './components/TestResultsCharts';
import { passTone } from './components/PassRateLine';
import { buildSections, passageFor } from './takeTestModel';

interface TestDetailPageProps {
  // Set when the page is shown inside the teacher portal rather than at its own URL.
  testId?: number;
  onBack?: () => void;
}

const VIEWS = ['results', 'questions', 'info'] as const;
type View = (typeof VIEWS)[number];

const STATUS_STYLE: Record<string, string> = {
  graded: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  submitted: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  in_progress: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
};
const STATUS_LABEL: Record<string, string> = { graded: 'Graded', submitted: 'To grade', in_progress: 'In progress' };

const formatDuration = (seconds?: number | null) => {
  if (!seconds) return '—';
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `${minutes}:${String(seconds % 60).padStart(2, '0')}` : `0:${String(seconds).padStart(2, '0')}`;
};

const formatDay = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB');
};

const Fact = ({ icon: Icon, label, value, detail }: { icon: typeof Clock; label: string; value: string | number; detail?: string }) => (
  <div className="bg-card p-3 sm:p-4">
    <p className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </p>
    <p className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">{value}</p>
    {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
  </div>
);

const TestDetailPage = ({ testId: testIdProp, onBack }: TestDetailPageProps = {}) => {
  const { t } = useLanguage();
  const params = useParams();
  const testId = testIdProp != null ? String(testIdProp) : params.testId;
  const testsHome = useTestsHome();
  const goBack = onBack ?? testsHome.goHome;
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const isStaff = user?.userType === 'superuser' || user?.userType === 'teacher';

  const [test, setTest] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<TestAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [view, setView] = useUrlTab<View>(isStaff ? 'results' : 'info', isStaff ? VIEWS : ['info'], 'view');

  const loadTest = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const testRes = await testAPI.getById(Number(testId));
      setTest(testRes.data);
      if (isStaff) {
        const [submissionsRes, analysisData] = await Promise.all([
          testAPI.getSubmissionsByTest(Number(testId)).catch(() => ({ data: [] })),
          testAnalysisApi.get(Number(testId)).catch(() => null),
        ]);
        setSubmissions(submissionsRes.data || []);
        setAnalysis(analysisData);
      }
    } catch (err: any) {
      console.error('Error loading test:', err);
      setError(t('Failed to load test details'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId, isStaff]);

  useEffect(() => {
    if (testId) void loadTest();
  }, [testId, loadTest]);

  const questions = useMemo(() => test?.questions || [], [test]);
  const sections = useMemo(() => buildSections(test, questions), [test, questions]);

  const handleStartTest = async () => {
    if (!user?.id) {
      setError(t('User not authenticated'));
      return;
    }
    try {
      const response = await testAPI.startTest(Number(testId), user.id, user.userType);
      const submissionId = response.data.submission_id;
      localStorage.setItem(`submission_${submissionId}_test`, String(testId));
      navigate(`/tests/take/${submissionId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || t('Failed to start test'));
    }
    setStartOpen(false);
  };

  const openQuestion = (questionId: number) => {
    setView('questions');
    window.setTimeout(() => document.getElementById(`question-${questionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="space-y-4 p-6">
        <Alert variant="destructive">
          <AlertDescription>{error ? getErrorMessage(error) : t('Test not found')}</AlertDescription>
        </Alert>
        <Button variant="ghost" onClick={goBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t(testsHome.label)}
        </Button>
      </div>
    );
  }

  // Mirrors the server rule: a teacher changes only tests they wrote.
  const canManageTest =
    user?.userType === 'superuser' ||
    (user?.userType === 'teacher' && String(test.created_by_type || 'teacher') === 'teacher' && Number(test.created_by) === Number(user?.id));
  const canTakeTest = test.is_active && user?.userType === 'student';
  const level = test.test_data?.level_test?.level as string | undefined;
  const total = Number(test.total_marks) || 0;
  const passPercent = total > 0 ? Math.round((Number(test.passing_marks) / total) * 100) : 0;
  const totals = analysis?.totals;

  const tabs: { id: View; label: string; icon: typeof BarChart3 }[] = [
    { id: 'results', label: 'Results', icon: BarChart3 },
    { id: 'questions', label: 'Questions', icon: FileQuestion },
    { id: 'info', label: 'About the test', icon: Info },
  ];

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Button variant="ghost" size="sm" className="gap-2" onClick={goBack}>
        <ArrowLeft className="h-4 w-4" />
        {t(testsHome.label)}
      </Button>

      {/* The test */}
      <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              {level ? (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">{t('Level {level}', { level })}</span>
              ) : (
                <span className={getTestTypeBadgeClass(test.test_type)}>{t(formatTestType(test.test_type))}</span>
              )}
              <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', test.is_active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>
                {test.is_active ? t('Active') : t('Inactive')}
              </span>
              {test.is_private && <span className="rounded-full border px-2.5 py-0.5 text-xs font-semibold">{t('Private')}</span>}
            </div>
            <h1 className="text-xl font-black sm:text-2xl">{test.test_name}</h1>
            {(test.subject_name || test.description) && <p className="mt-1 text-sm text-muted-foreground">{test.subject_name || test.description}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {canTakeTest && (
              <Button size="lg" onClick={() => setStartOpen(true)}>
                <Play className="mr-2 h-4 w-4" />
                {t('Take test')}
              </Button>
            )}
            {isStaff && (
              <Button variant="outline" onClick={() => navigate(`/tests/${testId}/assign`)}>
                <ClipboardList className="mr-2 h-4 w-4" />
                {t('Assign')}
              </Button>
            )}
            {canManageTest && (
              <Button variant="outline" onClick={() => navigate(`/tests/${testId}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" />
                {t('Edit')}
              </Button>
            )}
          </div>
        </div>
      </section>

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            {getErrorMessage(error)}
            <button type="button" aria-label={t('Close')} onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border lg:grid-cols-4">
        <Fact icon={FileQuestion} label={t('Questions')} value={questions.length} detail={t('{marks} marks', { marks: total })} />
        <Fact icon={Clock} label={t('Time')} value={test.is_timed ? t('{minutes} min', { minutes: test.duration_minutes }) : t('No limit')} />
        <Fact icon={Target} label={t('Pass mark')} value={`${passPercent}%`} detail={t('{marks} of {total} marks', { marks: test.passing_marks, total })} />
        {isStaff ? (
          <Fact
            icon={Users}
            label={t('Pass rate')}
            value={totals?.pass_rate != null ? `${totals.pass_rate}%` : '—'}
            detail={totals?.attempts ? t('{passed} of {attempts} attempts', { passed: totals.passed, attempts: totals.attempts }) : t('Nobody has taken it yet')}
          />
        ) : (
          <Fact icon={Users} label={t('Retakes')} value={test.allow_retake ? test.max_retakes : t('No')} />
        )}
      </div>

      {isStaff && (
        <div className="inline-flex flex-wrap rounded-lg border bg-muted/40 p-1" role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={view === tab.id}
                onClick={() => setView(tab.id)}
                className={cn('inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold', view === tab.id ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              >
                <Icon className="h-4 w-4" />
                {t(tab.label)}
                {tab.id === 'results' && totals?.waiting ? <span className="rounded-full bg-amber-500 px-1.5 text-xs text-white">{totals.waiting}</span> : null}
              </button>
            );
          })}
        </div>
      )}

      {/* Results */}
      {isStaff && view === 'results' && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg border bg-card p-4 shadow-sm">
              <h2 className="mb-1 font-bold">{t('Score spread')}</h2>
              <p className="mb-4 text-xs text-muted-foreground">
                {totals?.attempts
                  ? t('Average {average}% · best {best}% · {time} per attempt', {
                      average: Math.round(Number(totals.average) || 0),
                      best: Math.round(Number(totals.best) || 0),
                      time: formatDuration(totals.average_seconds),
                    })
                  : t('Shows once someone has taken the test.')}
              </p>
              {analysis && <ScoreSpreadChart distribution={analysis.distribution} passPercent={passPercent} />}
            </section>
            <section className="rounded-lg border bg-card p-4 shadow-sm">
              <h2 className="mb-1 font-bold">{t('Hardest questions')}</h2>
              <p className="mb-2 text-xs text-muted-foreground">{t('The questions answered right least often; click one to see it.')}</p>
              {analysis && <HardestQuestions questions={analysis.questions} onOpen={openQuestion} />}
            </section>
          </div>

          <section className="rounded-lg border bg-card shadow-sm">
            <h2 className="border-b px-4 py-3 font-bold">
              {t('Students')} <span className="text-sm font-normal text-muted-foreground">({submissions.length})</span>
            </h2>
            {submissions.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t('Nobody has taken it yet')}</p>
            ) : (
              <div className="divide-y">
                {submissions.map((sub) => {
                  const percent = sub.percentage != null ? Math.round(Number(sub.percentage)) : null;
                  const tone = sub.is_passed ? passTone(100) : passTone(0);
                  const needsGrading = sub.status === 'submitted';
                  return (
                    <div key={sub.submission_id} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[minmax(160px,1.4fr)_minmax(140px,1fr)_110px_90px_auto]">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {[sub.first_name, sub.last_name].filter(Boolean).join(' ') || t('Student')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDay(sub.submitted_at || sub.started_at)}
                          {sub.attempt_number > 1 ? ` · ${t('attempt {number}', { number: sub.attempt_number })}` : ''}
                        </p>
                      </div>
                      <div className="order-last col-span-2 sm:order-none sm:col-span-1">
                        {percent !== null ? (
                          <>
                            <div className="flex items-baseline justify-between text-xs">
                              <span className={cn('font-black tabular-nums', tone.text)}>{percent}%</span>
                              <span className="tabular-nums text-muted-foreground">
                                {Number(sub.obtained_marks) || 0}/{total}
                              </span>
                            </div>
                            <div data-keep-bg className="mt-1 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(148, 163, 184, 0.25)' }}>
                              <div data-keep-bg className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: tone.bar }} />
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                      <span
                        className={cn(
                          'hidden w-fit rounded-full px-2 py-0.5 text-xs font-bold sm:inline-block',
                          sub.status === 'graded' && !sub.is_passed ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200' : STATUS_STYLE[sub.status] || 'bg-muted'
                        )}
                      >
                        {sub.status === 'graded' ? (sub.is_passed ? t('Passed') : t('Not passed')) : t(STATUS_LABEL[sub.status] || sub.status)}
                      </span>
                      <span className="hidden text-xs tabular-nums text-muted-foreground sm:block">{formatDuration(sub.time_taken_seconds)}</span>
                      <div className="flex justify-end gap-1">
                        {needsGrading ? (
                          <Button size="sm" onClick={() => navigate(`/tests/submissions/${sub.submission_id}/grade`)}>
                            {t('Grade')}
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => navigate(`/tests/submissions/${sub.submission_id}`)} disabled={sub.status === 'in_progress'}>
                            {t('Answers')}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Questions with the right answers */}
      {isStaff && view === 'questions' && (
        <div className="space-y-4">
          {questions.length === 0 && (
            <Alert>
              <AlertDescription>{t('No questions added yet')}</AlertDescription>
            </Alert>
          )}
          {sections.map((section) => {
            const passage = passageFor(test, questions[section.indexes[0]]);
            const rateById = new Map((analysis?.questions || []).map((item) => [item.question_id, item.correct_rate]));
            return (
              <section key={section.title || 'all'} className="rounded-lg border bg-card shadow-sm">
                {section.title && <h2 className="border-b px-4 py-3 font-bold">{t(section.title)}</h2>}
                {passage && (
                  <details className="border-b px-4 py-3">
                    <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                      <BookOpen className="h-4 w-4 text-primary" />
                      {passage.title || t('Reading text')}
                    </summary>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{passage.content}</p>
                  </details>
                )}
                <div className="divide-y">
                  {section.indexes.map((index) => {
                    const question = questions[index];
                    const rate = rateById.get(question.question_id);
                    const correctIndex = question.correct_answer?.index;
                    const correctValue = question.correct_answer?.value;
                    return (
                      <div key={question.question_id} id={`question-${question.question_id}`} className="scroll-mt-24 px-4 py-3">
                        <div className="flex items-start gap-3">
                          <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-muted px-2 text-xs font-black tabular-nums">{index + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">{question.question_text}</p>
                            {Array.isArray(question.options) && question.options.length > 0 && (
                              <div className="mt-2 grid gap-1 sm:grid-cols-2">
                                {question.options.map((option: string, optionIndex: number) => (
                                  <span
                                    key={optionIndex}
                                    className={cn('flex items-center gap-2 rounded-md px-2 py-1 text-sm', optionIndex === correctIndex ? 'bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200' : 'text-muted-foreground')}
                                  >
                                    <span className="font-bold">{String.fromCharCode(65 + optionIndex)}.</span> {option}
                                    {optionIndex === correctIndex && <Check className="h-3.5 w-3.5" />}
                                  </span>
                                ))}
                              </div>
                            )}
                            {question.question_type === 'true_false' && correctValue !== undefined && (
                              <p className="mt-2 text-sm">
                                {t('Answer')}: <span className="font-semibold text-emerald-700">{correctValue ? t('True') : t('False')}</span>
                              </p>
                            )}
                            {question.explanation && <p className="mt-2 text-xs text-muted-foreground">💡 {question.explanation}</p>}
                          </div>
                          {rate != null && <span className={cn('shrink-0 text-xs font-bold tabular-nums', passTone(Number(rate)).text)}>{t('{rate}% right', { rate })}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* About the test */}
      {(view === 'info' || !isStaff) && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <section className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
            {test.description && (
              <div>
                <h2 className="mb-1 font-bold">{t('Description')}</h2>
                <p className="text-sm text-muted-foreground">{test.description}</p>
              </div>
            )}
            {test.instructions && (
              <div>
                <h2 className="mb-1 font-bold">{t('Instructions')}</h2>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{test.instructions}</p>
              </div>
            )}
            {sections.length > 1 && (
              <div>
                <h2 className="mb-2 font-bold">{t('Sections')}</h2>
                <div className="flex flex-wrap gap-2">
                  {sections.map((section) => (
                    <span key={section.title} className="rounded-full bg-muted px-3 py-1 text-sm">
                      {t(section.title)} · {t('{count} questions', { count: section.indexes.length })}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {!test.description && !test.instructions && sections.length <= 1 && <p className="text-sm text-muted-foreground">{t('No description yet.')}</p>}
          </section>
          <section className="rounded-lg border bg-card p-4 text-sm shadow-sm">
            <h2 className="mb-3 font-bold">{t('Settings')}</h2>
            <dl className="space-y-2">
              {(
                [
                  ['Timed', test.is_timed ? t('Yes') : t('No')],
                  ['Shuffle questions', test.shuffle_questions ? t('Yes') : t('No')],
                  ['Show results', test.show_results_immediately ? t('Straight away') : t('After grading')],
                  ['Retakes', test.allow_retake ? t('Yes, up to {count}', { count: test.max_retakes }) : t('No')],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t(label)}</dt>
                  <dd className="text-right font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          {canManageTest && (
            <div className="lg:col-span-2">
              <ShareTestPanel testId={Number(testId)} shareToken={test.share_token ?? null} onTokenChange={(token) => setTest((current: any) => ({ ...current, share_token: token }))} />
            </div>
          )}
        </div>
      )}

      {/* Starting the test (student) */}
      <Dialog open={startOpen} onOpenChange={setStartOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Start "{name}"?', { name: test.test_name })}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-lg bg-muted p-3">
              <div className="text-lg font-black">{questions.length}</div>
              {t('Questions')}
            </div>
            <div className="rounded-lg bg-muted p-3">
              <div className="text-lg font-black">{test.is_timed ? test.duration_minutes : '∞'}</div>
              {t('Minutes')}
            </div>
            <div className="rounded-lg bg-muted p-3">
              <div className="text-lg font-black">{passPercent}%</div>
              {t('To pass')}
            </div>
          </div>
          {test.is_timed && <p className="text-sm text-amber-700">{t('The clock starts when you press Start and does not stop.')}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStartOpen(false)}>
              {t('Cancel')}
            </Button>
            <Button onClick={() => void handleStartTest()}>
              <Play className="mr-2 h-4 w-4" />
              {t('Start')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestDetailPage;
