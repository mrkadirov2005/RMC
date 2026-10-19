import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (value: string, vars?: Record<string, string | number>) => value.replace(/\{(\w+)\}/g, (_, key) => String(vars?.[key] ?? `{${key}}`)),
  }),
}));

const api = vi.hoisted(() => ({
  standings: vi.fn(),
  me: vi.fn(),
  savePrefs: vi.fn(),
}));
vi.mock('@/shared/api/api', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    gradeAPI: { ...actual.gradeAPI, getClassStandings: (id: number) => api.standings(id) },
    teacherAPI: { ...actual.teacherAPI, getMyProfile: () => api.me(), updateMyPreferences: (body: unknown) => api.savePrefs(body) },
  };
});
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('@/utils/toast', () => ({ showToast: toast }));

import TeacherStudentDirectory from '../TeacherStudentDirectory';
import TopStudentsColorSetting from '../TopStudentsColorSetting';
import { resetTopStudentsColor } from '../../standings';

const students = Array.from({ length: 7 }, (_, index) => ({
  student_id: index + 1,
  first_name: `Name${index + 1}`,
  last_name: `Last${index + 1}`,
  enrollment_number: '',
  status: 'active',
}));

// Student 7 is first, then 6…; student 1 has no scored lesson.
const standings = [7, 6, 5, 4, 3, 2].map((id, index) => ({
  student_id: id,
  total_points: 600 - index * 50,
  lessons: 4,
  place: index + 1,
  trend: id === 7 ? { direction: 'up', recent_average: 90, previous_average: 70 } : id === 6 ? { direction: 'down', recent_average: 50, previous_average: 80 } : null,
}));

const rowNames = () => screen.getAllByRole('row').slice(1).map((row) => within(row).getByText(/Name\d/).textContent);

describe('teacher student table standings', () => {
  beforeEach(() => {
    resetTopStudentsColor();
    api.standings.mockReset();
    api.standings.mockResolvedValue({ data: standings });
    api.me.mockResolvedValue({ data: { teacher_id: 9, top_students_color: null } });
    api.savePrefs.mockReset();
  });

  it('lists the group by points over all lessons, top five in yellow, with trend arrows', async () => {
    render(<MemoryRouter><TeacherStudentDirectory students={students} title="Group" classId={42} /></MemoryRouter>);
    await waitFor(() => expect(rowNames()[0]).toBe('Name7 Last7'));
    expect(api.standings).toHaveBeenCalledWith(42);
    expect(rowNames()).toEqual(['Name7 Last7', 'Name6 Last6', 'Name5 Last5', 'Name4 Last4', 'Name3 Last3', 'Name2 Last2', 'Name1 Last1']);

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.slice(0, 5).map((row) => row.getAttribute('data-top-place'))).toEqual(['1', '2', '3', '4', '5']);
    expect(rows[5].getAttribute('data-top-place')).toBeNull();
    expect(within(rows[0]).getByText('1-place')).toBeTruthy();

    expect(within(rows[0]).getByLabelText('Getting better')).toBeTruthy();
    expect(within(rows[1]).getByLabelText('Getting worse')).toBeTruthy();
    expect(within(rows[2]).getByText('—')).toBeTruthy();
    expect(within(rows[0]).getByText('600')).toBeTruthy();
  });

  it('uses the colour the teacher picked', async () => {
    api.me.mockResolvedValue({ data: { teacher_id: 9, top_students_color: '#38BDF8' } });
    render(<MemoryRouter><TeacherStudentDirectory students={students} title="Group" classId={42} /></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByRole('row')[1].getAttribute('style') || '').toMatch(/56, 189, 248|38BDF8/i));
  });

  it('keeps the old order when no group is given', async () => {
    render(<MemoryRouter><TeacherStudentDirectory students={students} title="All" /></MemoryRouter>);
    expect(rowNames()[0]).toBe('Name1 Last1');
    expect(api.standings).not.toHaveBeenCalled();
    expect(screen.queryByText('Trend')).toBeNull();
  });

  it('saves the colour from the profile and can go back to yellow', async () => {
    api.savePrefs.mockResolvedValueOnce({ data: { teacher_id: 9, top_students_color: '#4ADE80' } });
    render(<TopStudentsColorSetting />);
    fireEvent.click(await screen.findByLabelText('#4ADE80'));
    fireEvent.click(screen.getByText('Save colour'));
    await waitFor(() => expect(api.savePrefs).toHaveBeenCalledWith({ top_students_color: '#4ADE80' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Colour saved'));

    api.savePrefs.mockResolvedValueOnce({ data: { teacher_id: 9, top_students_color: null } });
    fireEvent.click(await screen.findByText('Back to yellow'));
    await waitFor(() => expect(api.savePrefs).toHaveBeenLastCalledWith({ top_students_color: null }));
  });
});
