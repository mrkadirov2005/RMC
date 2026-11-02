import { apiClient } from '@/shared/api/api';

export { classAPI } from '@/shared/api/api';

// @MOB-163 @MOB-165 Homework Bank, assigning and grading (service: /api/homework).

// @MOB-143 audio: a recorded answer; file: photos or PDFs. Both are graded by the teacher.
export type QuestionType = 'choice' | 'gap' | 'match' | 'text' | 'audio' | 'file';
export type Question = {
  id: string;
  type: QuestionType;
  prompt: string;
  points?: number;
  options?: string[];
  answer?: number;
  answers?: string[];
  pairs?: [string, string][];
  min_words?: number;
  max_seconds?: number;
  max_files?: number;
};
export type MediaFile = { media_id: number; kind: 'audio' | 'image' | 'pdf'; content_type: string; size_bytes: number; file_name: string | null };
export type Task = {
  task_id: number;
  lesson_id: number;
  title: string;
  skill: string;
  instructions: string | null;
  content: { questions: Question[] };
  max_score: string | number;
  status: 'draft' | 'approved';
  created_by_name: string | null;
};
export type BankLesson = { lesson_id: number; title: string; task_count: number; approved_count: number };
export type BankUnit = { unit_id: number; title: string; lessons: BankLesson[] };
export type BankBook = { book_id: number; title: string; units: BankUnit[] };
export type BankLevel = { level_id: number; name: string; center_id: number | null; books: BankBook[] };
export type Assignment = {
  assignment_id: number;
  task_id: number;
  task_title: string;
  skill: string;
  class_id: number;
  class_name: string;
  due_at: string | null;
  open_after_lesson: boolean;
  is_open: boolean;
  max_score: string | number;
  submitted_count: number;
  to_review_count: number;
  created_at: string;
};
export type Submission = {
  submission_id: number;
  student_id: number;
  first_name: string | null;
  last_name: string | null;
  answers: Record<string, unknown>;
  status: 'in_progress' | 'submitted' | 'reviewed';
  auto_score: string | null;
  score: string | null;
  max_score: string | null;
  feedback: string | null;
  submitted_at: string | null;
  media?: MediaFile[];
};

export const homeworkAPI = {
  bank: () => apiClient.get('/homework/bank'),
  addNode: (kind: 'level' | 'book' | 'unit' | 'lesson', title: string, parentId?: number) =>
    apiClient.post(`/homework/bank/${kind}`, { title, parent_id: parentId }),
  tasks: (lessonId: number) => apiClient.get(`/homework/lessons/${lessonId}/tasks`),
  createTask: (data: Omit<Task, 'task_id' | 'status' | 'max_score' | 'created_by_name'>) => apiClient.post('/homework/tasks', data),
  updateTask: (id: number, data: Omit<Task, 'task_id' | 'status' | 'max_score' | 'created_by_name'>) => apiClient.put(`/homework/tasks/${id}`, data),
  approveTask: (id: number) => apiClient.post(`/homework/tasks/${id}/approve`),
  assignments: (classId?: number) => apiClient.get('/homework/assignments', { params: classId ? { class_id: classId } : undefined }),
  assign: (data: { task_id: number; class_id: number; due_at?: string | null; open_after_lesson: boolean }) => apiClient.post('/homework/assignments', data),
  assignment: (id: number) => apiClient.get(`/homework/assignments/${id}`),
  removeAssignment: (id: number) => apiClient.delete(`/homework/assignments/${id}`),
  submissions: (assignmentId: number) => apiClient.get(`/homework/assignments/${assignmentId}/submissions`),
  // @MOB-143 A 5-minute signed link to a recorded or attached answer.
  media: (mediaId: number) => apiClient.get(`/homework/media/${mediaId}`),
  review: (submissionId: number, score: number, feedback: string) => apiClient.post(`/homework/submissions/${submissionId}/review`, { score, feedback }),
};
