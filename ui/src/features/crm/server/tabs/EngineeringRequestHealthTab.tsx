import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock, Loader2, RefreshCw, ShieldAlert, TimerReset } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { requestLogsAPI } from '../api';

type RequestKind = 'owner' | 'superuser' | 'teacher' | 'student';
type RequestHealthMode = 'warnings' | 'failed';

type RequestLogItem = {
  _id?: string;
  ts: string;
  requestId: string;
  method: string;
  path: string;
  originalUrl: string;
  statusCode: number;
  success: boolean;
  aborted: boolean;
  durationMs: number;
  ip: string | null;
  username: string | null;
  userType: string | null;
  role: string | null;
  failureReason?: string | null;
  failureDetails?: string | null;
};

const requestKinds: RequestKind[] = ['owner', 'superuser', 'teacher', 'student'];
const slowThresholdMs = 2500;

const formatTs = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '-';
  return date.toLocaleString();
};

const pathLabel = (row: RequestLogItem) => row.originalUrl || row.path || '-';

const failureLabel = (row: RequestLogItem) => {
  if (row.failureReason) return row.failureReason;
  if (row.aborted) return 'Client connection closed before the response finished.';
  if (!row.success || Number(row.statusCode || 0) >= 400) return 'No failure reason captured for this older log.';
  return '-';
};

const loadLogs = async (mode: RequestHealthMode) => {
  const responses = await Promise.all(
    requestKinds.map(async (kind) => {
      const params = mode === 'warnings'
        ? { kind, limit: 50, durationMin: slowThresholdMs }
        : { kind, limit: 50, result: 'failed', statusMin: 400 };
      const response = await requestLogsAPI.list(params);
      const data = (response as any).data ?? response;
      return (Array.isArray(data?.items) ? data.items : []).map((item: RequestLogItem) => ({ ...item, scope: kind }));
    })
  );

  const merged = responses.flat() as Array<RequestLogItem & { scope: RequestKind }>;
  return merged
    .filter((row) => mode === 'failed' || row.aborted || Number(row.durationMs || 0) >= slowThresholdMs)
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 80);
};

const resultBadge = (row: RequestLogItem) => {
  if (row.aborted) return <Badge className="border-amber-300 bg-amber-100 text-amber-900">ABORTED</Badge>;
  if (!row.success || Number(row.statusCode || 0) >= 400) return <Badge className="border-rose-300 bg-rose-100 text-rose-900">FAILED</Badge>;
  return <Badge className="border-blue-300 bg-blue-100 text-blue-900">SLOW</Badge>;
};

const EngineeringRequestHealthTab = ({ mode }: { mode: RequestHealthMode }) => {
  const [items, setItems] = useState<Array<RequestLogItem & { scope: RequestKind }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const title = mode === 'warnings' ? 'Request Warnings' : 'Failed Requests';
  const description = mode === 'warnings'
    ? `Requests over ${slowThresholdMs.toLocaleString()} ms or aborted before completing.`
    : 'Requests that returned failure status codes or failed result markers.';
  const Icon = mode === 'warnings' ? AlertTriangle : ShieldAlert;

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      setItems(await loadLogs(mode));
    } catch (err: any) {
      setItems([]);
      setError(err?.response?.data?.error || err?.message || 'Failed to load request health logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [mode]);

  const stats = useMemo(() => {
    const aborted = items.filter((item) => item.aborted).length;
    const failed = items.filter((item) => !item.aborted && (!item.success || Number(item.statusCode || 0) >= 400)).length;
    const slow = items.filter((item) => Number(item.durationMs || 0) >= slowThresholdMs).length;
    const avg = items.length
      ? Math.round(items.reduce((sum, item) => sum + Number(item.durationMs || 0), 0) / items.length)
      : 0;
    return { aborted, failed, slow, avg };
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Icon className="h-5 w-5 text-primary" />
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button type="button" size="sm" onClick={() => void load()} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="bg-slate-950 text-white">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-white/60">Loaded</p>
            <p className="mt-1 text-3xl font-bold">{items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Slow</p>
            <p className="mt-1 text-3xl font-bold">{stats.slow}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Failed</p>
            <p className="mt-1 text-3xl font-bold">{stats.failed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Avg Duration</p>
            <p className="mt-1 text-3xl font-bold">{stats.avg} ms</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TimerReset className="h-4 w-4 text-primary" />
            Latest Matching Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Scope</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      Loading request health...
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                      No matching requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((row) => (
                    <TableRow key={row._id || row.requestId || `${row.ts}-${row.path}`}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatTs(row.ts)}</TableCell>
                      <TableCell>{resultBadge(row)}</TableCell>
                      <TableCell className="font-semibold">{row.method || '-'}</TableCell>
                      <TableCell className="max-w-[420px] truncate font-medium">{pathLabel(row)}</TableCell>
                      <TableCell>{row.statusCode || '-'}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {Number(row.durationMs || 0).toLocaleString()} ms
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[320px]">
                        <div className="truncate font-medium">{failureLabel(row)}</div>
                        {row.failureDetails && (
                          <div className="mt-1 truncate text-xs text-muted-foreground">{row.failureDetails}</div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">{row.username || '-'}</TableCell>
                      <TableCell className="capitalize">{row.scope}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EngineeringRequestHealthTab;
