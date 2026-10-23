// CPU and memory over the last day, week or month, and when the server was down.
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Cpu, MemoryStick, PowerOff, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { axisLabel, formatMinutes, formatStamp, type History } from './monitoringModel';

const Stat = ({ label, value, detail, Icon }: { label: string; value: string; detail?: string; Icon: typeof Cpu }) => (
  <Card>
    <CardContent className="flex items-center gap-3 p-4">
      <Icon className="h-8 w-8 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        {detail && <p className="truncate text-xs text-muted-foreground">{detail}</p>}
      </div>
    </CardContent>
  </Card>
);

const ChartCard = ({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-base">{title}</CardTitle>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </CardHeader>
    <CardContent className="h-64 pr-4">{children}</CardContent>
  </Card>
);

export const ServerLoadPanel = ({ history }: { history: History }) => {
  const { points, outages, summary, days } = history;
  if (!history.enabled) {
    return <Alert><AlertDescription>History is off because MongoDB is not connected, so no samples can be saved.</AlertDescription></Alert>;
  }
  if (!summary || points.length === 0) {
    return <Alert><AlertDescription>No samples yet. The server saves one reading a minute; check back in a few minutes.</AlertDescription></Alert>;
  }
  const tick = axisLabel(days);
  const stamp = (value: unknown) => formatStamp(String(value));
  // A shaded band for each downtime gap, drawn on the time axis.
  const bands = outages.map((outage) => {
    const near = (iso: string) => points.reduce((best, point) => (Math.abs(Date.parse(point.ts) - Date.parse(iso)) < Math.abs(Date.parse(best.ts) - Date.parse(iso)) ? point : best), points[0]).ts;
    return { key: outage.from, from: near(outage.from), to: near(outage.to) };
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat Icon={Cpu} label="CPU average" value={`${summary.avgCpu}%`} detail={summary.peakCpu ? `peak ${summary.peakCpu.value}% at ${formatStamp(summary.peakCpu.at)}` : undefined} />
        <Stat Icon={MemoryStick} label="Memory average" value={`${summary.avgMemory}%`} detail={summary.peakMemory ? `peak ${summary.peakMemory.value}% at ${formatStamp(summary.peakMemory.at)}` : undefined} />
        <Stat Icon={PowerOff} label="Down time" value={formatMinutes(summary.downtimeMinutes)} detail={`${outages.length} gap${outages.length === 1 ? '' : 's'} in the samples`} />
        <Stat Icon={RotateCcw} label="Restarts" value={String(history.restarts.length)} detail={history.restarts.length ? `last ${formatStamp(history.restarts[history.restarts.length - 1])}` : 'none in this range'} />
      </div>

      <ChartCard title="CPU" note={`Average per ${history.bucketMinutes} minutes, with the busiest moment. The server's whole CPU, and the part this app uses.`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="ts" tickFormatter={tick} minTickGap={40} fontSize={11} />
            <YAxis domain={[0, 100]} unit="%" fontSize={11} width={44} />
            <Tooltip labelFormatter={stamp} formatter={(value: number, name: string) => [`${value}%`, name]} />
            <Legend />
            {bands.map((band) => <ReferenceArea key={band.key} x1={band.from} x2={band.to} fill="#ef4444" fillOpacity={0.15} />)}
            <Area type="monotone" dataKey="cpuMax" name="CPU peak" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.12} strokeWidth={1} />
            <Area type="monotone" dataKey="cpu" name="CPU average" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.25} strokeWidth={2} />
            <Area type="monotone" dataKey="processCpu" name="This app" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Memory" note="How much of the server's memory is in use, and what the app itself holds (MB, right).">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="ts" tickFormatter={tick} minTickGap={40} fontSize={11} />
            <YAxis yAxisId="left" domain={[0, 100]} unit="%" fontSize={11} width={44} />
            <YAxis yAxisId="right" orientation="right" unit=" MB" fontSize={11} width={62} />
            <Tooltip labelFormatter={stamp} />
            <Legend />
            {bands.map((band) => <ReferenceArea key={band.key} yAxisId="left" x1={band.from} x2={band.to} fill="#ef4444" fillOpacity={0.15} />)}
            <Line yAxisId="left" type="monotone" dataKey="memory" name="Server memory %" stroke="#0ea5e9" strokeWidth={2} dot={false} />
            <Line yAxisId="left" type="monotone" dataKey="memoryMax" name="Peak %" stroke="#f59e0b" strokeWidth={1} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="rssMb" name="App memory (MB)" stroke="#10b981" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4" /> Down time</CardTitle></CardHeader>
        <CardContent>
          {outages.length === 0 ? <p className="text-sm text-muted-foreground">The server answered all the time in this range.</p> : (
            <ul className="divide-y text-sm">
              {[...outages].reverse().map((outage) => (
                <li key={outage.from} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>{formatStamp(outage.from)} → {formatStamp(outage.to)}</span>
                  <span className="font-semibold text-rose-600">{formatMinutes(outage.minutes)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted-foreground">Shown in red on the charts. A gap means no reading arrived: the server was stopped, restarting or deployed.</p>
        </CardContent>
      </Card>
    </div>
  );
};
