// Shared TypeScript types.

export interface Subject {
  subject_id?: number;
  id?: number;
  class_id: number;
  subject_name: string;
  subject_code: string;
  teacher_id?: number;
  total_marks: number;
  passing_marks: number;
}

