import { describe, expect, it, vi } from 'vitest';
import { openReport, toReports } from '../ProcessPage';

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

  it('opens the report in a new tab', () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:report');
    const open = vi.fn();
    openReport({ id: 'r', title: 'R', date: '', html: '<p>hi</p>' }, open as unknown as typeof window.open);
    expect(open).toHaveBeenCalledWith('blob:report', '_blank');
    expect((create.mock.calls[0][0] as Blob).type).toBe('text/html');
    create.mockRestore();
  });

  it('ships the task status report as a table of every task', () => {
    const files = import.meta.glob('../reports/*.html', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    const report = toReports(files).find((r) => r.title === 'RMC Task Status');
    expect(report?.html).toMatch(/<th>#<\/th><th>Task<\/th><th>Description<\/th><th>Status<\/th>/);
  });
});
