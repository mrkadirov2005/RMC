// One attempt at a test, for the student who took it and for staff: the score card, how each
// section went, and every question with the answer given next to the right one and why, filterable
// to the wrong or unanswered ones.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle2, Clock, Loader2, Minus, Pencil, X, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/utils/errorMessage';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAppDispatch, useAppSelector } from '../hooks';
import { clearSubmissionDetailsError, fetchSubmissionDetails } from '../../../slices/testsSlice';
import { selectSubmissionDetailsError, selectSubmissionDetailsItem, selectSubmissionDetailsLoading } from '../../../store/selectors';
import type { TestSubmission } from '@/types';
import { useTestsHome } from './useTestsHome';
import { testAPI } from './api';
import { formatCorrectAnswer, formatStudentAnswer } from './answerFormat';
import { buildSections } from './takeTestModel';
import { getQuestionTypeMeta } from './questionTypes';

type Outcome = 'right' | 'wrong' | 'blank' | 'pending';
type Filter = 'all' | 'wrong' | 'blank' | 'right';

const isBlank = (value: any) =>
  value === null || value === undefined || value === '' || (typeof value === 'object' && !('index' in value) && !('value' in value) && !String(value.text ?? '').trim() && !value.matches);

const outcomeOf = (answer: any): Outcome => {
  if (isBlank(answer.student_answer)) return 'blank';
  if (answer.is_correct === true) return 'right';
  if (answer.is_correct === false) return 'wrong';
  return 'pending';
};

const OUTCOME_STYLE: Record<Outcome, { border: string; icon: typeof Check; iconClass: string; label: string }> = {
  right: { border: 'border-l-emerald-500', icon: Check, iconClass: 'bg-emerald-500 text-white', label: 'Right' },
  wrong: { border: 'border-l-rose-500', icon: X, iconClass: 'bg-rose-500 text-white', label: 'Wrong' },
  blank: { border: 'border-l-slate-300', icon: Minus, iconClass: 'bg-slate-300 text-slate-700', label: 'Not answered' },
  pending: { border: 'border-l-amber-400', icon: Clock, iconClass: 'bg-amber-400 text-white', label: 'Waiting for grading' },
};

const formatDuration = (seconds?: number | null) => {
  if (!seconds) return '—';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

const ViewSubmissionPage = () => {
  const { t } = useLanguage();
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const testsHome = useTestsHome();
  const dispatch = useAppDispatch();
  const submission = useAppSelector(selectSubmissionDetailsItem) as (TestSubmission & Record<string, any>) | null;
  const loading = useAppSelector(selectSubmissionDetailsLoading);
  const error = useAppSelector(selectSubmissionDetailsError);
  const user = useAppSelector((state) => state.auth.user);
  const [test, setTest] = useState<any>(null);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (submissionId) dispatch(fetchSubmissionDetails(Number(submissionId)));
  }, [dispatch, submissionId]);

  // The test itself, for its sections (best effort: the page works without it).
  useEffect(() => {
    if (!submission?.test_id) return;
    testAPI
      .getById(Number(submission.test_id))
      .then((response) => setTest(response.data))
      .catch(() => setTest(null));
  }, [submission?.test_id]);

  const answers = useMemo(() => (submission?.answers || []) as any[], [submission]);
  const counts = useMemo(() => {
    const result: Record<Outcome, number> = { right: 0, wrong: 0, blank: 0, pending: 0 };
    answers.forEach((answer) => {
      result[outcomeOf(answer)] += 1;
    });
    return result;
  }, [answers]);

  // Each section's right answers, when the test's questions line up with the answers.
  const sectionScores = useMemo(() => {
    const questions = test?.questions || [];
    if (!questions.length) return [];
    const sections = buildSections(test, questions).filter((section) => section.title);
    const byId = new Map(answers.map((answer) => [Number(answer.question_id), answer]));
    return sections.map((section) => {
      const own = section.indexes.map((index) => byId.get(Number(questions[index]?.question_id))).filter(Boolean);
      return { title: section.title, right: own.filter((answer) => outcomeOf(answer) === 'right').length, total: section.indexes.length };
    });
  }, [test, answers]);

  if (loading && !submission) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="space-y-4 p-6">
        <Alert variant="destructive">
          <AlertDescription>{error ? getErrorMessage(error) : t('Submission not found')}</AlertDescription>
        </Alert>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('Go Back')}
        </Button>
      </div>
    );
  }

  const graded = submission.status === 'graded';
  const total = Number(submission.total_marks) || 0;
  const score = Number(submission.obtained_marks ?? submission.score) || 0;
  const percent = submission.percentage != null ? Math.round(Number(submission.percentage)) : total > 0 ? Math.round((score / total) * 100) : 0;
  const passed = submission.is_passed != null ? Boolean(submission.is_passed) : score >= Number(submission.passing_marks || 0);
  const isStaff = user?.userType === 'superuser' || user?.userType === 'teacher';
  const studentName = [submission.first_name, submission.last_name].filter(Boolean).join(' ');
  const level = test?.test_data?.level_test?.level;
  const visible = answers.map((answer, index) => ({ answer, index })).filter(({ answer }) => filter === 'all' || outcomeOf(answer) === filter);

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: answers.length },
    { id: 'wrong', label: 'Wrong', count: counts.wrong },
    { id: 'blank', label: 'Not answered', count: counts.blank },
    { id: 'right', label: 'Right', count: counts.right },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <Button variant="ghost" size="sm" className="gap-2" onClick={() => testsHome.goToTest(submission.test_id)}>
        <ArrowLeft className="h-4 w-4" />
        {t(testsHome.testLabel)}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            {getErrorMessage(error)}
            <button type="button" aria-label={t('Close')} onClick={() => dispatch(clearSubmissionDetailsError())}>
              ×
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* The score card */}
      <section className="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div
            className={cn(
              'flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border-4',
              !graded ? 'border-amber-300 text-amber-600' : passed ? 'border-emerald-500 text-emerald-600' : 'border-rose-500 text-rose-600'
            )}
          >
            <span className="text-2xl font-black tabular-nums">{graded ? `${percent}%` : '…'}</span>
            <span className="text-[0.6875rem] font-semibold tabular-nums">
              {score}/{total}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">{submission.test_name}</p>
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-black">
              {graded ? (
                passed ? (
                  <>
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" /> {t('Passed!')}
                  </>
                ) : (
                  <>
                    <XCircle className="h-6 w-6 text-rose-600" /> {t('Not passed')}
                  </>
                )
              ) : (
                t('Waiting for grading')
              )}
              {level && graded && <span className="text-sm font-semibold text-muted-foreground">· {t('Level {level}', { level })}</span>}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isStaff && studentName ? `${studentName} · ` : ''}
              {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString('en-GB') : ''}
              {submission.time_taken_seconds ? ` · ${formatDuration(submission.time_taken_seconds)}` : ''}
              {Number(submission.attempt_number) > 1 ? ` · ${t('attempt {number}', { number: Number(submission.attempt_number) })}` : ''}
            </p>
          </div>
          {isStaff && submission.status === 'submitted' && (
            <Button onClick={() => navigate(`/tests/submissions/${submissionId}/grade`)}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('Grade')}
            </Button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-950/40">
            <div className="text-lg font-black text-emerald-600">{counts.right}</div>
            <div className="text-xs">{t('Right')}</div>
          </div>
          <div className="rounded-lg bg-rose-50 p-2 dark:bg-rose-950/40">
            <div className="text-lg font-black text-rose-600">{counts.wrong}</div>
            <div className="text-xs">{t('Wrong')}</div>
          </div>
          <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
            <div className="text-lg font-black text-slate-600 dark:text-slate-300">{counts.blank}</div>
            <div className="text-xs">{t('Not answered')}</div>
          </div>
        </div>

        {sectionScores.length > 1 && (
          <div className="mt-4 space-y-2">
            {sectionScores.map((section) => {
              const share = section.total ? Math.round((section.right / section.total) * 100) : 0;
              return (
                <div key={section.title} className="grid grid-cols-[100px_1fr_48px] items-center gap-3 text-sm">
                  <span className="font-semibold">{t(section.title)}</span>
                  <div data-keep-bg className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(148, 163, 184, 0.25)' }}>
                    <div data-keep-bg className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: share >= 70 ? '#10b981' : share >= 40 ? '#f59e0b' : '#f43f5e' }} />
                  </div>
                  <span className="text-right tabular-nums text-muted-foreground">
                    {section.right}/{section.total}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* The answers */}
      <div className="flex flex-wrap gap-1.5" role="tablist">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            onClick={() => setFilter(item.id)}
            className={cn('rounded-full border px-3 py-1.5 text-sm font-semibold', filter === item.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted')}
          >
            {t(item.label)} <span className="tabular-nums opacity-75">{item.count}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border bg-card py-10 text-center text-sm text-muted-foreground">{t('Nothing here.')}</p>
      ) : (
        <div className="space-y-2">
          {visible.map(({ answer, index }) => {
            const outcome = outcomeOf(answer);
            const style = OUTCOME_STYLE[outcome];
            const Icon = style.icon;
            const shape = getQuestionTypeMeta(answer.question_type).answerShape;
            const showCorrect = outcome !== 'right' && getQuestionTypeMeta(answer.question_type).correctAnswerShape !== 'none';
            const given =
              outcome === 'blank'
                ? t('No answer')
                : shape === 'value'
                  ? answer.student_answer?.value
                    ? t('True')
                    : t('False')
                  : formatStudentAnswer(answer, answer.student_answer);
            return (
              <article key={answer.question_id} className={cn('rounded-lg border border-l-4 bg-card p-4', style.border)}>
                <div className="flex items-start gap-3">
                  <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', style.iconClass)} title={t(style.label)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold">
                        <span className="mr-1.5 text-muted-foreground">{index + 1}.</span>
                        {answer.question_text}
                      </p>
                      <span className="shrink-0 text-xs font-bold tabular-nums text-muted-foreground">
                        {Number(answer.marks_obtained) || 0}/{Number(answer.marks) || 0}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                      <div className={cn('rounded-md px-3 py-2', outcome === 'right' ? 'bg-emerald-50 dark:bg-emerald-950/40' : outcome === 'wrong' ? 'bg-rose-50 dark:bg-rose-950/40' : 'bg-muted')}>
                        <span className="block text-[0.6875rem] font-semibold uppercase text-muted-foreground">{t('Answer given')}</span>
                        <span className="whitespace-pre-wrap">{given}</span>
                      </div>
                      {showCorrect && (
                        <div className="rounded-md bg-emerald-50 px-3 py-2 dark:bg-emerald-950/40">
                          <span className="block text-[0.6875rem] font-semibold uppercase text-muted-foreground">{t('Right answer')}</span>
                          <span className="whitespace-pre-wrap">
                            {shape === 'value'
                              ? (typeof answer.correct_answer === 'object' ? answer.correct_answer?.value : answer.correct_answer)
                                ? t('True')
                                : t('False')
                              : formatCorrectAnswer(answer)}
                          </span>
                        </div>
                      )}
                    </div>
                    {answer.explanation && <p className="mt-2 text-xs text-muted-foreground">💡 {answer.explanation}</p>}
                    {answer.feedback && <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm dark:bg-amber-950/40">{answer.feedback}</p>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ViewSubmissionPage;
