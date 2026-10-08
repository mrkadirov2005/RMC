import { useState } from 'react';
import { CheckCircle2, Coins, Download, Loader2, Star, TrendingUp, UserX, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import { optionToneClasses } from './scoreTones';
import type { LessonSummary, LessonSummaryBreakdown, LessonSummaryStatus } from '../sessionWorkflowModel';

const statusStyles: Record<LessonSummaryStatus, { label: string; badge: string; bar: string }> = {
  excellent: { label: 'Excellent lesson', badge: 'bg-emerald-600 text-white', bar: 'bg-emerald-500' },
  good: { label: 'Good lesson', badge: 'bg-sky-600 text-white', bar: 'bg-sky-500' },
  fair: { label: 'Fair lesson', badge: 'bg-amber-500 text-white', bar: 'bg-amber-500' },
  weak: { label: 'Needs attention', badge: 'bg-rose-600 text-white', bar: 'bg-rose-500' },
};

const StatTile = ({ icon: Icon, label, value, hint }: { icon: typeof Users; label: string; value: string; hint?: string }) => (
  <div className="rounded-lg border bg-muted/30 p-3">
    <div className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
    <div className="mt-1 text-xl font-black tabular-nums">{value}</div>
    {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
  </div>
);

const Breakdown = ({ title, items, total }: { title: string; items: LessonSummaryBreakdown; total: number }) => {
  const { t } = useLanguage();
  return (
    <div className="space-y-2">
      <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</div>
      {/* Stacked share of the class per option, in the same colours as the scoring table. */}
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
        {total > 0 && items.filter((item) => item.count > 0).map((item) => (
          <div key={item.label} style={{ width: `${(item.count / total) * 100}%`, background: optionToneClasses[item.tone].fill }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item.label}
            className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold', optionToneClasses[item.tone].idle, item.count === 0 && 'opacity-50')}
          >
            <span aria-hidden>{item.symbol}</span>
            {t(item.label)}
            <span className="tabular-nums">{item.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

interface LessonSummaryDialogProps {
  summary: LessonSummary | null;
  className?: string;
  date?: string;
  doneLabel: string;
  onDone: () => void;
  onReview: () => void;
  /** Downloads the class's attendance for the lesson's month as an image ("Suratni yuklash"). */
  onDownloadImage?: () => Promise<void>;
}

// Shown once a lesson is saved: confirms it and gives the teacher the lesson at a glance.
export function LessonSummaryDialog({ summary, className, date, doneLabel, onDone, onReview, onDownloadImage }: LessonSummaryDialogProps) {
  const { t } = useLanguage();
  const [downloading, setDownloading] = useState(false);

  const downloadImage = async () => {
    if (!onDownloadImage) return;
    setDownloading(true);
    try {
      await onDownloadImage();
    } finally {
      setDownloading(false);
    }
  };
  const style = summary ? statusStyles[summary.status] : statusStyles.good;

  return (
    <Dialog open={summary !== null} onOpenChange={(open) => { if (!open) onReview(); }}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        {summary && (
          <>
            <DialogHeader className="items-center text-center sm:text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <DialogTitle className="text-xl">
                {summary.attendance ? t('Attendance completed') : t('Lesson saved')}
              </DialogTitle>
              <DialogDescription>{[className, date].filter(Boolean).join(' · ')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t('Overall status')}</span>
                <span className={cn('rounded-md px-2 py-0.5 text-xs font-bold', style.badge)}>{t(style.label)}</span>
              </div>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
                <div className={style.bar} style={{ width: `${Math.min(100, summary.averagePercent)}%` }} />
              </div>
              <div className="text-sm text-muted-foreground">
                {t('Average score {score} of {max} ({percent}%)', {
                  score: String(summary.averageScore),
                  max: String(summary.maxScore),
                  percent: String(summary.averagePercent),
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <StatTile icon={Users} label={t('Students')} value={String(summary.total)} />
              {summary.attendance && (
                <StatTile
                  icon={CheckCircle2}
                  label={t('Attendance rate')}
                  value={`${summary.attendance.rate}%`}
                  hint={t('{present} of {total} present', { present: String(summary.attendance.present), total: String(summary.total) })}
                />
              )}
              {summary.coins && (
                <StatTile
                  icon={Coins}
                  label={t('Coins')}
                  value={`${summary.coins.total > 0 ? '+' : ''}${summary.coins.total}`}
                  hint={t('{count} students', { count: String(summary.coins.students) })}
                />
              )}
              {summary.pointsAverage !== null && (
                <StatTile icon={TrendingUp} label={t('Average points')} value={String(summary.pointsAverage)} />
              )}
            </div>

            {summary.attendance && <Breakdown title={t('Attendance')} items={summary.attendance.breakdown} total={summary.total} />}
            {summary.homework && <Breakdown title={t('Homework')} items={summary.homework} total={summary.total} />}
            {summary.activity && <Breakdown title={t('Activity')} items={summary.activity} total={summary.total} />}

            {summary.topStudents.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t('Top students')}</div>
                {summary.topStudents.map((student, index) => (
                  <div key={student.id} className="flex items-center justify-between rounded-md bg-muted/40 px-2.5 py-1.5 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="w-4 shrink-0 text-xs font-black text-muted-foreground">{index + 1}</span>
                      <span className="truncate font-semibold">{student.name}</span>
                      {student.name === summary.stellarStudentName && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500" />}
                    </span>
                    <span className="font-black tabular-nums">{student.score}</span>
                  </div>
                ))}
              </div>
            )}

            {summary.missedStudents.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <UserX className="h-3.5 w-3.5" />
                  {t('Did not attend')}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {summary.missedStudents.map((student) => (
                    <span key={student.id} className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
                      {student.name}
                      {student.status && <span className="font-normal opacity-75"> · {t(student.status)}</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {summary.skipped > 0 && (
              <p className="text-xs text-muted-foreground">
                {t('{count} transferred students were not part of this lesson and were skipped.', { count: String(summary.skipped) })}
              </p>
            )}

            <DialogFooter className="gap-2 sm:gap-2">
              {onDownloadImage && (
                <Button type="button" variant="outline" onClick={downloadImage} disabled={downloading} className="sm:mr-auto">
                  {downloading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
                  {t('Download image')}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onReview}>{t('Edit marks')}</Button>
              <Button type="button" onClick={onDone} className="bg-emerald-600 text-white hover:bg-emerald-700">{doneLabel}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
