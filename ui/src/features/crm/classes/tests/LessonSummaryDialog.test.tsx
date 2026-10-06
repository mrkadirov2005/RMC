import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LessonSummaryDialog } from '../components/LessonSummaryDialog';
import { defaultLessonScoringSettings } from '../lessonScoringSettings';
import { buildLessonSummary } from '../sessionWorkflowModel';

// Untranslated keys with {vars} filled in, so assertions read in English.
vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (value: string, vars?: Record<string, string>) => value.replace(/\{(\w+)\}/g, (_, key) => vars?.[key] ?? `{${key}}`),
  }),
}));

const summary = buildLessonSummary({
  students: [{ student_id: 1, first_name: 'Ali' }, { student_id: 2, first_name: 'Dilnoza' }],
  selectedActions: ['attendance', 'coins'],
  attendance: new Map([[1, 'On time'], [2, 'Absent']]),
  homework: new Map(),
  activity: new Map(),
  points: new Map(),
  stellarStudentId: null,
  settings: defaultLessonScoringSettings,
  saveResult: { coins: [{ transaction: { student_id: 1, delta: 20 } }] },
});

describe('LessonSummaryDialog', () => {
  it('confirms attendance and shows the lesson at a glance', () => {
    render(<LessonSummaryDialog summary={summary} className="IELTS 1" date="2026-10-05" doneLabel="Done" onDone={() => {}} onReview={() => {}} />);

    expect(screen.getByText('Attendance completed')).toBeTruthy();
    expect(screen.getByText('IELTS 1 · 2026-10-05')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByText('+20')).toBeTruthy();
    expect(screen.getByText('Dilnoza')).toBeTruthy();
  });

  it('leaves through Done and stays through Edit marks', () => {
    const onDone = vi.fn();
    const onReview = vi.fn();
    render(<LessonSummaryDialog summary={summary} doneLabel="Done" onDone={onDone} onReview={onReview} />);

    fireEvent.click(screen.getByText('Done'));
    fireEvent.click(screen.getByText('Edit marks'));

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onReview).toHaveBeenCalledTimes(1);
  });

  it('renders nothing until a lesson is saved', () => {
    render(<LessonSummaryDialog summary={null} doneLabel="Done" onDone={() => {}} onReview={() => {}} />);
    expect(screen.queryByText('Attendance completed')).toBeNull();
  });

  it('downloads the monthly attendance image from "Suratni yuklash"', async () => {
    const onDownloadImage = vi.fn(() => Promise.resolve());
    render(<LessonSummaryDialog summary={summary} doneLabel="Done" onDone={() => {}} onReview={() => {}} onDownloadImage={onDownloadImage} />);

    fireEvent.click(screen.getByText('Download image'));
    expect(onDownloadImage).toHaveBeenCalledTimes(1);
    await screen.findByText('Download image');
  });

  it('has no download button when no download is offered', () => {
    render(<LessonSummaryDialog summary={summary} doneLabel="Done" onDone={() => {}} onReview={() => {}} />);
    expect(screen.queryByText('Download image')).toBeNull();
  });
});
