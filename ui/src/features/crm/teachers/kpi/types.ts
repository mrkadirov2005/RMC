// Domain types for the teacher KPI tracking feature.

export interface KpiRecord {
  kpi_id: number;
  center_id?: number | null;
  teacher_id: number;
  kpi_year: number;
  kpi_month: number;
  student_score: number | string;
  retention_score: number | string;
  contribution_score: number | string;
  teaching_quality_score: number | string;
  /** The teacher's students' exam score for the month (entered). */
  exam_score?: number | string | null;
  /** On-time scoring: 100 minus lesson control's minus (auto). */
  grading_score?: number | string | null;
  /** New students who came asking for this teacher: +1 point each (auto). */
  referral_count?: number | null;
  final_score: number | string;
  notes?: string | null;
  marked_by_id?: number | null;
  marked_by_user_type?: string | null;
  marked_by_role?: string | null;
  marked_by_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface KpiAutoScores {
  student_score: number;
  retention_score: number;
  grading_score?: number;
  referral_count?: number;
}

export interface KpiOverviewRow {
  teacher_id: number;
  first_name?: string;
  last_name?: string;
  center_id?: number | null;
  kpi: KpiRecord | null;
  preview: KpiAutoScores;
  /** Place this month (saved KPIs only), the year so far added up, and its place. */
  month_place?: number | null;
  year_total?: number | null;
  year_place?: number | null;
}

export interface KpiTeacherSummary {
  teacher_id: number;
  first_name?: string;
  last_name?: string;
}

export interface KpiTeacherDetail {
  teacher: KpiTeacherSummary;
  history: KpiRecord[];
  current_period: { year: number; month: number };
  current_preview: KpiAutoScores;
}

export interface UpsertKpiPayload {
  teacher_id: number;
  kpi_year: number;
  kpi_month: number;
  contribution_score: number;
  teaching_quality_score: number;
  exam_score?: number;
  notes?: string;
}
