// Page component for viewing MongoDB-backed request logs.

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { requestLogsAPI } from '../../../shared/api/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type LogKind = 'owner' | 'superuser' | 'teacher' | 'student';

interface RequestLogItem {
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
}

const KINDS: { key: LogKind; label: string }[] = [
  { key: 'owner', label: 'Owner' },
  { key: 'superuser', label: 'Superuser' },
  { key: 'teacher', label: 'Teacher' },
  { key: 'student', label: 'Student' },
];

const formatTs = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
};

const getResult = (row: Partial<RequestLogItem>) => {
  const aborted = Boolean(row.aborted);
  const status = Number(row.statusCode || 0);
  const inferredSuccess = !aborted && status > 0 && status < 400;
  const success = aborted ? false : (typeof row.success === 'boolean' ? row.success : inferredSuccess);

  if (aborted) {
    return { label: 'ABORTED', className: 'bg-yellow-100 text-yellow-900 border-yellow-300' };
  }
  if (success) {
    return { label: 'OK', className: 'bg-green-100 text-green-900 border-green-300' };
  }
  return { label: 'FAILED', className: 'bg-red-100 text-red-900 border-red-300' };
};

const RequestLogsPage = () => {
  const [kind, setKind] = useState<LogKind>('owner');
  const [q, setQ] = useState('');
  const [pendingQ, setPendingQ] = useState('');
  const [items, setItems] = useState<RequestLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryKey = useMemo(() => `${kind}::${q}`, [kind, q]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await requestLogsAPI.list({ kind, q, limit: 100, skip: 0 });
        const data = (res as any).data ?? res;
        if (cancelled) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
        setTotal(Number(data?.total ?? 0));
      } catch (e: any) {
        if (cancelled) return;
        setItems([]);
        setTotal(0);
        setError(e?.response?.data?.error || e?.message || 'Failed to load logs');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [queryKey, kind, q]);

  const applySearch = () => setQ(pendingQ.trim());

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">Logs</CardTitle>
          <div className="flex gap-2 items-center w-full max-w-xl">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={pendingQ}
                onChange={(e) => setPendingQ(e.target.value)}
                placeholder="Search by username, path, ip, request id..."
                className="pl-9"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applySearch();
                }}
              />
            </div>
            <Button onClick={applySearch} disabled={loading}>
              Search
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={kind} onValueChange={(v) => setKind(v as LogKind)}>
            <TabsList>
              {KINDS.map((k) => (
                <TabsTrigger key={k.key} value={k.key}>
                  {k.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {KINDS.map((k) => (
              <TabsContent key={k.key} value={k.key} />
            ))}
          </Tabs>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              {loading ? 'Loading…' : `Showing ${items.length} of ${total}`}
              {q ? ` • filter: "${q}"` : ''}
            </div>
            {error ? <span className="text-destructive">{error}</span> : null}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Time</TableHead>
                  <TableHead className="w-[90px]">Method</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead className="w-[110px]">Result</TableHead>
                  <TableHead className="w-[90px]">Status</TableHead>
                  <TableHead className="w-[110px]">Duration</TableHead>
                  <TableHead className="w-[170px]">User</TableHead>
                  <TableHead className="w-[140px]">IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      {loading ? 'Loading logs…' : 'No logs found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((row, idx) => {
                    const result = getResult(row);
                    return (
                    <TableRow key={row.requestId || String(idx)}>
                      <TableCell className="whitespace-nowrap">{formatTs(row.ts)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{String(row.method || '').toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.originalUrl || row.path}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${result.className}`}
                        >
                          {result.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.statusCode || '-'}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{row.durationMs ?? '-'} ms</TableCell>
                      <TableCell className="truncate">
                        {row.username || '-'}
                        <span className="text-xs text-muted-foreground">
                          {row.userType ? ` • ${row.userType}` : ''}
                          {row.role ? `/${row.role}` : ''}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{row.ip || '-'}</TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RequestLogsPage;
