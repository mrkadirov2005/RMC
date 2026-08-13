import { describe, expect, it } from 'vitest';
import { normalizeCalendarEvents } from '../hooks/useCalendarWorkspace';

describe('calendar API normalization', () => {
  it('prevents incomplete production rows from crashing calendar views', () => {
    expect(normalizeCalendarEvents([
      { event_id: 'valid', date: '2026-08-13', start_time: '09:00', class_id: 1, class_name: 'B1' },
      { event_id: 'missing-time', date: '2026-08-13', class_id: 2 },
      null,
    ])).toEqual([
      expect.objectContaining({
        event_id: 'valid',
        status: 'planned',
        source: 'recurring',
        start_time: '09:00',
        end_time: '09:00',
      }),
    ]);
  });
});
