// When the requests come: per hour of the day, over time, and the quiet hours that are safe to switch off.
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, MoonStar, TimerReset, TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { hourLabel, type Traffic } from './monitoringModel';

const Stat = ({ label, value, detail, Icon }: { label: string; value: string; detail?: string; Icon: typeof Activity }) => (
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

export const TrafficPanel = ({ traffic }: { traffic: Traffic }) => {
  if (!traffic.enabled) {
    return <Alert><AlertDescription>Traffic is off because MongoDB is not connected, so requests are not logged.</AlertDescription></Alert>;
  }
  const { summary, hours, series, quietWindow, days } = traffic;
  if (!summary || summary.total === 0) {
    return <Alert><AlertDescription>No requests were logged in this range.</AlertDescription></Alert>;
  }
  const peak = Math.max(...hours.map((hour) => hour.requests));
  const seriesTick = (label: string) => (days <= 7 ? label.slice(days <= 1 ? 11 : 5) : label.slice(5));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat Icon={Activity} label="Requests" value={summary.total.toLocaleString()} detail={`${Math.round(summary.total / days).toLocaleString()} a day, ${summary.avgMs} ms on average`} />
        <Stat Icon={Activity} label="Busiest hour" value={summary.busiestHour == null ? '-' : hourLabel(summary.busiestHour)} detail={summary.busiestHour == null ? undefined : `${hours[summary.busiestHour].requests} requests an hour`} />
        <Stat Icon={MoonStar} label="Quietest hour" value={summary.quietestHour == null ? '-' : hourLabel(summary.quietestHour)} detail={summary.quietestHour == null ? undefined : `${hours[summary.quietestHour].requests} requests an hour`} />
        <Stat Icon={TriangleAlert} label="Server errors" value={`${summary.errorPercent}%`} detail={`${summary.errors.toLocaleString()} failed, ${summary.slow.toLocaleString()} slow (2.5 s+)`} />
      </div>

      <Card className={quietWindow ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30' : undefined}>
        <CardContent className="flex items-start gap-3 p-4">
          <TimerReset className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
          <div className="text-sm">
            {quietWindow ? (
              <>
                <p className="font-semibold">Quiet window: {hourLabel(quietWindow.from)} – {hourLabel(quietWindow.to)} ({quietWindow.hours} hours)</p>
                <p className="text-muted-foreground">Traffic stays under a fifth of the busiest hour. The server could be stopped then to save cost. Check the sessions that still run at night (backups, scheduled jobs) first.</p>
              </>
            ) : (
              <p className="text-muted-foreground">No clear quiet window yet. Pick 7 or 30 days for a better picture.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Requests by hour of the day</CardTitle>
          <p className="text-xs text-muted-foreground">Average per day, Tashkent time. The darker bars are the busy hours.</p>
        </CardHeader>
        <CardContent className="h-64 pr-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hours}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
              <XAxis dataKey="hour" tickFormatter={(hour) => String(hour).padStart(2, '0')} fontSize={11} interval={0} />
              <YAxis fontSize={11} width={44} allowDecimals={false} />
              <Tooltip labelFormatter={(hour) => `${hourLabel(Number(hour))} – ${hourLabel((Number(hour) + 1) % 24)}`} formatter={(value: number) => [value, 'requests a day']} />
              <Bar dataKey="requests" radius={[3, 3, 0, 0]}>
                {hours.map((hour) => <Cell key={hour.hour} fill="#4f46e5" fillOpacity={0.3 + 0.7 * (peak ? hour.requests / peak : 0)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Requests over time</CardTitle>
          <p className="text-xs text-muted-foreground">{days <= 7 ? 'Per hour' : 'Per day'}, with the failed ones (server errors 5xx).</p>
        </CardHeader>
        <CardContent className="h-64 pr-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" tickFormatter={seriesTick} minTickGap={40} fontSize={11} />
              <YAxis yAxisId="left" fontSize={11} width={44} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" fontSize={11} width={36} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="requests" name="Requests" stroke="#4f46e5" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="errors" name="Failed (5xx)" stroke="#ef4444" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">How fast, by hour</CardTitle>
          <p className="text-xs text-muted-foreground">Average response time (ms). A rise at the busy hours means the server needs more power then.</p>
        </CardHeader>
        <CardContent className="h-56 pr-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hours}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
              <XAxis dataKey="hour" tickFormatter={(hour) => String(hour).padStart(2, '0')} fontSize={11} interval={0} />
              <YAxis fontSize={11} width={44} unit=" ms" />
              <Tooltip labelFormatter={(hour) => hourLabel(Number(hour))} formatter={(value: number) => [`${value} ms`, 'average']} />
              <Bar dataKey="avgMs" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
