import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AttendanceReportPanel } from '../AttendanceReportPanel';

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (value: string, vars?: Record<string, string | number>) => value.replace(/\{(\w+)\}/g, (_, key) => String(vars?.[key] ?? `{${key}}`)),
  }),
}));

const collections = {
  students: [{ student_id: 1, class_id: 1 }],
  classes: [{ class_id: 1, class_name: 'English A', teacher_id: 1 }],
  teachers: [{ teacher_id: 1, first_name: 'Ibrohim' }],
  payments: [],
  discounts: [],
  deletedStudents: [],
  attendance: [
    { student_id: 1, class_id: 1, attendance_date: '2026-10-01', status: 'Present' },
    { student_id: 1, class_id: 1, attendance_date: '2026-10-03', status: 'Absent' },
    { student_id: 1, class_id: 1, attendance_date: '2026-10-06', status: 'Present' },
    { student_id: 1, class_id: 1, attendance_date: '2026-09-20', status: 'Absent' },
  ],
} as never;

describe('attendance report dates', () => {
  it('reports on all records until a date range is chosen', () => {
    render(<AttendanceReportPanel collections={collections} />);
    expect(screen.getByText('4 attendance records')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-05' } });
    expect(screen.getByText('2 attendance records')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-06' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-06' } });
    expect(screen.getByText('1 attendance records')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();

    fireEvent.click(screen.getByText('All'));
    expect(screen.getByText('4 attendance records')).toBeTruthy();
  });
});
