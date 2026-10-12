// Shared by the teacher panel and the admin page.

export type LessonStatus = 'on_time' | 'late' | 'missing' | 'pending';
export type DueLesson = { class_id: number; class_name: string; date: string; start: string; deadline: string; status: LessonStatus };
export type Summary = { due: number; on_time: number; late: number; missing: number; pending: number; points?: number; bonus?: number };
export type Reschedule = {
  reschedule_id: number; class_id: number; class_name: string; teacher_name?: string | null; original_date: string; new_date: string;
  new_time?: string | null; reason?: string | null; status: 'pending' | 'approved' | 'rejected'; decided_by_name?: string | null;
};

export const STATUS_LABELS: Record<LessonStatus, string> = { on_time: 'On time', late: 'Late', missing: 'Not scored', pending: 'Waiting' };
export const REQUEST_LABELS: Record<Reschedule['status'], string> = { pending: 'Waiting for approval', approved: 'Approved', rejected: 'Rejected' };

export const day = (value?: string | null) => (value ? `${value.slice(8, 10)}.${value.slice(5, 7)}.${value.slice(0, 4)}` : '—');
export const currentMonth = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7);
