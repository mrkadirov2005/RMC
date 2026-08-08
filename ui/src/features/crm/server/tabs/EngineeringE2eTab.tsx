import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ban, CheckCircle2, CirclePlay, Clock3, FlaskConical, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { systemAPI } from '@/shared/api/api';
import { getErrorMessage } from '@/utils/errorMessage';

type Flow = { id: string; label: string; group: string };
type Run = {
  runId: string;
  flowId: string;
  label: string;
  status: 'running' | 'passed' | 'failed' | 'cancelled';
  startedAt: string;
  finishedAt: string | null;
  exitCode: number | null;
  durationMs: number | null;
  output: string;
};

const statusIcon = {
  running: Loader2,
  passed: CheckCircle2,
  failed: XCircle,
  cancelled: Ban,
};

const statusTone = (status: Run['status']) =>
  status === 'passed' ? 'success' : status === 'running' ? 'info' : status === 'cancelled' ? 'warning' : 'destructive';

const formatDuration = (durationMs: number | null) => {
  if (durationMs == null) return 'Running';
  const seconds = Math.max(0, Math.round(durationMs / 1000));
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

const EngineeringE2eTab = () => {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [database, setDatabase] = useState('');
  const [active, setActive] = useState<Run | null>(null);
  const [recent, setRecent] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [catalogResponse, statusResponse] = await Promise.all([
        systemAPI.getE2eFlows(),
        systemAPI.getE2eStatus(),
      ]);
      const catalog = catalogResponse.data;
      const status = statusResponse.data;
      setFlows(Array.isArray(catalog?.flows) ? catalog.flows : []);
      setEnabled(Boolean(catalog?.enabled));
      setDatabase(String(catalog?.database || ''));
      setActive(status?.active || null);
      setRecent(Array.isArray(status?.recent) ? status.recent : []);
      setError('');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (active?.status !== 'running') return;
    const interval = window.setInterval(() => void load(true), 1500);
    return () => window.clearInterval(interval);
  }, [active?.status, load]);

  const groups = useMemo(() => flows.reduce<Record<string, Flow[]>>((all, flow) => {
    (all[flow.group] ||= []).push(flow);
    return all;
  }, {}), [flows]);

  const start = async (flowId: string) => {
    setStartingId(flowId);
    setError('');
    try {
      const response = await systemAPI.startE2eRun(flowId);
      setActive(response.data);
      await load(true);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setStartingId(null);
    }
  };

  const cancel = async () => {
    if (!active?.runId) return;
    try {
      await systemAPI.cancelE2eRun(active.runId);
      await load(true);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  if (loading) return <div className="flex min-h-52 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-card p-4">
        <div>
          <div className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-violet-600" /><h2 className="text-lg font-bold">E2E Flows</h2></div>
          <p className="mt-1 text-sm text-muted-foreground">Run predefined Playwright flows against the isolated E2E stack.</p>
          <div className="mt-2 flex flex-wrap gap-2"><Badge variant={enabled ? 'success' : 'destructive'}>{enabled ? 'Runner enabled' : 'Runner disabled'}</Badge><Badge variant="outline">Database: {database || 'not configured'}</Badge></div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {!enabled && <Alert><AlertDescription>Set E2E_RUNNER_ENABLED=true on the development backend to enable execution.</AlertDescription></Alert>}

      {active && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><CardTitle className="text-base">{active.flowId}: {active.label}</CardTitle><CardDescription>Started {new Date(active.startedAt).toLocaleString()}</CardDescription></div>
              <div className="flex items-center gap-2"><Badge variant={statusTone(active.status) as any}>{active.status}</Badge>{active.status === 'running' && <Button variant="destructive" size="sm" onClick={() => void cancel()}>Cancel</Button>}</div>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100">{active.output || 'Waiting for output...'}</pre>
          </CardContent>
        </Card>
      )}

      {Object.entries(groups).map(([group, groupFlows]) => (
        <section key={group} className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{group}</h3>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {groupFlows.map((flow) => (
              <button key={flow.id} type="button" disabled={!enabled || active?.status === 'running' || startingId !== null} onClick={() => void start(flow.id)} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 text-left transition hover:border-violet-400 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50">
                <div className="min-w-0"><p className="text-xs font-black text-violet-700">{flow.id}</p><p className="mt-0.5 text-sm font-semibold">{flow.label}</p></div>
                {startingId === flow.id ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" /> : <CirclePlay className="h-5 w-5 shrink-0 text-violet-600" />}
              </button>
            ))}
          </div>
        </section>
      ))}

      {recent.length > 0 && (
        <Card><CardHeader><CardTitle className="text-base">Recent runs</CardTitle></CardHeader><CardContent className="space-y-2">{recent.map((run) => {
          const Icon = statusIcon[run.status];
          return <div key={run.runId} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"><div className="flex items-center gap-2"><Icon className={`h-4 w-4 ${run.status === 'running' ? 'animate-spin' : ''}`} /><span className="text-sm font-semibold">{run.flowId}: {run.label}</span></div><div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{formatDuration(run.durationMs)}</span><Badge variant={statusTone(run.status) as any}>{run.status}</Badge></div></div>;
        })}</CardContent></Card>
      )}
    </div>
  );
};

export default EngineeringE2eTab;
