import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppDispatch, useAppSelector } from '../../../hooks';
import { upsertTeacherKpi, selectKpiUpsertLoading } from '@/slices/kpisSlice';
import { computeFinalScorePreview, formatKpiPeriod, formatScore } from '../model/kpiModel';
import type { KpiAutoScores } from '../types';

interface AddEditKpiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: number;
  teacherName: string;
  kpiYear: number;
  kpiMonth: number;
  autoScores: KpiAutoScores;
  existingContributionScore?: number | string | null;
  existingTeachingQualityScore?: number | string | null;
  existingNotes?: string | null;
}

export const AddEditKpiDialog = ({
  open,
  onOpenChange,
  teacherId,
  teacherName,
  kpiYear,
  kpiMonth,
  autoScores,
  existingContributionScore,
  existingTeachingQualityScore,
  existingNotes,
}: AddEditKpiDialogProps) => {
  const dispatch = useAppDispatch();
  const submitting = useAppSelector(selectKpiUpsertLoading);

  const [contributionScore, setContributionScore] = useState('');
  const [teachingQualityScore, setTeachingQualityScore] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setContributionScore(existingContributionScore != null ? String(existingContributionScore) : '');
    setTeachingQualityScore(existingTeachingQualityScore != null ? String(existingTeachingQualityScore) : '');
    setNotes(existingNotes || '');
  }, [open, existingContributionScore, existingTeachingQualityScore, existingNotes]);

  const parsedContribution = Number(contributionScore);
  const parsedTeachingQuality = Number(teachingQualityScore);
  const isScoreValid = (value: number, raw: string) => raw.trim() !== '' && Number.isFinite(value) && value >= 0 && value <= 100;
  const isValid = isScoreValid(parsedContribution, contributionScore) && isScoreValid(parsedTeachingQuality, teachingQualityScore);

  const finalScorePreview = useMemo(() => {
    if (!isValid) return null;
    return computeFinalScorePreview(autoScores.student_score, autoScores.retention_score, parsedContribution, parsedTeachingQuality);
  }, [autoScores, isValid, parsedContribution, parsedTeachingQuality]);

  const handleSubmit = async () => {
    if (!isValid) return;
    const result = await dispatch(
      upsertTeacherKpi({
        teacher_id: teacherId,
        kpi_year: kpiYear,
        kpi_month: kpiMonth,
        contribution_score: parsedContribution,
        teaching_quality_score: parsedTeachingQuality,
        notes: notes.trim() || undefined,
      })
    );
    if ((result as any).meta?.requestStatus === 'fulfilled') {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Teacher KPI</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {teacherName} — {formatKpiPeriod(kpiYear, kpiMonth)}
          </p>

          <div className="grid grid-cols-2 gap-1.5 rounded-md border bg-muted/30 p-2.5 text-xs">
            <div>
              <p className="text-muted-foreground">Student Scores (auto)</p>
              <p className="font-bold text-primary">{formatScore(autoScores.student_score)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Retention (auto)</p>
              <p className="font-bold text-primary">{formatScore(autoScores.retention_score)}</p>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Contribution (0–100)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={contributionScore}
              onChange={(e) => setContributionScore(e.target.value)}
              placeholder="e.g. 85"
            />
          </div>
          <div className="space-y-1">
            <Label>Teaching Quality (0–100)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={teachingQualityScore}
              onChange={(e) => setTeachingQualityScore(e.target.value)}
              placeholder="e.g. 90"
            />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={3}
            />
          </div>

          {finalScorePreview !== null && (
            <div className="rounded-md border bg-primary/5 p-2.5 text-xs">
              <p className="text-muted-foreground">Final KPI (average of all 4 categories)</p>
              <p className="text-lg font-black text-primary">{formatScore(finalScorePreview)}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !isValid}
            className="gap-2 border-0 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save KPI'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
