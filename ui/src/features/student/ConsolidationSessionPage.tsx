// Authenticated-portal entry point for a session's vocabulary consolidation
// exercise — minimal for this phase (no dashboard discoverability card yet,
// that's a follow-up); a directly-navigable route is enough for now.

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { handleApiError } from '@/utils/toast';
import { TakeConsolidationPage } from './TakeConsolidationPage';
import { consolidationPortalAPI, type ConsolidationTrial, type ConsolidationWord, type StudentSetView } from './api/consolidationExerciseApi';

export const ConsolidationSessionPage = () => {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<StudentSetView | null>(null);
  const [starting, setStarting] = useState(false);
  const [started, setStarted] = useState<{ trial: ConsolidationTrial; words: ConsolidationWord[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    consolidationPortalAPI
      .getStudentView(Number(sessionId))
      .then((data) => {
        if (!cancelled) setData(data);
      })
      .catch((err) => {
        if (!cancelled) setError(handleApiError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const start = async () => {
    if (!data) return;
    setStarting(true);
    setError('');
    try {
      const result = await consolidationPortalAPI.startTrial(data.consolidation_set_id);
      setStarted({ trial: result.trial, words: result.words });
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <main data-translation-skip className="flex min-h-screen items-center justify-center bg-[#f6fbff]">
        <Loader2 className="h-8 w-8 animate-spin text-[#16a7e2]" />
      </main>
    );
  }

  if (started && data) {
    return (
      <TakeConsolidationPage
        context={{ mode: 'auth', setId: data.consolidation_set_id }}
        initialTrial={started.trial}
        initialWords={started.words}
        violationLimit={data.violation_limit}
      />
    );
  }

  return (
    <main data-translation-skip className="flex min-h-screen items-center justify-center bg-[#f6fbff] px-5 text-[#21116a]">
      <Card className="w-full max-w-md border-[#d8e4f1]">
        <CardContent className="space-y-4 p-8 text-center">
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50 text-left text-red-800">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {data && (
            <>
              <h1 className="text-xl font-semibold">{data.title || 'Vocabulary Exercise'}</h1>
              <p className="text-sm text-slate-500">{data.words.length} words</p>
              <Button onClick={start} disabled={starting} className="h-11 w-full bg-[#21116a] text-white hover:bg-[#160a4d]">
                {starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Start Exercise
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default ConsolidationSessionPage;
