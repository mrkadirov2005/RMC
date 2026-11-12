// Process: progress reports on the owner's task lists, one HTML file each. To add a report, put
// a full HTML file in ./reports named YYYY-MM-DD-name.html; its <title> is the name shown here.
// Clicking a report opens it full screen in a new tab. Owners only (App.tsx route and the sidebar).

import { useMemo } from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { useLanguage } from '@/i18n/LanguageContext';

const FILES = import.meta.glob('./reports/*.html', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export type ProcessReport = { id: string; title: string; date: string; html: string };

const titleOf = (html: string, fallback: string) => html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() || fallback;

/** Reports newest first, from file names like 2026-11-12-task-status.html. */
export const toReports = (files: Record<string, string>): ProcessReport[] =>
  Object.entries(files)
    .map(([path, html]) => {
      const id = path.split('/').pop()!.replace(/\.html$/, '');
      const date = /^\d{4}-\d{2}-\d{2}/.exec(id)?.[0] || '';
      return { id, title: titleOf(html, id), date, html };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));

/**
 * Opens the report on its own in a new tab. The page is built from the report's own HTML in the
 * browser, so it needs no server address and never shows the app's login page.
 */
export const openReport = (report: ProcessReport, open: typeof window.open = window.open.bind(window)) => {
  const url = URL.createObjectURL(new Blob([report.html], { type: 'text/html' }));
  open(url, '_blank');
  // Give the new tab time to load before the address is released.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

const formatDate = (value: string) => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const ProcessPage = () => {
  const { t } = useLanguage();
  const reports = useMemo(() => toReports(FILES), []);

  return (
    <div className="space-y-4">
      <PageHeader title={t('Process')} description={t("Progress reports on the owner's tasks: what is done and what is left.")} />
      {reports.length === 0 ? (
        <p className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">{t('No reports yet.')}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => (
            <button
              key={report.id}
              type="button"
              onClick={() => openReport(report)}
              className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3 text-left transition hover:border-primary hover:bg-primary/5"
            >
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{report.title}</span>
                {report.date && <span className="block text-xs text-muted-foreground">{formatDate(report.date)}</span>}
              </span>
              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-label={t('Opens in a new tab')} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProcessPage;
