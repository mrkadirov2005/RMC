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
}

export interface KpiOverviewRow {
  teacher_id: number;
  first_name?: string;
  last_name?: string;
  center_id?: number | null;
  kpi: KpiRecord | null;
  preview: KpiAutoScores;
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
  notes?: string;
}
