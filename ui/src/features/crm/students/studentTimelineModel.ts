export type StudentTimelineGranularity = 'daily' | 'weekly' | 'monthly';

export interface StudentTimelineRecord {
  created_at?: unknown;
  createdAt?: unknown;
}

export interface StudentTimelinePoint {
  label: string;
  value: number;
}

const toIsoDate = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const text = value.trim();
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = dateOnly
    ? new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])))
    : new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  const isoDate = date.toISOString().slice(0, 10);
  return dateOnly && isoDate !== `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}` ? null : isoDate;
};

export const getStudentTimelineBounds = (students: StudentTimelineRecord[]) => {
  const dates = students
    .map((student) => toIsoDate(student.created_at ?? student.createdAt))
    .filter((date): date is string => date !== null)
    .sort();
  return { min: dates[0] ?? '', max: dates[dates.length - 1] ?? '' };
};

const dateUtc = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const dateString = (date: Date) => date.toISOString().slice(0, 10);

const bucketStart = (date: Date, granularity: StudentTimelineGranularity) => {
  const start = new Date(date);
  if (granularity === 'monthly') {
    start.setUTCDate(1);
  } else if (granularity === 'weekly') {
    const daysSinceMonday = (start.getUTCDay() + 6) % 7;
    start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  }
  return start;
};

const bucketEnd = (start: Date, granularity: StudentTimelineGranularity) => {
  const end = new Date(start);
  if (granularity === 'monthly') {
    end.setUTCMonth(end.getUTCMonth() + 1, 0);
  } else if (granularity === 'weekly') {
    end.setUTCDate(end.getUTCDate() + 6);
  }
  return end;
};

export const buildStudentTimelinePoints = (
  students: StudentTimelineRecord[],
  start: string,
  end: string,
  granularity: StudentTimelineGranularity,
): StudentTimelinePoint[] => {
  if (!start || !end || start > end) return [];

  const dates = students
    .map((student) => toIsoDate(student.created_at ?? student.createdAt))
    .filter((date): date is string => date !== null && date <= end)
    .sort();
  const rangeStart = dateUtc(start);
  const rangeEnd = dateUtc(end);
  let cursor = new Date(rangeStart);
  let count = 0;
  let dateIndex = 0;
  const points: StudentTimelinePoint[] = [];

  while (cursor <= rangeEnd) {
    const bucket = bucketStart(cursor, granularity);
    const cutoff = bucketEnd(bucket, granularity);
    if (cutoff > rangeEnd) cutoff.setTime(rangeEnd.getTime());
    const cutoffDate = dateString(cutoff);
    while (dateIndex < dates.length && dates[dateIndex] <= cutoffDate) {
      count += 1;
      dateIndex += 1;
    }
    points.push({
      label: cutoffDate,
      value: count,
    });
    if (granularity === 'monthly') {
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    } else if (granularity === 'weekly') {
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    } else {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  return points;
};
