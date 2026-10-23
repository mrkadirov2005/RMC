// Monitoring: how the server's CPU and memory have been over time, and when the requests come.
import { useCallback, useEffect, useState } from 'react';
import { Activity, BarChart3, Loader2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getApiPayload } from '@/shared/api/response';
import { getErrorMessage } from '@/utils/errorMessage';
import { systemAPI } from '../api';
import { RANGES, type History, type Traffic } from '../monitoring/monitoringModel';
import { ServerLoadPanel } from '../monitoring/ServerLoadPanel';
import { TrafficPanel } from '../monitoring/TrafficPanel';

type Section = 'load' | 'traffic';

const EngineeringMonitoringTab = () => {
  const [section, setSection] = useState<Section>('load');
  const [days, setDays] = useState(1);
  const [history, setHistory] = useState<History | null>(null);
  const [traffic, setTraffic] = useState<Traffic | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (section === 'load') setHistory(getApiPayload<History>(await systemAPI.getMetricsHistory(days)));
      else setTraffic(getApiPayload<Traffic>(await systemAPI.getTrafficStats(days)));
    } catch (requestError) {
      setError(getErrorMessage(requestError) || 'Could not load the monitoring data.');
    } finally {
      setLoading(false);
    }
  }, [section, days]);

  useEffect(() => { void load(); }, [load]);

  const sections: Array<{ id: Section; label: string; icon: typeof Activity }> = [
    { id: 'load', label: 'Server load', icon: Activity },
    { id: 'traffic', label: 'Request traffic', icon: BarChart3 },
  ];
  const data = section === 'load' ? history : traffic;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {sections.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setSection(id)}
              className={`flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold ${section === id ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg border bg-card p-1" role="group" aria-label="Range">
            {RANGES.map((range) => (
              <button key={range.days} type="button" aria-pressed={days === range.days} onClick={() => setDays(range.days)}
                className={`h-8 rounded-md px-3 text-sm ${days === range.days ? 'bg-slate-950 font-semibold text-white dark:bg-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                {range.label}
              </button>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />} Refresh
          </Button>
        </div>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {!data && loading && <p className="p-6 text-sm text-muted-foreground">Loading...</p>}
      {section === 'load' && history && <ServerLoadPanel history={history} />}
      {section === 'traffic' && traffic && <TrafficPanel traffic={traffic} />}
    </div>
  );
};

export default EngineeringMonitoringTab;
