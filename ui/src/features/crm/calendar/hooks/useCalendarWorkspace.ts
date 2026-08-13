import { useCallback, useEffect, useMemo, useState } from 'react';
import { calendarAPI } from '../api';
import { filterEvents, viewRange, type CalendarEvent, type CalendarFilters, type CalendarResource, type CalendarView } from '../calendarWorkspace';

const rows = (response: any) => {
  const data = response?.data?.data ?? response?.data ?? response;
  return Array.isArray(data) ? data : [];
};

export const normalizeCalendarEvents = (values: any[]): CalendarEvent[] => values
  .map((event) => ({
    ...event,
    event_id: String(event?.event_id || ''),
    source: ['recurring', 'booking', 'session'].includes(String(event?.source)) ? event.source : 'recurring',
    status: ['planned', 'ready', 'in_progress', 'conducted'].includes(String(event?.status)) ? event.status : 'planned',
    date: String(event?.date || ''),
    start_time: String(event?.start_time || '').slice(0, 8),
    end_time: String(event?.end_time || event?.start_time || '').slice(0, 8),
    class_id: Number(event?.class_id || 0),
    class_name: String(event?.class_name || 'Unnamed group'),
  }))
  .filter((event) => event.event_id && event.date && event.start_time && event.class_id > 0) as CalendarEvent[];

export const useCalendarWorkspace = (anchor: Date, view: CalendarView, filters: CalendarFilters) => {
  const range = useMemo(() => viewRange(anchor, view), [anchor, view]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [resources, setResources] = useState<CalendarResource[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const { from, to } = range;

  useEffect(() => {
    let active = true;
    const params = { from, to, teacher_id: filters.teacherId || undefined, class_id: filters.classId || undefined, subject_id: filters.subjectId || undefined, room_id: filters.roomId || undefined, status: filters.status || undefined };
    (async () => {
      setLoading(true); setError('');
      try {
        const [eventResponse, summaryResponse, resourceResponse, conflictResponse] = await Promise.all([
          calendarAPI.getEvents(params), calendarAPI.getSummary(params), calendarAPI.getResources(), calendarAPI.getConflicts(params),
        ]);
        if (!active) return;
        setEvents(normalizeCalendarEvents(rows(eventResponse)));
        setSummary(summaryResponse?.data?.data ?? summaryResponse?.data ?? summaryResponse ?? {});
        setResources(rows(resourceResponse));
        setConflicts(rows(conflictResponse));
      } catch (requestError: any) {
        if (active) setError(requestError?.response?.data?.error || 'Failed to load calendar.');
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [from, to, filters.teacherId, filters.classId, filters.subjectId, filters.roomId, filters.status, revision]);

  const refresh = useCallback(() => setRevision(value => value + 1), []);
  return { events: useMemo(() => filterEvents(events, filters), [events, filters]), resources, summary, conflicts, loading, error, range, refresh };
};
