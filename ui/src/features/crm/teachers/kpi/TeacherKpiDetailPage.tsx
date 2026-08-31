import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Target } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionPanel } from '@/components/common/SectionPanel';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAppSelector } from '../../hooks';
import { useTeacherKpiDetail } from './hooks/useTeacherKpiDetail';
import { AddEditKpiDialog } from './components/AddEditKpiDialog';
import { formatKpiPeriod, formatScore, resolveCurrentMonth, teacherFullName } from './model/kpiModel';
import type { KpiRecord } from './types';

const TeacherKpiDetailPage = () => {
  const navigate = useNavigate();
  const { teacherId: teacherIdParam } = useParams<{ teacherId: string }>();
  const teacherId = Number(teacherIdParam);
  const { detail, loading } = useTeacherKpiDetail(teacherId);
  const isOwner = (useAppSelector((state) => state.auth.user?.role) || '').toLowerCase() === 'owner';

  const [dialogPeriod, setDialogPeriod] = useState<{
    year: number;
    month: number;
    contributionScore?: number | string | null;
    teachingQualityScore?: number | string | null;
    notes?: string | null;
  } | null>(null);

  const currentPeriod = useMemo(() => resolveCurrentMonth(), []);
  const teacherName = detail ? teacherFullName(detail.teacher) : '';
  const currentMonthEntry = detail?.history.find(
    (entry) => entry.kpi_year === currentPeriod.year && entry.kpi_month === currentPeriod.month
  );

  const openDialogFor = (entry?: KpiRecord) => {
    setDialogPeriod({
      year: entry?.kpi_year ?? currentPeriod.year,
      month: entry?.kpi_month ?? currentPeriod.month,
      contributionScore: entry?.contribution_score,
      teachingQualityScore: entry?.teaching_quality_score,
      notes: entry?.notes,
    });
  };

  const dialogAutoScores = dialogPeriod
    ? dialogPeriod.year === currentPeriod.year && dialogPeriod.month === currentPeriod.month
      ? detail?.current_preview || { student_score: 0, retention_score: 0 }
      : {
          student_score: Number(detail?.history.find((e) => e.kpi_year === dialogPeriod.year && e.kpi_month === dialogPeriod.month)?.student_score) || 0,
          retention_score: Number(detail?.history.find((e) => e.kpi_year === dialogPeriod.year && e.kpi_month === dialogPeriod.month)?.retention_score) || 0,
        }
    : { student_score: 0, retention_score: 0 };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/teachers')}>
        <ArrowLeft className="h-4 w-4" />
        Back to Teachers
      </Button>

      <PageHeader
        title={teacherName || 'Teacher KPI'}
        description="Monthly KPI history for this teacher."
        icon={Target}
        primaryAction={
          isOwner ? (
            <Button
              className="gap-2 border-0 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700"
              onClick={() => openDialogFor(currentMonthEntry)}
            >
              {currentMonthEntry ? 'Edit' : 'Add'} {formatKpiPeriod(currentPeriod.year, currentPeriod.month)} KPI
            </Button>
          ) : undefined
        }
      />

      <SectionPanel contentClassName="p-0">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !detail || detail.history.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No KPI recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Student Scores</TableHead>
                  <TableHead>Retention</TableHead>
                  <TableHead>Contribution</TableHead>
                  <TableHead>Teaching Quality</TableHead>
                  <TableHead>Final KPI</TableHead>
                  <TableHead>Recorded By</TableHead>
                  <TableHead>Notes</TableHead>
                  {isOwner && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.history.map((entry) => (
                  <TableRow key={`${entry.kpi_year}-${entry.kpi_month}`}>
                    <TableCell className="font-medium">{formatKpiPeriod(entry.kpi_year, entry.kpi_month)}</TableCell>
                    <TableCell>{formatScore(entry.student_score)}</TableCell>
                    <TableCell>{formatScore(entry.retention_score)}</TableCell>
                    <TableCell>{formatScore(entry.contribution_score)}</TableCell>
                    <TableCell>{formatScore(entry.teaching_quality_score)}</TableCell>
                    <TableCell className="font-bold text-primary">{formatScore(entry.final_score)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {entry.marked_by_name ? `${entry.marked_by_name} (${entry.marked_by_role || 'admin'})` : '—'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                      {entry.notes || '—'}
                    </TableCell>
                    {isOwner && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openDialogFor(entry)}>
                          Edit
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionPanel>

      {dialogPeriod && isOwner && (
        <AddEditKpiDialog
          open={!!dialogPeriod}
          onOpenChange={(open) => { if (!open) setDialogPeriod(null); }}
          teacherId={teacherId}
          teacherName={teacherName || `Teacher #${teacherId}`}
          kpiYear={dialogPeriod.year}
          kpiMonth={dialogPeriod.month}
          autoScores={dialogAutoScores}
          existingContributionScore={dialogPeriod.contributionScore}
          existingTeachingQualityScore={dialogPeriod.teachingQualityScore}
          existingNotes={dialogPeriod.notes}
        />
      )}
    </div>
  );
};

export default TeacherKpiDetailPage;
