import { attendanceAPI, classAPI, gradeAPI, settingsAPI, studentAPI } from '@/shared/api/api';
import { getApiPayload, unwrapApiRows } from '@/shared/api/response';
import { defaultLessonScoringSettings } from '../lessonScoringSettings';

const fetchAllClassStudents = async (classId: number) => {
  const directRows = unwrapApiRows<any>(await studentAPI.getByClassWithTransfers(classId, { _fresh: Date.now() }).catch(() => ({ data: [] })));
  if (directRows.length > 0) return directRows;

  const allRows: any[] = [];
  let page = 1;
  let total = 0;
  do {
    const response = await studentAPI.getAll({ class_id: classId, page, limit: 100, _fresh: Date.now() });
    const payload = getApiPayload<{ total?: number }>(response);
    const rows = unwrapApiRows<any>(response);
    total = Number(payload?.total || rows.length || allRows.length);
    allRows.push(...rows);
    page += 1;
  } while (allRows.length < total && page < 100);
  return allRows;
};

export const sessionWorkflowApi = {
  async load(classId: number, sessionId: number) {
    const [classResponse, sessionsResponse, students, attendanceResponse, gradesResponse, scoringResponse] = await Promise.all([
      classAPI.getById(classId),
      classAPI.getSessions(classId).catch(() => ({ data: [] })),
      fetchAllClassStudents(classId),
      attendanceAPI.getBySession(sessionId).catch(() => ({ data: [] })),
      gradeAPI.getBySession(sessionId).catch(() => ({ data: [] })),
      settingsAPI.getLessonScoring().catch(() => ({ data: defaultLessonScoringSettings })),
    ]);
    return {
      classData: getApiPayload<any>(classResponse),
      sessions: unwrapApiRows<any>(sessionsResponse),
      students,
      attendanceRecords: unwrapApiRows<any>(attendanceResponse),
      grades: unwrapApiRows<any>(gradesResponse),
      scoringSettings: getApiPayload(scoringResponse),
    };
  },
  async createSession(classId: number, payload: {
    session_date: string;
    start_time: string;
    duration_minutes?: number;
    teacher_id?: number;
    center_id?: number;
  }) {
    return getApiPayload<any>(await classAPI.createSession(classId, payload));
  },
  save: (payload: Parameters<typeof gradeAPI.saveSessionWorkflow>[0]) => gradeAPI.saveSessionWorkflow(payload),
};
