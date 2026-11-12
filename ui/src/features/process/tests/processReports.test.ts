import { describe, expect, it } from 'vitest';
import { toReports } from '../ProcessPage';

describe('process reports', () => {
  it('names each report by its <title> and lists the newest first', () => {
    const reports = toReports({
      './reports/2026-10-01-old.html': '<html><head><title>Old status</title></head></html>',
      './reports/2026-11-12-task-status.html': '<html><head><title> RMC Task Status </title></head></html>',
    });
    expect(reports.map((report) => [report.id, report.title, report.date])).toEqual([
      ['2026-11-12-task-status', 'RMC Task Status', '2026-11-12'],
      ['2026-10-01-old', 'Old status', '2026-10-01'],
    ]);
  });

  it('falls back to the file name when there is no title', () => {
    expect(toReports({ './reports/notes.html': '<p>hi</p>' })[0]).toMatchObject({ id: 'notes', title: 'notes', date: '' });
  });

  it('includes the task status report shipped with the app', () => {
    const files = import.meta.glob('../reports/*.html', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    expect(toReports(files).map((report) => report.title)).toContain('RMC Task Status');
  });
});
