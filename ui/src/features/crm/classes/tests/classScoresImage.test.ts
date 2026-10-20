import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ attendance: vi.fn(), scores: vi.fn(), standings: vi.fn(), draw: vi.fn(), download: vi.fn() }));
vi.mock('@/shared/api/api', () => ({ gradeAPI: { getClassStandings: (id: number) => api.standings(id) } }));
vi.mock('../api/sessionWorkflowApi', () => ({
  sessionWorkflowApi: { loadClassAttendance: (id: number) => api.attendance(id), loadClassMonthScores: (id: number, month: string) => api.scores(id, month) },
}));
vi.mock('../monthlyAttendanceImage', async (importOriginal) => {
  const actual: any = await importOriginal();
  return { ...actual, drawMonthlyAttendanceImage: (...args: unknown[]) => api.draw(...args), downloadCanvasPng: (...args: unknown[]) => api.download(...args) };
});

import { downloadClassScoresImage } from '../classScoresImage';

const students = [{ student_id: 1, first_name: 'Ali', last_name: 'Valiyev' }, { student_id: 2, first_name: 'Ziyoda', last_name: 'Isomova' }];

describe('class scores image', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.attendance.mockResolvedValue([]);
    api.scores.mockResolvedValue([]);
    api.draw.mockReturnValue({});
    api.download.mockResolvedValue(undefined);
  });

  it('orders by the group standings and uses the teacher colour', async () => {
    api.standings.mockResolvedValue({ data: [{ student_id: 2, place: 1, total_points: 300, lessons: 3, trend: { direction: 'down' } }] });
    await downloadClassScoresImage({ classId: 7, className: 'IELTS 1', teacherName: 'Odiljon', monthKey: '2026-10', students, topColor: '#38BDF8' });
    const [grid, options] = api.draw.mock.calls[0];
    expect(grid.ranked).toBe(true);
    expect(grid.rows.map((row: any) => row.id)).toEqual([2, 1]);
    expect(options).toEqual({ title: 'IELTS 1', subtitle: "O'qituvchi: Odiljon", topColor: '#38BDF8' });
    expect(api.download.mock.calls[0][1]).toBe('ballar_IELTS_1_2026-10.png');
  });

  it('still makes the image (A–Z) when the standings cannot be loaded', async () => {
    api.standings.mockRejectedValue(new Error('offline'));
    await downloadClassScoresImage({ classId: 7, className: 'IELTS 1', monthKey: '2026-10', students });
    expect(api.draw.mock.calls[0][0].ranked).toBe(false);
    expect(api.download).toHaveBeenCalled();
  });
});
