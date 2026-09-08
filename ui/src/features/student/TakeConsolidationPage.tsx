// Shared exercise-taking UI for the vocabulary consolidation feature — used by
// both the public share-link flow and the authenticated portal flow. Includes
// the browser-based lockdown approximation: forced fullscreen, visibility/blur/
// fullscreen-exit violation detection, and auto-submit past the violation limit.
// This is explicitly NOT real Safe Exam Browser — a second device, a screenshot,
// or a student who simply accepts the consequence can still defeat it. It is a
// deterrent and an audit trail (violation counts land on the trial row), not a
// hard technical guarantee.

import { useEffect, useRef, useState } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { handleApiError } from '@/utils/toast';
import {
  consolidatePublicAPI,
  consolidationPortalAPI,
  type ConsolidationTrial,
  type ConsolidationWord,
} from './api/consolidationExerciseApi';

export type ExerciseContext =
  | { mode: 'public'; shareToken: string; username: string }
  | { mode: 'auth'; setId: number };

interface WordReview extends ConsolidationWord {
  translations?: string[];
  student_answer?: string | null;
  is_correct?: boolean | null;
}

interface TakeConsolidationPageProps {
  context: ExerciseContext;
  initialTrial: ConsolidationTrial;
  initialWords: ConsolidationWord[];
  violationLimit: number;
  onExit?: () => void;
}

type Phase = 'gate' | 'active';

export const TakeConsolidationPage = ({ context, initialTrial, initialWords, violationLimit, onExit }: TakeConsolidationPageProps) => {
  const [trial, setTrial] = useState(initialTrial);
  const [words, setWords] = useState(initialWords);
  const [trialToken, setTrialToken] = useState<string | null>(initialTrial.access_token ?? null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [result, setResult] = useState<ConsolidationTrial | null>(null);
  const [review, setReview] = useState<WordReview[] | null>(null);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<Phase>('gate');
  const [violationCount, setViolationCount] = useState(0);
  const finishedRef = useRef(false);

  const currentWord = words[index];
  const isLast = index === words.length - 1;

  // One place resolving which flow's endpoints to call, instead of re-branching on
  // `context.mode` inside every handler below.
  const api =
    context.mode === 'public'
      ? {
          saveAnswer: (wordId: number, value: string) => consolidatePublicAPI.saveAnswer(context.shareToken, trial.trial_id, wordId, value, trialToken),
          submit: () => consolidatePublicAPI.submitTrial(context.shareToken, trial.trial_id, trialToken),
          logViolation: () => consolidatePublicAPI.logViolation(context.shareToken, trial.trial_id, trialToken),
          start: async () => {
            // Clicking "Try Again" is already an explicit, in-session choice to retry —
            // the "already completed today?" nudge exists to catch an *accidental*
            // re-click of the group-chat link, not to re-interrupt someone already here.
            const result = await consolidatePublicAPI.startTrial(context.shareToken, context.username, true);
            if (result.needs_confirmation) throw new Error('Unexpected confirmation prompt on retry.');
            return { trial: result.trial, words: result.words };
          },
        }
      : {
          saveAnswer: (wordId: number, value: string) => consolidationPortalAPI.saveAnswer(trial.trial_id, wordId, value),
          submit: () => consolidationPortalAPI.submitTrial(trial.trial_id),
          logViolation: () => consolidationPortalAPI.logViolation(trial.trial_id),
          start: () => consolidationPortalAPI.startTrial(context.setId),
        };

  const saveAnswer = (wordId: number, value: string) => {
    // Autosave failure is non-fatal — final grading happens server-side at submit
    // regardless of whether every keystroke made it through.
    api.saveAnswer(wordId, value).catch(() => {});
  };

  const handleChange = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentWord.consolidation_word_id]: value }));
  };

  const logViolation = () => api.logViolation();

  const exitFullscreenIfActive = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const submit = async () => {
    // Once a submit is in flight — normal or violation-triggered auto-submit — stop
    // enforcing the beforeunload prompt and stop counting further violations; there's
    // nothing left for the lockdown to protect once the answers are already on the way.
    finishedRef.current = true;
    setSubmitting(true);
    setError('');
    try {
      const result = await api.submit();
      setResult(result.trial);
      // Any phase other than 'active' detaches the lockdown listeners below —
      // reusing 'gate' avoids a third phase value that exists only for this.
      setPhase('gate');
      exitFullscreenIfActive();

      if (context.mode === 'auth') {
        try {
          const detail = await consolidationPortalAPI.getTrialDetail(trial.trial_id);
          setReview(detail.words);
        } catch {
          // Per-word review is a nice-to-have — the score above is already final.
        }
      }
    } catch (err) {
      finishedRef.current = false;
      setError(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Latest submit/logViolation kept in refs so the long-lived lockdown effect below
  // (attached once per 'active' phase) always calls the current closure rather than
  // a stale one captured when the effect first ran.
  const submitRef = useRef(submit);
  submitRef.current = submit;
  const logViolationRef = useRef(logViolation);
  logViolationRef.current = logViolation;

  const handleStartExercise = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Fullscreen blocked or unsupported (iOS Safari, some in-app browsers like
      // Telegram's) — proceed without it. Visibility/blur detection still works;
      // this is a deliberate, documented limitation, not a bug.
    }
    setPhase('active');
  };

  useEffect(() => {
    if (phase !== 'active') return undefined;
    let localViolationCount = 0;
    let intentionalFullscreenExit = false;

    const registerViolation = () => {
      if (finishedRef.current) return;
      localViolationCount += 1;
      setViolationCount(localViolationCount);
      logViolationRef.current();

      if (localViolationCount >= violationLimit) {
        intentionalFullscreenExit = true;
        void submitRef.current();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) registerViolation();
    };
    const handleBlur = () => registerViolation();
    const handleFullscreenChange = () => {
      if (intentionalFullscreenExit) {
        intentionalFullscreenExit = false;
        return;
      }
      if (!document.fullscreenElement) registerViolation();
    };
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (finishedRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [phase, violationLimit]);

  // Derived entirely from violationCount/violationLimit — no need to keep a
  // separately-set copy of this text in state.
  const warningMessage =
    violationCount === 0
      ? ''
      : violationCount >= violationLimit
        ? 'Your exercise is being submitted automatically because you left the screen too many times.'
        : `Leaving the exercise screen is not allowed. Violation ${violationCount} of ${violationLimit} — one more and your exercise will be submitted automatically.`;

  const handleNext = () => {
    saveAnswer(currentWord.consolidation_word_id, answers[currentWord.consolidation_word_id] || '');
    if (isLast) {
      void submit();
    } else {
      setIndex((prev) => prev + 1);
    }
  };

  const handleTryAgain = async () => {
    setStarting(true);
    setError('');
    try {
      const { trial: newTrial, words: newWords } = await api.start();
      setTrial(newTrial);
      setWords(newWords);
      setTrialToken(newTrial.access_token ?? null);
      setIndex(0);
      setAnswers({});
      setResult(null);
      setReview(null);
      setViolationCount(0);
      finishedRef.current = false;
      setPhase('gate');
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setStarting(false);
    }
  };

  if (result) {
    return (
      <main data-translation-skip className="flex min-h-screen items-center justify-center bg-[#f6fbff] px-5 py-10 text-[#21116a]">
        <Card className="w-full max-w-lg border-[#d8e4f1]">
          <CardContent className="space-y-5 p-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#16a7e2]">
              {result.status === 'auto_submitted' ? 'Submitted automatically' : result.is_passed ? 'All correct' : 'Exercise submitted'}
            </p>
            <h1 className="text-4xl font-semibold">
              {result.correct_count ?? 0}/{result.total_words ?? words.length}
            </h1>
            {result.status === 'auto_submitted' && (
              <p className="text-sm text-red-600">
                Your exercise was submitted automatically because you left the screen too many times.
              </p>
            )}

            {review && (
              <div className="space-y-2 rounded-md border border-[#d8e4f1] bg-[#f6fbff] p-4 text-left text-sm">
                {review.map((item) => (
                  <div key={item.consolidation_word_id} className="flex items-start justify-between gap-3 border-b border-[#e7f1fa] pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-semibold">{item.main_word}</p>
                      <p className={item.is_correct ? 'text-emerald-600' : 'text-red-600'}>
                        {item.student_answer || '(blank)'}
                      </p>
                    </div>
                    {!item.is_correct && item.translations && (
                      <p className="text-right text-slate-500">Accepted: {item.translations.join(', ')}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50 text-left text-red-800">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-center gap-3 pt-2">
              <Button onClick={handleTryAgain} disabled={starting} className="bg-[#21116a] text-white hover:bg-[#160a4d]">
                {starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                Try Again
              </Button>
              {onExit && (
                <Button variant="outline" onClick={onExit}>
                  Done
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (phase === 'gate') {
    return (
      <main data-translation-skip className="flex min-h-screen items-center justify-center bg-[#f6fbff] px-5 py-10 text-[#21116a]">
        <Card className="w-full max-w-lg border-[#d8e4f1]">
          <CardContent className="space-y-5 p-8 text-center">
            <h1 className="text-xl font-semibold">Ready to begin?</h1>
            <p className="text-sm text-slate-600">
              This exercise runs in a locked, full-screen mode. Leaving the screen, switching tabs, or exiting
              fullscreen counts as a violation — after {violationLimit} violation{violationLimit === 1 ? '' : 's'} your
              exercise will be submitted automatically with whatever you've answered so far.
            </p>
            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50 text-left text-red-800">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button onClick={handleStartExercise} className="h-12 w-full bg-[#21116a] text-white hover:bg-[#160a4d]">
              Start Exercise
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main data-translation-skip className="flex min-h-screen items-center justify-center bg-[#f6fbff] px-5 py-10 text-[#21116a]">
      <Card className="w-full max-w-lg border-[#d8e4f1]">
        <CardContent className="space-y-6 p-8">
          {warningMessage && (
            <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
              <AlertDescription>{warningMessage}</AlertDescription>
            </Alert>
          )}
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-500">
                Word {index + 1} of {words.length}
              </p>
              {violationCount > 0 && (
                <p className="text-xs font-medium text-red-600">
                  Violations: {violationCount}/{violationLimit}
                </p>
              )}
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#e7f1fa]">
              <div
                className="h-full rounded-full bg-[#16a7e2] transition-all"
                style={{ width: `${((index + 1) / words.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-semibold">{currentWord?.main_word}</h1>
          </div>

          <Input
            autoFocus
            value={answers[currentWord?.consolidation_word_id] || ''}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNext();
            }}
            placeholder="Type the translation"
            className="h-12 text-center text-lg"
          />

          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button onClick={handleNext} disabled={submitting} className="h-12 w-full bg-[#21116a] text-white hover:bg-[#160a4d]">
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLast ? 'Submit' : 'Next'}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
};
