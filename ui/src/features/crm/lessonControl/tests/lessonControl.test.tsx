import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeacherGradingPanel } from '../components/TeacherGradingPanel';
import LessonControlPage from '../LessonControlPage';

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (value: string, vars?: Record<string, string | number>) => value.replace(/\{(\w+)\}/g, (_, key) => String(vars?.[key] ?? `{${key}}`)),
  }),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/utils/toast', () => ({ showToast: toast }));
const api = vi.hoisted(() => ({
  myDue: vi.fn(), discipline: vi.fn(), reschedules: vi.fn(), requestReschedule: vi.fn(), decide: vi.fn(),
  daysOff: vi.fn(async () => ({ data: [] })), addDayOff: vi.fn(), removeDayOff: vi.fn(),
}));
vi.mock('../api', () => ({ lessonControlAPI: api, classAPI: { getAll: vi.fn(async () => ({ data: [] })) } }));

describe('teacher scoring reminder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.myDue.mockResolvedValue({ data: [
      { class_id: 1, class_name: 'A2 plus', date: '2026-10-09', start: '10:00', deadline: '2026-10-09 12:00', status: 'pending' },
      { class_id: 1, class_name: 'A2 plus', date: '2026-10-07', start: '10:00', deadline: '2026-10-07 12:00', status: 'missing' },
    ] });
    api.discipline.mockResolvedValue({ data: { teachers: [{ summary: { due: 3, on_time: 1, late: 1, missing: 1, pending: 1, points: -10 } }] } });
    api.reschedules.mockResolvedValue({ data: [] });
  });

  it('reminds what is due today and what was missed, and shows the month', async () => {
    render(<TeacherGradingPanel classes={[{ class_id: 1, class_name: 'A2 plus' }]} />);
    expect(await screen.findByText('A2 plus: score by 12:00 today')).toBeTruthy();
    expect(screen.getByText('A2 plus, 07.10.2026: not scored (-5 KPI)')).toBeTruthy();
    expect(screen.getByText('-10 KPI')).toBeTruthy();
  });

  it('asks for the group and both dates before sending a move', async () => {
    render(<TeacherGradingPanel classes={[{ class_id: 1, class_name: 'A2 plus' }]} />);
    await screen.findByText('A2 plus: score by 12:00 today');
    fireEvent.click(screen.getByRole('button', { name: /Move a lesson/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Send to the admin' }));
    expect(toast.error).toHaveBeenCalledWith('Choose the group, the lesson date and the new date.');
    expect(api.requestReschedule).not.toHaveBeenCalled();
  });
});

describe('lesson control page', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows KPI only when the server sends points (owner)', async () => {
    api.discipline.mockResolvedValue({ data: { teachers: [{ teacher_id: 7, teacher_name: 'Meliqulov Ibrohim', summary: { due: 3, on_time: 1, late: 1, missing: 1, pending: 0 } }] } });
    render(<LessonControlPage />);
    expect(await screen.findByText('Meliqulov Ibrohim')).toBeTruthy();
    expect(screen.queryByText('KPI')).toBeNull();
  });

  it('approves a request', async () => {
    api.discipline.mockResolvedValue({ data: { teachers: [] } });
    api.reschedules.mockResolvedValue({ data: [{ reschedule_id: 3, class_name: 'A2 plus', teacher_name: 'Meliqulov Ibrohim', original_date: '2026-10-14', new_date: '2026-10-18', new_time: '15:00', status: 'pending' }] });
    api.decide.mockResolvedValue({ data: {} });
    render(<LessonControlPage />);
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Requests to move a lesson' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Requests to move a lesson' }));
    fireEvent.click(await screen.findByRole('button', { name: /Approve/ }));
    await waitFor(() => expect(api.decide).toHaveBeenCalledWith(3, true));
  });
});
