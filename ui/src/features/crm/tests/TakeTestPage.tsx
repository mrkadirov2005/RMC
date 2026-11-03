// Taking a test: one question at a time, made for a phone first. On top the test, its sections and
// the clock; the reading text beside its questions (folded above them on a phone); big answer
// buttons; back and next at the bottom; a map of every question to jump around and flag. When the
// test is handed in, the score shows straight away if the test allows it.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ChevronDown, Clock, Flag, LayoutGrid, Loader2, Send, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/utils/errorMessage';
import { useLanguage } from '@/i18n/LanguageContext';
import { useTestsHome } from './useTestsHome';
import { testAPI } from './api';
import { countWords } from './answerFormat';
import { buildSections, clockTone, formatClock, isAnswered, passageFor, sectionOf } from './takeTestModel';
import { QuestionAnswer } from './components/QuestionAnswer';

// How the screen reaches the server. It defaults to the authenticated API, and a
// share-link student passes the public transport instead — same paper, same
// timer, same submit button, different door.
export interface TakeTestTransport {
  load: (submissionId: number) => Promise<{ test: any; startedAt: string | null }>;
  submit: (submissionId: number, answers: Record<number, any>, timeTakenSeconds: number | null) => Promise<void>;
  onFinished: () => void;
}

interface TakeTestPageProps {
  transport?: TakeTestTransport;
  // A share-link student reaches this screen without a route param, so the
  // submission is handed in directly.
  submissionId?: number;
}

interface FinishedResult {
  status?: string;
  obtained_marks?: number | string | null;
  total_score?: number | string | null;
  percentage?: number | string | null;
  is_passed?: boolean | null;
}

const CLOCK_STYLE = {
  calm: 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
  warning: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
  danger: 'animate-pulse border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200',
};

const TakeTestPage = ({ transport, submissionId: submissionIdProp }: TakeTestPageProps = {}) => {
  const { t } = useLanguage();
  const params = useParams();
  const submissionId = submissionIdProp != null ? String(submissionIdProp) : params.submissionId;
  const navigate = useNavigate();
  const testsHome = useTestsHome();

  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [timeUpOpen, setTimeUpOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [passageOpen, setPassageOpen] = useState(true);
  const [finished, setFinished] = useState<FinishedResult | null>(null);

  const loadSubmission = useCallback(async () => {
    try {
      setLoading(true);
      let loadedTest: any;
      let loadedStartedAt: string | null = null;
      if (transport) {
        const loaded = await transport.load(Number(submissionId));
        loadedTest = loaded.test;
        loadedStartedAt = loaded.startedAt;
      } else {
        // The submission says which test and when it really started.
        let testId = localStorage.getItem(`submission_${submissionId}_test`);
        try {
          const submissionRes = await testAPI.getSubmissionDetails(Number(submissionId));
          testId = String(submissionRes.data.test_id);
          loadedStartedAt = submissionRes.data.started_at || null;
        } catch (subErr) {
          console.error('Could not fetch submission details:', subErr);
          if (!testId) throw new Error(t('Test information not found. Please go back and start the test again.'));
        }
        loadedTest = (await testAPI.getById(Number(testId))).data;
      }
      setStartedAt(loadedStartedAt);
      setTest(loadedTest);
      const testQuestions = [...(loadedTest.questions || [])];
      if (loadedTest.shuffle_questions) testQuestions.sort(() => Math.random() - 0.5);
      setQuestions(testQuestions);
      if (testQuestions.length === 0) setError(t('This test has no questions. Please contact the administrator.'));
      if (loadedTest.is_timed) {
        const durationSeconds = Number(loadedTest.duration_minutes || 0) * 60;
        const elapsed = loadedStartedAt ? Math.floor((Date.now() - new Date(loadedStartedAt).getTime()) / 1000) : 0;
        setTimeRemaining(Math.max(0, durationSeconds - Math.max(0, elapsed)));
      }
    } catch (err: any) {
      console.error('Error loading submission:', err);
      setError(err.message || t('Failed to load test'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId, transport]);

  useEffect(() => {
    if (submissionId) void loadSubmission();
  }, [submissionId, loadSubmission]);

  // The clock: when it runs out, the test is handed in.
  useEffect(() => {
    if (!test?.is_timed || timeRemaining === null || timeRemaining <= 0 || finished) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setTimeUpOpen(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [test?.is_timed, timeRemaining, finished]);

  const sections = useMemo(() => buildSections(test, questions), [test, questions]);
  const currentQuestion = questions[currentIndex];
  const currentSection = sectionOf(sections, currentIndex);
  const passage = passageFor(test, currentQuestion);
  const answeredCount = questions.filter((question) => isAnswered(answers[question.question_id])).length;
  const unanswered = questions.map((question, index) => (isAnswered(answers[question.question_id]) ? -1 : index)).filter((index) => index >= 0);
  const overLimit = questions.filter((question) => question.word_limit > 0 && countWords(answers[question.question_id]?.text) > question.word_limit);
  const missingRequired = questions.filter((question) => question.is_required && !isAnswered(answers[question.question_id]));

  const setAnswer = (questionId: number, value: any) => setAnswers((prev) => ({ ...prev, [questionId]: value }));
  const toggleFlag = (questionId: number) =>
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  const goTo = (index: number) => {
    setCurrentIndex(Math.min(Math.max(index, 0), questions.length - 1));
    setMapOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (force = false) => {
    if (overLimit.length > 0) {
      setConfirmOpen(false);
      setError(t('Question {number} is over its limit of {limit} words.', { number: questions.indexOf(overLimit[0]) + 1, limit: overLimit[0].word_limit }));
      goTo(questions.indexOf(overLimit[0]));
      return;
    }
    // Running out of time hands in what there is, even with required questions left.
    if (!force && missingRequired.length > 0) {
      setConfirmOpen(false);
      setError(t('Question {number} must be answered.', { number: questions.indexOf(missingRequired[0]) + 1 }));
      goTo(questions.indexOf(missingRequired[0]));
      return;
    }
    if (!force) {
      setConfirmOpen(true);
      return;
    }
    try {
      setSubmitting(true);
      setConfirmOpen(false);
      setTimeUpOpen(false);
      const formatted: Record<number, any> = {};
      questions.forEach((question) => {
        formatted[question.question_id] = answers[question.question_id] || null;
      });
      const timeTaken = startedAt ? Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)) : null;
      if (transport) {
        await transport.submit(Number(submissionId), formatted, timeTaken);
        transport.onFinished();
        return;
      }
      const response = await testAPI.submitTest(Number(submissionId), formatted, timeTaken);
      setFinished(response.data?.submission || response.data || {});
      window.scrollTo({ top: 0 });
    } catch (err: any) {
      console.error('Error submitting test:', err);
      setError(err.response?.data?.error || t('Failed to submit test'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !test) {
    return (
      <div className="mx-auto max-w-xl space-y-4 p-6">
        <Alert variant="destructive">
          <AlertDescription>{getErrorMessage(error)}</AlertDescription>
        </Alert>
        <Button variant="ghost" onClick={testsHome.goHome}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t(testsHome.label)}
        </Button>
      </div>
    );
  }

  if (finished) {
    return <TestFinished test={test} result={finished} questions={questions.length} answered={answeredCount} onReview={() => navigate(`/tests/submissions/${submissionId}`)} onHome={testsHome.goHome} homeLabel={t(testsHome.label)} />;
  }

  const tone = clockTone(timeRemaining);
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  const isLast = currentIndex === questions.length - 1;

  return (
    <div className="mx-auto max-w-6xl px-3 pb-28 pt-3 sm:px-6">
      {/* The test, where you are, and the clock */}
      <div className="sticky top-0 z-20 -mx-3 mb-4 border-b bg-background/95 px-3 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold sm:text-lg">{test?.test_name}</h1>
            <p className="text-xs text-muted-foreground">
              {t('Question {current} of {total}', { current: currentIndex + 1, total: questions.length })}
              {currentSection?.title ? ` · ${t(currentSection.title)}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {test?.is_timed && timeRemaining !== null && (
              <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold tabular-nums', CLOCK_STYLE[tone])}>
                <Clock className="h-4 w-4" />
                {formatClock(timeRemaining)}
              </span>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setMapOpen(true)}>
              <LayoutGrid className="h-4 w-4" />
              <span className="tabular-nums">
                {answeredCount}/{questions.length}
              </span>
            </Button>
          </div>
        </div>
        {sections.length > 1 && (
          <div className="mt-2 flex gap-1">
            {sections.map((section) => {
              const done = section.indexes.filter((index) => isAnswered(answers[questions[index]?.question_id])).length;
              const active = section === currentSection;
              return (
                <button
                  key={section.title}
                  type="button"
                  onClick={() => goTo(section.indexes[0])}
                  className={cn('min-w-0 flex-1 rounded-md px-2 py-1 text-left text-[0.6875rem] font-semibold', active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
                >
                  <span className="block truncate">{t(section.title)}</span>
                  <span className="tabular-nums opacity-70">
                    {done}/{section.indexes.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription className="flex items-start justify-between gap-3">
            {getErrorMessage(error)}
            <button type="button" aria-label={t('Close')} onClick={() => setError(null)}>
              ×
            </button>
          </AlertDescription>
        </Alert>
      )}

      <div className={cn('grid gap-4', passage && 'lg:grid-cols-2')}>
        {/* The reading text: beside the question on a wide screen, folded above it on a phone. */}
        {passage && (
          <section className="rounded-xl border bg-card lg:sticky lg:top-36 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto">
            <button type="button" className="flex w-full items-center justify-between gap-2 p-4 text-left lg:pointer-events-none" onClick={() => setPassageOpen((open) => !open)}>
              <span className="flex items-center gap-2 font-bold">
                <BookOpen className="h-4 w-4 text-primary" />
                {passage.title || t('Reading text')}
              </span>
              <ChevronDown className={cn('h-4 w-4 transition-transform lg:hidden', passageOpen && 'rotate-180')} />
            </button>
            {/* On a phone the text scrolls in its own box, so the question stays in view. */}
            <div className={cn('max-h-[38vh] overflow-y-auto px-4 pb-4 text-[0.95rem] leading-relaxed lg:max-h-none lg:overflow-visible', !passageOpen && 'hidden lg:block')}>
              <p className="whitespace-pre-wrap">{passage.content}</p>
            </div>
          </section>
        )}

        {currentQuestion && (
          <section className="rounded-xl border bg-card p-4 sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2 text-sm font-black text-primary-foreground">{currentIndex + 1}</span>
                {t('{count} marks', { count: Number(currentQuestion.marks) || 0 })}
              </div>
              <button
                type="button"
                onClick={() => toggleFlag(currentQuestion.question_id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold',
                  flagged.has(currentQuestion.question_id) ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200' : 'text-muted-foreground hover:bg-muted'
                )}
              >
                <Flag className="h-3.5 w-3.5" />
                {flagged.has(currentQuestion.question_id) ? t('Flagged') : t('Flag')}
              </button>
            </div>
            <h2 className="mb-5 whitespace-pre-wrap text-lg font-semibold leading-snug sm:text-xl">{currentQuestion.question_text}</h2>
            <QuestionAnswer question={currentQuestion} value={answers[currentQuestion.question_id]} onChange={(value) => setAnswer(currentQuestion.question_id, value)} />
          </section>
        )}
      </div>

      {/* Back and next, always at hand */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:px-6">
          <Button variant="outline" size="lg" onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}>
            <ArrowLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('Previous')}</span>
          </Button>
          {!isLast && (
            <Button variant="ghost" size="lg" className="hidden text-emerald-700 sm:inline-flex" onClick={() => void handleSubmit(false)} disabled={submitting}>
              {t('Finish the test')}
            </Button>
          )}
          {isLast ? (
            <Button size="lg" className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 sm:flex-none" onClick={() => void handleSubmit(false)} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {t('Finish the test')}
            </Button>
          ) : (
            <Button size="lg" className="flex-1 sm:flex-none" onClick={() => goTo(currentIndex + 1)}>
              {t('Next')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Every question at a glance */}
      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('All questions')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-primary" /> {t('Answered')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border" /> {t('Not answered')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-amber-400" /> {t('Flagged')}
            </span>
          </div>
          {sections.map((section) => (
            <div key={section.title} className="space-y-2">
              {section.title && <p className="text-sm font-bold">{t(section.title)}</p>}
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                {section.indexes.map((index) => {
                  const question = questions[index];
                  const answered = isAnswered(answers[question?.question_id]);
                  const isFlagged = flagged.has(question?.question_id);
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => goTo(index)}
                      className={cn(
                        'relative h-10 rounded-md border text-sm font-bold tabular-nums',
                        answered ? 'border-primary bg-primary text-primary-foreground' : 'bg-card',
                        index === currentIndex && 'ring-2 ring-primary ring-offset-2'
                      )}
                    >
                      {index + 1}
                      {isFlagged && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-amber-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </DialogContent>
      </Dialog>

      {/* Handing in */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Finish the test?')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/40">
              <div className="text-xl font-black text-emerald-600">{answeredCount}</div>
              <div className="text-xs">{t('Answered')}</div>
            </div>
            <div className="rounded-lg bg-rose-50 p-3 dark:bg-rose-950/40">
              <div className="text-xl font-black text-rose-600">{unanswered.length}</div>
              <div className="text-xs">{t('Not answered')}</div>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/40">
              <div className="text-xl font-black text-amber-600">{flagged.size}</div>
              <div className="text-xs">{t('Flagged')}</div>
            </div>
          </div>
          {unanswered.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('Not answered yet — tap to go back:')}</p>
              <div className="flex flex-wrap gap-1.5">
                {unanswered.slice(0, 30).map((index) => (
                  <button
                    key={index}
                    type="button"
                    className="h-8 min-w-8 rounded-md border px-2 text-xs font-bold tabular-nums hover:bg-muted"
                    onClick={() => {
                      setConfirmOpen(false);
                      goTo(index);
                    }}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {t('Keep working')}
            </Button>
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => void handleSubmit(true)} disabled={submitting}>
              {t('Hand in')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={timeUpOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm [&>button]:hidden">
          <DialogHeader>
            <DialogTitle>{t("Time's up!")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm">{t('Your answers are handed in as they are.')}</p>
          <DialogFooter>
            <Button onClick={() => void handleSubmit(true)} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('Hand in')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/** After handing in: the score straight away when the test allows it, else "waiting for the teacher". */
const TestFinished = ({
  test,
  result,
  questions,
  answered,
  onReview,
  onHome,
  homeLabel,
}: {
  test: any;
  result: FinishedResult;
  questions: number;
  answered: number;
  onReview: () => void;
  onHome: () => void;
  homeLabel: string;
}) => {
  const { t } = useLanguage();
  const graded = result.status === 'graded' && test?.show_results_immediately !== false;
  const percent = Math.round(Number(result.percentage) || 0);
  const passed = Boolean(result.is_passed);
  const level = test?.test_data?.level_test?.level;
  return (
    <div className="mx-auto max-w-lg px-4 py-10 text-center">
      {graded ? (
        <>
          <div className={cn('mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full', passed ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950' : 'bg-rose-100 text-rose-600 dark:bg-rose-950')}>
            {passed ? <CheckCircle2 className="h-10 w-10" /> : <XCircle className="h-10 w-10" />}
          </div>
          <h1 className="text-2xl font-black">{passed ? t('Passed!') : t('Not passed this time')}</h1>
          {level && <p className="mt-1 text-sm text-muted-foreground">{passed ? t('Level {level} confirmed by the test.', { level }) : t('Level {level} needs 70% to pass.', { level })}</p>}
          <div className="my-6 rounded-2xl border bg-card p-6">
            <div className={cn('text-5xl font-black tabular-nums', passed ? 'text-emerald-600' : 'text-rose-600')}>{percent}%</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {t('{obtained} of {total} marks', { obtained: Number(result.obtained_marks) || 0, total: Number(result.total_score) || Number(test?.total_marks) || 0 })}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Send className="h-9 w-9" />
          </div>
          <h1 className="text-2xl font-black">{t('Test handed in')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('Your teacher will check it; the result will appear in your tests.')}</p>
          <p className="my-6 text-sm">{t('{answered} of {total} questions answered', { answered, total: questions })}</p>
        </>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        {graded && <Button onClick={onReview}>{t('See my answers')}</Button>}
        <Button variant="outline" onClick={onHome}>
          {homeLabel}
        </Button>
      </div>
    </div>
  );
};

export default TakeTestPage;
