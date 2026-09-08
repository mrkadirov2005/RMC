// Public, unauthenticated landing page for a vocabulary consolidation share
// link — served at /consolidate/:shareToken with no login. A student enters
// their username and starts the exercise; the class roster is never exposed
// here (the backend no longer returns it — see PublicSetView).

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { handleApiError } from '@/utils/toast';
import { TakeConsolidationPage } from '@/features/student/TakeConsolidationPage';
import {
  consolidatePublicAPI,
  type ConsolidationTrial,
  type ConsolidationWord,
  type PublicSetView as SetView,
} from '@/features/student/api/consolidationExerciseApi';

type Stage =
  | { step: 'loading' }
  | { step: 'invalid' }
  | { step: 'form'; data: SetView }
  | { step: 'nudge'; data: SetView; username: string; existing: ConsolidationTrial }
  | { step: 'exercise'; username: string; trial: ConsolidationTrial; words: ConsolidationWord[]; violationLimit: number };

export const ConsolidatePublicPage = () => {
  const { shareToken = '' } = useParams<{ shareToken: string }>();
  const [stage, setStage] = useState<Stage>({ step: 'loading' });
  const [username, setUsername] = useState('');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    consolidatePublicAPI
      .getSet(shareToken)
      .then((data) => {
        if (!cancelled) setStage({ step: 'form', data });
      })
      .catch(() => {
        if (!cancelled) setStage({ step: 'invalid' });
      });
    return () => {
      cancelled = true;
    };
  }, [shareToken]);

  const startFor = async (data: SetView, forUsername: string, confirm?: boolean) => {
    const trimmed = forUsername.trim();
    if (!trimmed) {
      setError('Enter your username.');
      return;
    }
    setStarting(true);
    setError('');
    try {
      const result = await consolidatePublicAPI.startTrial(shareToken, trimmed, confirm);
      if (result.needs_confirmation) {
        // Nothing has been created yet — the backend now refuses to start a trial
        // until this nudge is acknowledged, so "never mind" below has nothing to
        // clean up.
        setStage({ step: 'nudge', data, username: trimmed, existing: result.existing_today });
      } else {
        const { trial, words } = result;
        setStage({ step: 'exercise', username: trimmed, trial, words, violationLimit: data.violation_limit });
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setStarting(false);
    }
  };

  if (stage.step === 'loading') {
    return (
      <main data-translation-skip className="flex min-h-screen items-center justify-center bg-[#f6fbff]">
        <Loader2 className="h-8 w-8 animate-spin text-[#16a7e2]" />
      </main>
    );
  }

  if (stage.step === 'invalid') {
    return (
      <main data-translation-skip className="flex min-h-screen items-center justify-center bg-[#f6fbff] px-5 text-[#21116a]">
        <Card className="w-full max-w-md border-[#d8e4f1]">
          <CardContent className="space-y-2 p-8 text-center">
            <h1 className="text-xl font-semibold">This link isn't valid</h1>
            <p className="text-sm text-slate-500">Ask your teacher for the current link.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (stage.step === 'exercise') {
    return (
      <TakeConsolidationPage
        context={{ mode: 'public', shareToken, username: stage.username }}
        initialTrial={stage.trial}
        initialWords={stage.words}
        violationLimit={stage.violationLimit}
      />
    );
  }

  if (stage.step === 'nudge') {
    return (
      <main data-translation-skip className="flex min-h-screen items-center justify-center bg-[#f6fbff] px-5 text-[#21116a]">
        <Card className="w-full max-w-md border-[#d8e4f1]">
          <CardContent className="space-y-4 p-8 text-center">
            <h1 className="text-lg font-semibold">Already completed today</h1>
            <p className="text-sm text-slate-600">
              It looks like {stage.username} already completed this today
              {stage.existing.correct_count != null && stage.existing.total_words != null
                ? ` (scored ${stage.existing.correct_count}/${stage.existing.total_words})`
                : ''}
              . Continue anyway?
            </p>
            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50 text-left text-red-800">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-center gap-3">
              <Button
                onClick={() => startFor(stage.data, stage.username, true)}
                disabled={starting}
                className="bg-[#21116a] text-white hover:bg-[#160a4d]"
              >
                {starting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue anyway
              </Button>
              <Button variant="outline" disabled={starting} onClick={() => setStage({ step: 'form', data: stage.data })}>
                Never mind
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  const { data } = stage;

  return (
    <main data-translation-skip className="flex min-h-screen items-center justify-center bg-[#f6fbff] px-5 py-10 text-[#21116a]">
      <Card className="w-full max-w-md border-[#d8e4f1]">
        <CardContent className="space-y-5 p-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#16a7e2]">{data.class_name}</p>
            <h1 className="mt-1 text-xl font-semibold">{data.title || 'Vocabulary Exercise'}</h1>
            <p className="mt-1 text-sm text-slate-500">Enter your username to begin</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void startFor(data, username);
            }}
            className="space-y-4"
          >
            <Input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username"
              className="h-11"
            />

            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={starting} className="h-11 w-full bg-[#21116a] text-white hover:bg-[#160a4d]">
              {starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default ConsolidatePublicPage;
