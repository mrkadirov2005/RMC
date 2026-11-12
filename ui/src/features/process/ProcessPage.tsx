// Process: progress reports on the owner's task lists, one HTML file each. To add a report, put
// a full HTML file in ./reports named YYYY-MM-DD-name.html; its <title> is the name shown here.
// Owners only (App.tsx route and the sidebar).

import { useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import { useUrlTab } from '@/shared/hooks/useUrlTab';

const FILES = import.meta.glob('./reports/*.html', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export type ProcessReport = { id: string; title: string; date: string; html: string };

// A report runs in a frame whose links resolve against the app's address, so a "#task-9" link
// would load the app (and its login page) inside the frame. This makes such links scroll inside
// the report instead.
const IN_PAGE_LINKS = `<script>
document.addEventListener('click', function (event) {
  var link = event.target && event.target.closest ? event.target.closest('a[href^="#"]') : null;
  if (!link) return;
  event.preventDefault();
  var target = document.getElementById(decodeURIComponent(link.getAttribute('href').slice(1)));
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
</script>`;

/** The report's HTML with in-page links made to scroll inside the frame. */
export const withInPageLinks = (html: string) =>
  /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${IN_PAGE_LINKS}</body>`) : `${html}${IN_PAGE_LINKS}`;

const titleOf = (html: string, fallback: string) => html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() || fallback;

/** Reports newest first, from file names like 2026-11-12-task-status.html. */
export const toReports = (files: Record<string, string>): ProcessReport[] =>
  Object.entries(files)
    .map(([path, html]) => {
      const id = path.split('/').pop()!.replace(/\.html$/, '');
      const date = /^\d{4}-\d{2}-\d{2}/.exec(id)?.[0] || '';
      return { id, title: titleOf(html, id), date, html: withInPageLinks(html) };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));

const formatDate = (value: string) => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const ProcessPage = () => {
  const { t } = useLanguage();
  const reports = useMemo(() => toReports(FILES), []);
  const ids = useMemo(() => reports.map((report) => report.id), [reports]);
  const [selectedId, setSelectedId] = useUrlTab<string>(ids[0] || '', ids, 'report');
  const [loaded, setLoaded] = useState<string | null>(null);
  const selected = reports.find((report) => report.id === selectedId) || reports[0];

  return (
    <div className="space-y-4">
      <PageHeader title={t('Process')} description={t("Progress reports on the owner's tasks: what is done and what is left.")} />
      {reports.length === 0 ? (
        <p className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">{t('No reports yet.')}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible" aria-label={t('Reports')}>
            {reports.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => setSelectedId(report.id)}
                aria-current={report.id === selected?.id ? 'page' : undefined}
                className={cn(
                  'flex min-w-[200px] items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition lg:min-w-0',
                  report.id === selected?.id ? 'border-primary bg-primary/5' : 'bg-card hover:bg-muted/60',
                )}
              >
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{report.title}</span>
                  {report.date && <span className="block text-xs text-muted-foreground">{formatDate(report.date)}</span>}
                </span>
              </button>
            ))}
          </nav>
          {selected && (
            <div className="relative overflow-hidden rounded-lg border bg-card">
              {loaded !== selected.id && <div className="absolute inset-0 animate-pulse bg-muted/40" aria-hidden="true" />}
              <iframe
                key={selected.id}
                title={selected.title}
                srcDoc={selected.html}
                sandbox="allow-scripts allow-popups"
                onLoad={() => setLoaded(selected.id)}
                className="block h-[calc(100vh-11rem)] min-h-[560px] w-full"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProcessPage;
