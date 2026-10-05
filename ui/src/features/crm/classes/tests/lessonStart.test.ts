import { describe, expect, it } from 'vitest';
import { buildSessionWorkflowPath, findSessionOnDate, hasScoringAction, sessionDateKey } from '../lessonStart';

describe('lesson start helpers', () => {
  it('opens an existing session by id and keeps the teacher return path', () => {
    expect(buildSessionWorkflowPath({ classId: 5, sessionId: 12, date: '2026-10-05', actions: ['attendance', 'coins'], from: 'teacher' }))
      .toBe('/classes/5/sessions/12/workflow?actions=attendance%2Ccoins&from=teacher');
  });

  it('opens an unrecorded date as a new lesson instead of a session id', () => {
    expect(buildSessionWorkflowPath({ classId: 5, sessionId: null, date: '2026-10-05', actions: ['attendance'], tab: 'attendance' }))
      .toBe('/classes/5/sessions/new/workflow?actions=attendance&date=2026-10-05&tab=attendance');
  });

  it('opens a saved lesson read-only, but never a lesson that has no session yet', () => {
    expect(buildSessionWorkflowPath({ classId: 5, sessionId: 12, actions: ['attendance'], from: 'teacher', view: true }))
      .toBe('/classes/5/sessions/12/workflow?actions=attendance&from=teacher&mode=view');
    expect(buildSessionWorkflowPath({ classId: 5, sessionId: null, date: '2026-10-05', actions: ['attendance'], view: true }))
      .toBe('/classes/5/sessions/new/workflow?actions=attendance&date=2026-10-05');
  });

  it('matches sessions on their plain date, skipping deleted ones', () => {
    const sessions = [
      { session_id: 1, session_date: '2026-10-05', deleted_at: '2026-10-05T08:00:00Z' },
      { session_id: 2, session_date: '2026-10-05' },
    ];
    expect(findSessionOnDate(sessions, '2026-10-05')?.session_id).toBe(2);
    expect(findSessionOnDate(sessions, '2026-10-04')).toBeUndefined();
    expect(sessionDateKey({ session_date: '2026-10-05' })).toBe('2026-10-05');
  });

  it('requires a scoring action besides coins', () => {
    expect(hasScoringAction(['coins'])).toBe(false);
    expect(hasScoringAction(['coins', 'points'])).toBe(true);
  });
});
