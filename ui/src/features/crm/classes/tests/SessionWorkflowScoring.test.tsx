import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ManualPointsTable, ScoreTable } from '../components/SessionWorkflowScoring';
import { defaultLessonScoringSettings } from '../lessonScoringSettings';

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (value: string, vars?: Record<string, string | number>) => value.replace(/\{(\w+)\}/g, (_, key) => String(vars?.[key] ?? `{${key}}`)),
  }),
}));

const students = [{ student_id: 1, first_name: 'Ali' }];

describe('scoring tables in read-only mode', () => {
  it('shows the saved attendance mark but cannot change it', () => {
    const onToggle = vi.fn();
    render(
      <ScoreTable
        students={students}
        options={defaultLessonScoringSettings.attendance}
        values={new Map([[1, 'Late']])}
        onToggle={onToggle}
        onFillAll={() => {}}
        readOnly
      />,
    );

    expect(screen.queryByText('Fill all')).toBeNull();
    const late = screen.getByLabelText('Late 40 points') as HTMLButtonElement;
    expect(late.disabled).toBe(true);
    fireEvent.click(late);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('can still be marked when editing', () => {
    const onToggle = vi.fn();
    render(
      <ScoreTable
        students={students}
        options={defaultLessonScoringSettings.attendance}
        values={new Map()}
        onToggle={onToggle}
        onFillAll={() => {}}
      />,
    );

    expect(screen.getByText('Fill all')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('On time 50 points'));
    expect(onToggle).toHaveBeenCalledWith(1, 'On time');
  });

  it('shows manual points as text instead of an input', () => {
    render(
      <ManualPointsTable
        students={students}
        values={new Map([[1, '35']])}
        onChange={() => {}}
        onFillAll={() => {}}
        getTotalScore={() => 35}
        readOnly
      />,
    );

    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(screen.queryByText('Fill all points')).toBeNull();
    expect(screen.getAllByText('35').length).toBeGreaterThan(0);
  });
});
