import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, DatabaseBackup, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { systemAPI } from '@/shared/api/api';
import { showToast } from '@/utils/toast';

type BackupRun = {
  run_id: string;
  started_at: string;
  completed_at: string | null;
  status: 'started' | 'success' | 'failed' | string;
  trigger_source: 'manual' | 'scheduled' | string;
  error_message: string | null;
};

type BackupStats = {
  total: number;
  successful: number;
  failed: number;
  running: number;
  lastCompletedAt: string | null;
  recent: BackupRun[];
};

const formatDate = (value: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleString();
};

const EngineeringBackupTab = () => {
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [error, setError] = useState('');
  const [backupSubmitting, setBackupSubmitting] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const response = await systemAPI.getBackupStats();
      setStats(response.data);
      setError('');
    } catch (loadError: any) {
      setError(loadError?.response?.data?.error || 'Could not load backup statistics.');
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await systemAPI.getBackupStats();
        if (active) {
          setStats(response.data);
          setError('');
        }
      } catch (loadError: any) {
        if (active) setError(loadError?.response?.data?.error || 'Could not load backup statistics.');
      }
    };
    void load();
    const interval = window.setInterval(load, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const triggerBackup = async () => {
    if (!window.confirm('Start a backup now and send it to the configured Telegram chat?')) return;
    setBackupSubmitting(true);
    try {
      await systemAPI.triggerBackup();
      showToast.success('Backup started. The history will update when it finishes.');
      window.setTimeout(() => void loadStats(), 2000);
    } catch (triggerError: any) {
      showToast.error(triggerError?.response?.data?.error || 'Could not start backup.');
    } finally {
      setBackupSubmitting(false);
    }
  };

  const cards = [
    { label: 'Total backups', value: stats?.total ?? 0, icon: DatabaseBackup, color: 'text-primary' },
    { label: 'Successful', value: stats?.successful ?? 0, icon: CheckCircle2, color: 'text-emerald-600' },
    { label: 'Failed', value: stats?.failed ?? 0, icon: AlertCircle, color: 'text-red-600' },
    { label: 'Running', value: stats?.running ?? 0, icon: Clock3, color: 'text-amber-600' },
  ];

  return (
    <div className="space-y-4">
      {error && (
        <Card className="border-red-200">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </CardContent>
        </Card>
      )}

      <Card className="border-cyan-200 bg-cyan-50/60 dark:border-cyan-500/20 dark:bg-cyan-500/5">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Run backup now</p>
            <p className="text-sm text-muted-foreground">
              Starts the backup worker immediately and records the result here.
            </p>
          </div>
          <Button type="button" className="gap-2 bg-cyan-600 text-white hover:bg-cyan-700" onClick={triggerBackup} disabled={backupSubmitting}>
            <Upload className="h-4 w-4" />
            {backupSubmitting ? 'Starting...' : 'Run backup now'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="mt-1 text-2xl font-bold">{card.value}</p>
                </div>
                <Icon className={`h-7 w-7 ${card.color}`} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Backup history</CardTitle>
          <p className="text-sm text-muted-foreground">
            Last completed: {formatDate(stats?.lastCompletedAt || null)}
          </p>
        </CardHeader>
        <CardContent>
          {!stats && !error ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading backup history...
            </div>
          ) : stats?.recent.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 font-medium">Started</th>
                    <th className="px-2 py-2 font-medium">Source</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 font-medium">Completed</th>
                    <th className="px-2 py-2 font-medium">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.map((run) => (
                    <tr key={run.run_id} className="border-b last:border-0">
                      <td className="px-2 py-3">{formatDate(run.started_at)}</td>
                      <td className="px-2 py-3 capitalize">{run.trigger_source}</td>
                      <td className="px-2 py-3">
                        <span className={run.status === 'success' ? 'font-semibold text-emerald-600' : run.status === 'failed' ? 'font-semibold text-red-600' : 'font-semibold text-amber-600'}>
                          {run.status}
                        </span>
                      </td>
                      <td className="px-2 py-3">{formatDate(run.completed_at)}</td>
                      <td className="max-w-[28rem] truncate px-2 py-3 text-red-600" title={run.error_message || undefined}>{run.error_message || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No backup runs have been recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EngineeringBackupTab;
