// O'qituvchilar -> KPI: every teacher's month in the owner's seven parts, the month's place, and
// the year so far (every saved month from January added up) with its place. The owner enters the
// three parts given by hand (contribution, exam, teaching quality) straight from this table.

import { useState } from 'react';
import { Loader2, PencilLine, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppSelector } from '../../hooks';
import { useTeacherKpiOverview } from './hooks/useTeacherKpiOverview';
import { AddEditKpiDialog } from './components/AddEditKpiDialog';
import { formatKpiPeriod, formatScore, monthInputValue, parseMonthInputValue, teacherFullName } from './model/kpiModel';
import type { KpiOverviewRow } from './types';
import { useLanguage } from '@/i18n/LanguageContext';

const Place = ({ value }: { value?: number | null }) =>
  value ? <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[11px] font-black text-primary">{value}</span> : <span className="text-muted-foreground">—</span>;

export const TeachersKpiTab = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const isOwner = (useAppSelector((state) => state.auth.user?.role) || '').toLowerCase() === 'owner';
  const { year, month, setPeriod, search, setSearch, loading, rows } = useTeacherKpiOverview();
  const [editing, setEditing] = useState<KpiOverviewRow | null>(null);

  // Best first: the month's place, then teachers with no saved KPI yet.
  const sorted = [...rows].sort((a, b) => (a.month_place ?? 9999) - (b.month_place ?? 9999) || teacherFullName(a).localeCompare(teacherFullName(b)));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('Search teachers...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 pr-8 text-xs"
          />
          {search && (
            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2" onClick={() => setSearch('')}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <Input
          type="month"
          aria-label={t('Month')}
          value={monthInputValue(year, month)}
          onChange={(e) => {
            const parsed = parseMonthInputValue(e.target.value);
            if (parsed) setPeriod(parsed.year, parsed.month);
          }}
          className="h-8 w-auto text-xs"
        />
        <span className="text-xs font-semibold text-muted-foreground">{formatKpiPeriod(year, month)}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {t('KPI = average of retention, lesson scores, contribution, exam, teaching quality and on-time scoring (each out of 100), plus 1 point for each new student who came for the teacher.')}
      </p>

      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">{t('No teachers found')}</div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader className="bg-slate-50/90 dark:bg-transparent">
                <TableRow>
                  <TableHead className="h-8 px-2 text-center">{t('Place')}</TableHead>
                  <TableHead className="h-8 px-2">{t('Teacher')}</TableHead>
                  <TableHead className="h-8 px-2 text-right">{t('Retention')}</TableHead>
                  <TableHead className="h-8 px-2 text-right">{t('Came for teacher')}</TableHead>
                  <TableHead className="h-8 px-2 text-right">{t('Lesson scores')}</TableHead>
                  <TableHead className="h-8 px-2 text-right">{t('Contribution')}</TableHead>
                  <TableHead className="h-8 px-2 text-right">{t('Exam')}</TableHead>
                  <TableHead className="h-8 px-2 text-right">{t('Teaching Quality')}</TableHead>
                  <TableHead className="h-8 px-2 text-right">{t('On-time scoring')}</TableHead>
                  <TableHead className="h-8 px-2 text-right">{t('Final KPI')}</TableHead>
                  <TableHead className="h-8 px-2 text-right">{t('Year so far')}</TableHead>
                  {isOwner && <TableHead className="h-8 px-2" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((row) => (
                  <TableRow
                    key={row.teacher_id}
                    className="cursor-pointer hover:bg-sky-50/60 dark:hover:bg-muted/50"
                    onClick={() => navigate(`/teachers/${row.teacher_id}/kpi`)}
                  >
                    <TableCell className="px-2 py-2 text-center"><Place value={row.month_place} /></TableCell>
                    <TableCell className="px-2 py-2 font-semibold">{teacherFullName(row)}</TableCell>
                    <TableCell className="px-2 py-2 text-right">{formatScore(row.kpi?.retention_score ?? row.preview.retention_score)}</TableCell>
                    <TableCell className="px-2 py-2 text-right">+{Number(row.kpi?.referral_count ?? row.preview.referral_count ?? 0)}</TableCell>
                    <TableCell className="px-2 py-2 text-right">{formatScore(row.kpi?.student_score ?? row.preview.student_score)}</TableCell>
                    <TableCell className="px-2 py-2 text-right">{formatScore(row.kpi?.contribution_score)}</TableCell>
                    <TableCell className="px-2 py-2 text-right">{formatScore(row.kpi?.exam_score)}</TableCell>
                    <TableCell className="px-2 py-2 text-right">{formatScore(row.kpi?.teaching_quality_score)}</TableCell>
                    <TableCell className="px-2 py-2 text-right">{formatScore(row.kpi?.grading_score ?? row.preview.grading_score)}</TableCell>
                    <TableCell className="px-2 py-2 text-right font-bold text-primary">{formatScore(row.kpi?.final_score)}</TableCell>
                    <TableCell className="whitespace-nowrap px-2 py-2 text-right">
                      {row.year_total != null ? <><span className="font-semibold">{formatScore(row.year_total)}</span> <Place value={row.year_place} /></> : '—'}
                    </TableCell>
                    {isOwner && (
                      <TableCell className="px-2 py-2 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-[11px]"
                          onClick={(event) => { event.stopPropagation(); setEditing(row); }}
                        >
                          <PencilLine className="h-3.5 w-3.5" />
                          {row.kpi ? t('Edit') : t('Enter scores')}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {editing && isOwner && (
        <AddEditKpiDialog
          open={Boolean(editing)}
          onOpenChange={(open) => { if (!open) setEditing(null); }}
          teacherId={editing.teacher_id}
          teacherName={teacherFullName(editing)}
          kpiYear={year}
          kpiMonth={month}
          autoScores={editing.preview}
          existingContributionScore={editing.kpi?.contribution_score}
          existingTeachingQualityScore={editing.kpi?.teaching_quality_score}
          existingExamScore={editing.kpi?.exam_score}
          existingNotes={editing.kpi?.notes}
        />
      )}
    </div>
  );
};

export default TeachersKpiTab;
