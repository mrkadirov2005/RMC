// Shapes of GET /system/metrics/history and /system/metrics/traffic, and the small helpers the
// Monitoring charts share. Times are shown in Tashkent, whatever the viewer's computer says.
export type HistoryPoint = {
  ts: string; cpu: number; cpuMax: number; memory: number; memoryMax: number;
  processCpu: number; rssMb: number; heapMb: number; load1: number; samples: number;
};
export type Outage = { from: string; to: string; minutes: number };
export type History = {
  enabled: boolean; days: number; bucketMinutes: number; points: HistoryPoint[]; outages: Outage[]; restarts: string[];
  summary: null | {
    samples: number; avgCpu: number; avgMemory: number; downtimeMinutes: number;
    peakCpu: { value: number; at: string } | null; peakMemory: { value: number; at: string } | null;
  };
};
export type TrafficHour = { hour: number; requests: number; total: number; errors: number; slow: number; avgMs: number };
export type Traffic = {
  enabled: boolean; days: number;
  series: Array<{ label: string; requests: number; errors: number; slow: number; avgMs: number }>;
  hours: TrafficHour[];
  summary: null | { total: number; errors: number; slow: number; avgMs: number; errorPercent: number; busiestHour: number | null; quietestHour: number | null };
  quietWindow: null | { from: number; to: number; hours: number };
};

export const RANGES = [{ days: 1, label: '24 hours' }, { days: 7, label: '7 days' }, { days: 30, label: '30 days' }];

const zone = 'Asia/Tashkent';
export const formatClock = (value: string) => new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit' }).format(new Date(value));
export const formatDay = (value: string) => new Intl.DateTimeFormat('en-GB', { timeZone: zone, day: '2-digit', month: 'short' }).format(new Date(value));
export const formatStamp = (value: string) => `${formatDay(value)} ${formatClock(value)}`;
/** Axis label: the clock for a day's chart, day and clock for longer ones. */
export const axisLabel = (days: number) => (value: string) => (days <= 1 ? formatClock(value) : formatStamp(value));
export const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`;
export const formatMinutes = (minutes: number) => (minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`);
