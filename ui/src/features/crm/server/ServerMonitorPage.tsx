import { useEffect, useMemo, useState } from 'react';
import { Activity, Clock, Cpu, Database, HardDrive, Loader2, RefreshCw, Server, Signal } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { systemAPI } from './api';

type ServerStats = {
  status: string;
  timestamp: string;
  service: {
    name: string;
    environment: string;
    pid: number;
    nodeVersion: string;
    uptimeSeconds: number;
  };
  host: {
    hostname: string;
    platform: string;
    release: string;
    arch: string;
    uptimeSeconds: number;
  };
  cpu: {
    cores: number;
    model: string;
    loadAverage: number[];
    loadPercent: number;
  };
  memory: {
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
    usedPercent: number;
    process: {
      rssBytes: number;
      heapTotalBytes: number;
      heapUsedBytes: number;
      heapLimitBytes?: number;
      externalBytes: number;
      arrayBuffersBytes: number;
    };
  };
  database: {
    status: string;
    latencyMs: number | null;
  };
};

type StatsSample = {
  timestamp: string;
  cpu: number;
  memory: number;
  heap: number;
};

const refreshOptions = [5, 15, 30, 60];

const formatBytes = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatDuration = (seconds: number) => {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  const days = Math.floor(value / 86400);
  const hours = Math.floor((value % 86400) / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const formatTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const getHeapLimitBytes = (stats: ServerStats) =>
  stats.memory.process.heapLimitBytes || stats.memory.process.heapTotalBytes || 0;

const getHeapPressurePercent = (stats: ServerStats) => {
  const heapLimitBytes = getHeapLimitBytes(stats);
  if (!heapLimitBytes) return 0;
  return (stats.memory.process.heapUsedBytes / heapLimitBytes) * 100;
};

const percentTone = (value: number) => {
  if (value >= 90) return 'bg-rose-500';
  if (value >= 70) return 'bg-amber-500';
  return 'bg-emerald-500';
};

const MetricCard = ({
  label,
  value,
  detail,
  Icon,
}: {
  label: string;
  value: string;
  detail: string;
  Icon: typeof Activity;
}) => (
  <Card className="border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
    <CardContent className="flex items-center gap-3 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
        <p className="mt-1 truncate text-2xl font-bold text-slate-950 dark:text-foreground">{value}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p>
      </div>
    </CardContent>
  </Card>
);

const UsageBar = ({ label, value, detail }: { label: string; value: number; detail: string }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="font-medium text-slate-900 dark:text-foreground">{label}</span>
      <span className="text-muted-foreground">{value.toFixed(1)}%</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-muted">
      <div className={`h-full rounded-full ${percentTone(value)}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
    <p className="text-xs text-muted-foreground">{detail}</p>
  </div>
);

const ServerMonitorPage = () => {
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [history, setHistory] = useState<StatsSample[]>([]);
  const [refreshSeconds, setRefreshSeconds] = useState(15);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setError(null);
      const response = await systemAPI.getStats();
      const nextStats = ((response as any).data ?? response) as ServerStats;
      setStats(nextStats);
      setHistory((current) => {
        const heapPercent = getHeapPressurePercent(nextStats);
        const next = [
          ...current,
          {
            timestamp: nextStats.timestamp,
            cpu: nextStats.cpu.loadPercent,
            memory: nextStats.memory.usedPercent,
            heap: heapPercent,
          },
        ];
        return next.slice(-12);
      });
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load server stats.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStats();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadStats();
    }, refreshSeconds * 1000);
    return () => window.clearInterval(interval);
  }, [refreshSeconds]);

  const heapPercent = useMemo(() => {
    if (!stats) return 0;
    return getHeapPressurePercent(stats);
  }, [stats]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Server Monitor"
        description="Live backend process, host, database, CPU, and memory telemetry."
        icon={Server}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border bg-background p-1">
              {refreshOptions.map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  onClick={() => setRefreshSeconds(seconds)}
                  className={`h-7 rounded-md px-2 text-xs font-semibold ${refreshSeconds === seconds ? 'bg-slate-900 text-white dark:bg-primary' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  {seconds}s
                </button>
              ))}
            </div>
            <Button type="button" size="sm" onClick={() => void loadStats()} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
          </div>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!stats && loading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading server telemetry...
          </CardContent>
        </Card>
      ) : stats ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Backend" value={stats.status} detail={`${stats.service.environment} / ${stats.service.nodeVersion}`} Icon={Signal} />
            <MetricCard label="Database" value={stats.database.status} detail={stats.database.latencyMs == null ? 'Latency unavailable' : `${stats.database.latencyMs} ms latency`} Icon={Database} />
            <MetricCard label="Process uptime" value={formatDuration(stats.service.uptimeSeconds)} detail={`PID ${stats.service.pid}`} Icon={Clock} />
            <MetricCard label="Host uptime" value={formatDuration(stats.host.uptimeSeconds)} detail={stats.host.hostname} Icon={Server} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <Card className="border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-primary" />
                  Resource Utilization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <UsageBar label="CPU load" value={stats.cpu.loadPercent} detail={`${stats.cpu.cores} cores / 1m load ${Number(stats.cpu.loadAverage[0] || 0).toFixed(2)}`} />
                <UsageBar label="Host memory" value={stats.memory.usedPercent} detail={`${formatBytes(stats.memory.usedBytes)} used of ${formatBytes(stats.memory.totalBytes)}`} />
                <UsageBar label="Node heap pressure" value={heapPercent} detail={`${formatBytes(stats.memory.process.heapUsedBytes)} used of ${formatBytes(getHeapLimitBytes(stats))} limit`} />
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Cpu className="h-4 w-4 text-primary" />
                  Runtime Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">CPU</span><span className="text-right font-medium">{stats.cpu.model}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Platform</span><span className="font-medium">{stats.host.platform} {stats.host.arch}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Release</span><span className="font-medium">{stats.host.release}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">RSS</span><span className="font-medium">{formatBytes(stats.memory.process.rssBytes)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Heap committed</span><span className="font-medium">{formatBytes(stats.memory.process.heapTotalBytes)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">External</span><span className="font-medium">{formatBytes(stats.memory.process.externalBytes)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Last sample</span><span className="font-medium">{formatTime(stats.timestamp)}</span></div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <HardDrive className="h-4 w-4 text-primary" />
                Recent Samples
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {history.map((sample) => (
                  <div key={sample.timestamp} className="rounded-lg border bg-slate-50 p-3 text-xs dark:bg-muted/30">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-semibold">{formatTime(sample.timestamp)}</span>
                      <span className="text-muted-foreground">auto</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span>CPU {sample.cpu.toFixed(1)}%</span>
                      <span>Mem {sample.memory.toFixed(1)}%</span>
                      <span>Heap {sample.heap.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
};

export default ServerMonitorPage;
