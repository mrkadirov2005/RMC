// What each node of the graph loads when it is opened. Everything is read-only and goes through the
// same endpoints the rest of the app uses, scoped to the centre being looked at.
import { attendanceAPI, assignmentAPI, centerAPI, gradeAPI, paymentAPI, studentAPI, teacherAPI } from '@/shared/api/api';
import { unwrapApiRows } from '@/shared/api/response';
import { MAX_CHILDREN, STUDENT_TABS, type GraphNode, type StudentTabId } from './graphModel';

type Row = Record<string, any>;
const ownCenter = { skipCenterScope: true };

const fullName = (row: Row) => [row.first_name, row.last_name].filter(Boolean).join(' ') || row.name || row.username || `#${row.teacher_id ?? row.student_id ?? row.id}`;
const day = (value: unknown) => String(value || '').slice(0, 10);
const money = (value: unknown) => `${Number(value || 0).toLocaleString('en-US')} UZS`;
const item = (id: string, label: string, sub?: string): GraphNode => ({ id, kind: 'item', label, sub, expandable: false });

const withMore = (nodes: GraphNode[], parentId: string, total: number): GraphNode[] =>
  total > nodes.length ? [...nodes, { id: `${parentId}:more`, kind: 'more', label: `+${total - nodes.length} more`, sub: 'Shown in the lists', expandable: false }] : nodes;

export const loadCenters = async (): Promise<GraphNode[]> => {
  const rows = unwrapApiRows<Row>(await centerAPI.getAll());
  return rows.map((row) => ({
    id: `center:${row.center_id}`, kind: 'center' as const, label: row.center_name || `Center ${row.center_id}`,
    sub: row.city || row.address || undefined, expandable: true, ref: { centerId: Number(row.center_id) },
  }));
};

export const loadTeachers = async (centerId: number): Promise<GraphNode[]> => {
  const rows = unwrapApiRows<Row>(await teacherAPI.getAll({ center_id: centerId }, ownCenter));
  const nodes = rows.slice(0, MAX_CHILDREN).map((row) => ({
    id: `teacher:${row.teacher_id}`, kind: 'teacher' as const, label: fullName(row), sub: row.subject || row.phone || undefined,
    expandable: true, ref: { centerId, teacherId: Number(row.teacher_id) },
  }));
  return withMore(nodes, `center:${centerId}`, rows.length);
};

export const loadStudents = async (centerId: number, teacherId: number): Promise<GraphNode[]> => {
  const response: any = await studentAPI.getAll({ center_id: centerId, teacher_id: teacherId, limit: MAX_CHILDREN, page: 1 }, ownCenter);
  const rows = unwrapApiRows<Row>(response);
  // The body is { data, total }, whether or not the client wraps it once more.
  const total = Number(response?.total ?? response?.data?.total ?? rows.length);
  const nodes = rows.slice(0, MAX_CHILDREN).map((row) => {
    const studentId = Number(row.student_id ?? row.id);
    return {
      id: `student:${teacherId}:${studentId}`, kind: 'student' as const, label: fullName(row), sub: row.class_name || row.status || undefined,
      expandable: true, ref: { centerId, teacherId, studentId, classId: row.class_id == null ? null : Number(row.class_id) },
    };
  });
  return withMore(nodes, `teacher:${teacherId}`, total);
};

/** The student's tabs, as they are on the student's page. */
export const studentTabNodes = (parent: GraphNode): GraphNode[] =>
  STUDENT_TABS.map((tab) => ({ id: `${parent.id}:${tab.id}`, kind: 'tab' as const, label: tab.label, expandable: true, ref: { ...parent.ref, tab: tab.id } }));

const last = <T,>(rows: T[], count = 8) => rows.slice(0, count);
const newest = (rows: Row[], key: string) => [...rows].sort((a, b) => String(b[key] || '').localeCompare(String(a[key] || '')));

/** What a tab holds, as small leaf nodes. */
export const loadTabData = async (parent: GraphNode): Promise<GraphNode[]> => {
  const { studentId, centerId, classId, tab } = parent.ref || {};
  if (!studentId || !tab) return [];
  const leaf = (index: number, label: string, sub?: string) => item(`${parent.id}:${index}`, label, sub);
  const params = { center_id: centerId };
  const empty = [leaf(0, 'Nothing here yet')];

  const handlers: Record<StudentTabId, () => Promise<GraphNode[]>> = {
    overview: async () => {
      const student: Row = (await studentAPI.getById(studentId) as any)?.data ?? {};
      const fields: Array<[string, unknown]> = [['Status', student.status], ['Phone', student.phone], ['Parent', student.parent_name], ['Parent phone', student.parent_phone], ['Started', day(student.start_date)], ['Group', student.class_name]];
      const rows = fields.filter(([, value]) => value);
      return rows.length ? rows.map(([label, value], index) => leaf(index, String(value), label)) : empty;
    },
    groups: async () => {
      const rows = unwrapApiRows<Row>(await studentAPI.getGroups(studentId));
      return rows.length ? rows.map((row, index) => leaf(index, row.class_name || `Group ${row.class_id}`, [row.status, day(row.start_date)].filter(Boolean).join(' · '))) : empty;
    },
    videos: async () => {
      const data: Row = (await studentAPI.getVideos(studentId) as any)?.data ?? {};
      const rows = [['Before', data.before_video_url], ['After', data.after_video_url]].filter(([, url]) => url);
      return rows.length ? rows.map(([label, url], index) => leaf(index, String(label), String(url))) : empty;
    },
    attendance: async () => {
      const rows = unwrapApiRows<Row>(await attendanceAPI.getByStudent(studentId));
      if (!rows.length) return empty;
      const counts = rows.reduce<Record<string, number>>((all, row) => ({ ...all, [row.status || 'Unknown']: (all[row.status || 'Unknown'] || 0) + 1 }), {});
      const summary = Object.entries(counts).map(([status, count], index) => leaf(index, `${status}: ${count}`));
      return [...summary, ...last(newest(rows, 'attendance_date'), 5).map((row, index) => leaf(100 + index, day(row.attendance_date), row.status))];
    },
    payments: async () => {
      const rows = newest(unwrapApiRows<Row>(await paymentAPI.getByStudent(studentId, params)), 'payment_date');
      return rows.length ? last(rows).map((row, index) => leaf(index, money(row.amount), [day(row.payment_date), row.payment_method].filter(Boolean).join(' · '))) : empty;
    },
    assignments: async () => {
      const rows = classId ? unwrapApiRows<Row>(await assignmentAPI.getAll({ ...params, class_id: classId, limit: 50 })).filter((row) => !row.student_id) : [];
      return rows.length ? last(rows).map((row, index) => leaf(index, row.title || row.assignment_title || `Assignment ${row.assignment_id}`, day(row.due_date))) : empty;
    },
    'individual-tasks': async () => {
      const rows = classId ? unwrapApiRows<Row>(await assignmentAPI.getAll({ ...params, class_id: classId, limit: 100 })).filter((row) => Number(row.student_id) === studentId) : [];
      return rows.length ? last(rows).map((row, index) => leaf(index, row.title || row.assignment_title || `Task ${row.assignment_id}`, day(row.due_date))) : empty;
    },
    grades: async () => {
      const rows = newest(unwrapApiRows<Row>(await gradeAPI.getByStudent(studentId)), 'created_at');
      return rows.length ? last(rows).map((row, index) => leaf(index, `${row.marks_obtained ?? '-'} / ${row.total_marks ?? '-'}`, [row.grade_letter, row.subject_name].filter(Boolean).join(' · '))) : empty;
    },
    coins: async () => {
      const data: Row = (await studentAPI.getCoins(studentId) as any)?.data ?? {};
      return [leaf(0, `${data.coins ?? data.balance ?? 0} coins`, 'Balance')];
    },
  };

  try {
    return await handlers[tab]();
  } catch {
    return [leaf(0, 'Could not load this', 'Try closing and opening it again')];
  }
};
