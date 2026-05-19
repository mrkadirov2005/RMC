// Page component for viewing MongoDB-backed request logs.

import { useEffect, useMemo, useState } from 'react';
import { Activity, ChevronLeft, ChevronRight, Clock, Database, Filter, Search, ShieldCheck, X } from 'lucide-react';
import { requestLogsAPI } from '../../../shared/api/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getErrorMessage } from '@/utils/errorMessage';

type LogKind = 'owner' | 'superuser' | 'teacher' | 'student';

interface LogFilters {
  method: string;
  result: string;
  statusCode: string;
  statusMin: string;
  statusMax: string;
  durationMin: string;
  durationMax: string;
  username: string;
  ip: string;
  path: string;
  requestId: string;
  role: string;
  deviceId: string;
  from: string;
  to: string;
}

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

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const EMPTY_FILTERS: LogFilters = {
  method: 'all',
  result: 'all',
  statusCode: '',
  statusMin: '',
  statusMax: '',
  durationMin: '',
  durationMax: '',
  username: '',
  ip: '',
  path: '',
  requestId: '',
  role: '',
  deviceId: '',
  from: '',
  to: '',
};

const cleanParams = (filters: LogFilters) => {
  const params: Record<string, string> = {};
  Object.entries(filters).forEach(([key, value]) => {
    const trimmed = String(value || '').trim();
    if (!trimmed || trimmed === 'all') return;
    params[key] = trimmed;
  });
  return params;
};

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
  const [filters, setFilters] = useState<LogFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [items, setItems] = useState<RequestLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);

  const filterParams = useMemo(() => cleanParams(filters), [filters]);
  const activeFilterCount = useMemo(() => Object.keys(filterParams).length + (q ? 1 : 0), [filterParams, q]);
  const queryKey = useMemo(
    () => JSON.stringify({ kind, q, filterParams, limit, page }),
    [filterParams, kind, limit, page, q]
  );
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(total, page * limit);
  const successfulRows = items.filter((row) => getResult(row).label === 'OK').length;
  const failedRows = items.filter((row) => getResult(row).label === 'FAILED').length;
  const avgDuration = items.length
    ? Math.round(items.reduce((sum, row) => sum + (Number(row.durationMs) || 0), 0) / items.length)
    : 0;
  const uniqueUsers = new Set(items.map((row) => String(row.username || '').trim()).filter(Boolean)).size;
  const loggedUsers = useMemo(() => {
    const users = new Map<string, {
      username: string;
      userType: string;
      role: string;
      count: number;
      lastSeen: string;
      success: number;
      failed: number;
    }>();

    items.forEach((row) => {
      const username = String(row.username || '').trim();
      if (!username) return;
      const existing = users.get(username) || {
        username,
        userType: row.userType || '-',
        role: row.role || '-',
        count: 0,
        lastSeen: row.ts,
        success: 0,
        failed: 0,
      };
      existing.count += 1;
      existing.userType = existing.userType === '-' ? row.userType || '-' : existing.userType;
      existing.role = existing.role === '-' ? row.role || '-' : existing.role;
      if (new Date(row.ts).getTime() > new Date(existing.lastSeen).getTime()) {
        existing.lastSeen = row.ts;
      }
      if (getResult(row).label === 'OK') existing.success += 1;
      if (getResult(row).label === 'FAILED') existing.failed += 1;
      users.set(username, existing);
    });

    return Array.from(users.values()).sort((a, b) => b.count - a.count || a.username.localeCompare(b.username));
  }, [items]);
  const summaryCards = [
    {
      label: 'Logs loaded',
      value: items.length.toLocaleString(),
      detail: `${total.toLocaleString()} total`,
      icon: Database,
      shell: 'from-indigo-50 via-white to-sky-50 border-indigo-100',
      iconShell: 'from-indigo-500 to-sky-500',
      text: 'text-indigo-950',
    },
    {
      label: 'Successful',
      value: successfulRows.toLocaleString(),
      detail: `${failedRows.toLocaleString()} failed`,
      icon: ShieldCheck,
      shell: 'from-emerald-50 via-white to-teal-50 border-emerald-100',
      iconShell: 'from-emerald-500 to-teal-500',
      text: 'text-emerald-950',
    },
    {
      label: 'Avg duration',
      value: `${avgDuration} ms`,
      detail: 'Current page',
      icon: Clock,
      shell: 'from-amber-50 via-white to-orange-50 border-amber-100',
      iconShell: 'from-amber-500 to-orange-500',
      text: 'text-amber-950',
    },
    {
      label: 'Users',
      value: uniqueUsers.toLocaleString(),
      detail: KINDS.find((item) => item.key === kind)?.label || 'Current scope',
      icon: Activity,
      shell: 'from-cyan-50 via-white to-fuchsia-50 border-cyan-100',
      iconShell: 'from-cyan-500 to-fuchsia-500',
      text: 'text-slate-950',
    },
  ];

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await requestLogsAPI.list({ kind, q, ...filterParams, limit, skip: (page - 1) * limit });
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
  }, [filterParams, kind, limit, page, q, queryKey]);

  const applySearch = () => {
    setPage(1);
    setQ(pendingQ.trim());
  };

  const updateFilter = (key: keyof LogFilters, value: string) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const clearFilters = () => {
    setPage(1);
    setPendingQ('');
    setQ('');
    setFilters(EMPTY_FILTERS);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/70 to-emerald-50/55 p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.65)] dark:border-border dark:bg-card dark:bg-none dark:shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 dark:hidden" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-72 bg-gradient-to-l from-fuchsia-100/45 via-amber-100/35 to-transparent dark:hidden" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-900/10 dark:shadow-none">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-950 dark:text-foreground">Logs</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Inspect request activity, users, results, latency, and access traces.
              </p>
            </div>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            const isUsersCard = card.label === 'Users';
            return (
              <button
                key={card.label}
                type="button"
                disabled={!isUsersCard}
                onClick={() => isUsersCard && setUsersDialogOpen(true)}
                className={`rounded-lg border bg-gradient-to-br ${card.shell} p-4 text-left shadow-sm transition-all dark:border-border dark:bg-card dark:bg-none dark:shadow-none ${
                  isUsersCard
                    ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:hover:translate-y-0 dark:hover:shadow-sm'
                    : 'cursor-default'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">{card.label}</p>
                    <p className={`mt-1 text-2xl font-bold ${card.text} dark:text-card-foreground`}>{card.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{isUsersCard ? 'Click to view accounts' : card.detail}</p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${card.iconShell} text-white shadow-md shadow-slate-900/10 dark:shadow-none`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={usersDialogOpen} onOpenChange={setUsersDialogOpen}>
        <DialogContent className="max-h-[86vh] max-w-4xl overflow-hidden border-sky-100 bg-white p-0 dark:border-border dark:bg-background">
          <DialogHeader className="relative border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-6 py-5 dark:border-border dark:bg-background dark:bg-none">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 dark:hidden" />
            <DialogTitle>Logged User Accounts</DialogTitle>
            <DialogDescription>
              Accounts found in the currently loaded log results for {KINDS.find((item) => item.key === kind)?.label}.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[62vh] overflow-auto px-6 py-4">
            {loggedUsers.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No logged user accounts found in these results.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/90 dark:bg-transparent">
                  <TableRow>
                    <TableHead>User account</TableHead>
                    <TableHead>User type</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                    <TableHead className="text-right">OK</TableHead>
                    <TableHead className="text-right">Failed</TableHead>
                    <TableHead>Last seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loggedUsers.map((user) => (
                    <TableRow key={user.username}>
                      <TableCell className="font-semibold text-slate-950 dark:text-card-foreground">{user.username}</TableCell>
                      <TableCell>{user.userType}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell className="text-right font-semibold">{user.count.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-emerald-700 dark:text-emerald-300">{user.success.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-rose-700 dark:text-rose-300">{user.failed.toLocaleString()}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatTs(user.lastSeen)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-[0_18px_50px_-38px_rgba(15,23,42,0.6)] dark:border-border dark:bg-card dark:shadow-sm">
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 dark:hidden" />
        <CardHeader className="flex flex-col gap-4 bg-gradient-to-r from-sky-50/80 via-white to-emerald-50/70 lg:flex-row lg:items-center lg:justify-between dark:bg-none">
          <CardTitle className="flex items-center gap-2 text-xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-100 to-emerald-100 text-sky-700 dark:bg-muted dark:bg-none dark:text-muted-foreground">
              <Database className="h-5 w-5" />
            </span>
            Request Activity
          </CardTitle>
          <div className="flex w-full max-w-2xl items-center gap-2">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={pendingQ}
                onChange={(e) => setPendingQ(e.target.value)}
                placeholder="Search by username, path, ip, request id..."
                className="border-white/80 bg-white/90 pl-9 shadow-sm dark:border-input dark:bg-background dark:shadow-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applySearch();
                }}
              />
            </div>
            <Button onClick={applySearch} disabled={loading}>
              Search
            </Button>
            <Button type="button" variant={showFilters ? 'default' : 'outline'} onClick={() => setShowFilters((value) => !value)} className={showFilters ? 'shadow-md shadow-sky-900/10 dark:shadow-none' : 'border-white/80 bg-white/80 shadow-sm dark:border-input dark:bg-background dark:shadow-none'}>
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {activeFilterCount > 0 ? (
                <Badge className="ml-2 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]">
                  {activeFilterCount}
                </Badge>
              ) : null}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={kind} onValueChange={(v) => { setPage(1); setKind(v as LogKind); }}>
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

          {showFilters && (
            <div className="grid gap-4 rounded-lg border border-cyan-100 bg-gradient-to-br from-white via-cyan-50/45 to-amber-50/30 p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4 dark:border-border dark:bg-muted/20 dark:bg-none dark:shadow-none">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Method</Label>
                <Select value={filters.method} onValueChange={(value) => updateFilter('method', value)}>
                  <SelectTrigger><SelectValue placeholder="All methods" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All methods</SelectItem>
                    {METHODS.map((method) => <SelectItem key={method} value={method}>{method}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Result</Label>
                <Select value={filters.result} onValueChange={(value) => updateFilter('result', value)}>
                  <SelectTrigger><SelectValue placeholder="All results" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All results</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="aborted">Aborted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Exact status</Label>
                <Input value={filters.statusCode} onChange={(e) => updateFilter('statusCode', e.target.value)} placeholder="200" inputMode="numeric" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Status min</Label>
                  <Input value={filters.statusMin} onChange={(e) => updateFilter('statusMin', e.target.value)} placeholder="400" inputMode="numeric" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Status max</Label>
                  <Input value={filters.statusMax} onChange={(e) => updateFilter('statusMax', e.target.value)} placeholder="599" inputMode="numeric" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Username</Label>
                <Input value={filters.username} onChange={(e) => updateFilter('username', e.target.value)} placeholder="username or email" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">IP</Label>
                <Input value={filters.ip} onChange={(e) => updateFilter('ip', e.target.value)} placeholder="127.0.0.1" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Path</Label>
                <Input value={filters.path} onChange={(e) => updateFilter('path', e.target.value)} placeholder="/api/students" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Request ID</Label>
                <Input value={filters.requestId} onChange={(e) => updateFilter('requestId', e.target.value)} placeholder="request id" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Role</Label>
                <Input value={filters.role} onChange={(e) => updateFilter('role', e.target.value)} placeholder="owner" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Device ID</Label>
                <Input value={filters.deviceId} onChange={(e) => updateFilter('deviceId', e.target.value)} placeholder="device id" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Duration min</Label>
                  <Input value={filters.durationMin} onChange={(e) => updateFilter('durationMin', e.target.value)} placeholder="0" inputMode="numeric" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Duration max</Label>
                  <Input value={filters.durationMax} onChange={(e) => updateFilter('durationMax', e.target.value)} placeholder="1000" inputMode="numeric" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">From</Label>
                <Input type="datetime-local" value={filters.from} onChange={(e) => updateFilter('from', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">To</Label>
                <Input type="datetime-local" value={filters.to} onChange={(e) => updateFilter('to', e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button type="button" variant="outline" onClick={clearFilters} disabled={activeFilterCount === 0}>
                  <X className="mr-2 h-4 w-4" />
                  Clear filters
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-sm text-muted-foreground dark:border-border dark:bg-transparent">
            <div>
              {loading ? 'Loading...' : `Showing ${start}-${end} of ${total}`}
              {q ? ` • filter: "${q}"` : ''}
            </div>
            {error ? <span className="text-destructive">{getErrorMessage(error)}</span> : null}
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-border dark:bg-card">
            <Table>
              <TableHeader className="bg-slate-50/90 dark:bg-transparent">
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
                    <TableRow key={row.requestId || String(idx)} className="hover:bg-sky-50/60 dark:hover:bg-muted/50">
                      <TableCell className="whitespace-nowrap">{formatTs(row.ts)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{String(row.method || '').toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-indigo-700 dark:text-muted-foreground">
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

          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-border dark:bg-transparent">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={String(limit)} onValueChange={(value) => { setPage(1); setLimit(Number(value)); }}>
                <SelectTrigger className="h-9 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[25, 50, 100, 200].map((value) => (
                    <SelectItem key={value} value={String(value)}>{value} / page</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1 || loading}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Prev
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages || loading}>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RequestLogsPage;
