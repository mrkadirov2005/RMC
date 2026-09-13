// Public, unauthenticated landing page for a test share link — served at
// /share/tests/:shareToken with no login. A student sees what the test is,
// enters their username, and is handed straight to the normal take-test screen.
// The class roster is never sent here: an unknown username and a student the
// test was never assigned to produce the same answer, so the page cannot be used
// to find out who studies at the centre.

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, FileQuestion, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { handleApiError } from '@/utils/toast';
import { formatTestType } from '@/features/crm/tests/testVisuals';
import TakeTestPage, { type TakeTestTransport } from '@/features/crm/tests/TakeTestPage';
import { sharedTestAPI, type SharedTestView } from './api/sharedTestApi';

type Stage =
  | { step: 'loading' }
  | { step: 'invalid' }
  | { step: 'form'; test: SharedTestView }
  | { step: 'confirm'; test: SharedTestView; attempts: number }
  | { step: 'taking'; accessToken: string; submissionId: number }
  | { step: 'done' };

// The take screen is the same component an enrolled student uses; only the door
// it reaches the server through is different.
const SharedTestRunner = ({
  shareToken,
  accessToken,
  submissionId,
  onFinished,
}: {
  shareToken: string;
  accessToken: string;
  submissionId: number;
  onFinished: () => void;
}) => {
  const transport = useMemo<TakeTestTransport>(
    () => ({
      load: async (submissionId: number) => {
        const view = await sharedTestAPI.getSubmission(shareToken, submissionId, accessToken);
        return { test: view.test, startedAt: view.submission.started_at ?? null };
      },
      submit: async (submissionId, answers, timeTakenSeconds) => {
        await sharedTestAPI.submit(shareToken, submissionId, accessToken, answers, timeTakenSeconds);
      },
      onFinished,
    }),
    [shareToken, accessToken, onFinished]
  );

  return <TakeTestPage transport={transport} submissionId={submissionId} />;
};

export const SharedTestPage = () => {
  const { shareToken = '' } = useParams<{ shareToken: string }>();
  const [stage, setStage] = useState<Stage>({ step: 'loading' });
  const [username, setUsername] = useState('');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    sharedTestAPI
      .getTest(shareToken)
      .then((test) => {
        if (!cancelled) setStage({ step: 'form', test });
      })
      .catch(() => {
        if (!cancelled) setStage({ step: 'invalid' });
      });
    return () => {
      cancelled = true;
    };
  }, [shareToken]);

  const start = async (test: SharedTestView, confirm?: boolean) => {
    const trimmed = username.trim();
    if (!trimmed) {
      setError('Enter your username.');
      return;
    }
    setStarting(true);
    setError('');
    try {
      const result = await sharedTestAPI.start(shareToken, trimmed, confirm);
      if (result.needs_confirmation) {
        // Nothing has been created yet — the backend holds the attempt back until
        // this is acknowledged, so "never mind" leaves no half-started submission.
        setStage({ step: 'confirm', test, attempts: result.attempts });
        return;
      }
      setStage({
        step: 'taking',
        accessToken: result.access_token,
        submissionId: result.submission.submission_id,
      });
    } catch (err) {
      setError(handleApiError(err) || 'Could not start this test.');
    } finally {
      setStarting(false);
    }
  };

  if (stage.step === 'taking') {
    return (
      <SharedTestRunner
        shareToken={shareToken}
        accessToken={stage.accessToken}
        submissionId={stage.submissionId}
        onFinished={() => setStage({ step: 'done' })}
      />
    );
  }

  if (stage.step === 'done') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-3 pt-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <FileQuestion className="h-6 w-6" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">Handed in</h1>
            <p className="text-sm text-muted-foreground">
              Your answers are with your teacher. You can close this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (stage.step === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (stage.step === 'invalid') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-3 pt-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <FileQuestion className="h-6 w-6" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">This link is no longer active</h1>
            <p className="text-sm text-muted-foreground">Ask your teacher for a new one.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { test } = stage;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-5 pt-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {formatTestType(test.test_type)}
            </p>
            <h1 className="mt-1 text-xl font-semibold text-foreground">{test.test_name}</h1>
            {test.description && <p className="mt-2 text-sm text-muted-foreground">{test.description}</p>}
          </div>

          <div className="flex flex-wrap gap-4 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
            {test.duration_minutes != null && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {test.duration_minutes} min
              </span>
            )}
            {test.total_marks != null && <span>{test.total_marks} marks</span>}
            {test.passing_marks != null && <span>Pass at {test.passing_marks}</span>}
          </div>

          {test.instructions && (
            <p className="whitespace-pre-line text-sm text-muted-foreground">{test.instructions}</p>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {stage.step === 'confirm' ? (
            <div className="space-y-3">
              <Alert>
                <AlertDescription>
                  You have already attempted this test {stage.attempts === 1 ? 'once' : `${stage.attempts} times`}.
                  Starting again creates a new attempt.
                </AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button onClick={() => start(test, true)} disabled={starting} className="flex-1">
                  {starting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Start again
                </Button>
                <Button variant="outline" onClick={() => setStage({ step: 'form', test })} disabled={starting}>
                  Never mind
                </Button>
              </div>
            </div>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                start(test);
              }}
            >
              <div className="space-y-1.5">
                <label htmlFor="shared-test-username" className="text-sm font-medium text-foreground">
                  Your username
                </label>
                <Input
                  id="shared-test-username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  placeholder="Type the username your teacher gave you"
                />
              </div>
              <Button type="submit" disabled={starting} className="w-full">
                {starting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start test
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SharedTestPage;
