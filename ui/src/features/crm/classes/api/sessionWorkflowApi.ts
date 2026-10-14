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
  async load(classId: number, sessionId: number | null) {
    const [classResponse, sessionsResponse, students, attendanceResponse, gradesResponse, scoringResponse] = await Promise.all([
      classAPI.getById(classId),
      classAPI.getSessions(classId).catch(() => ({ data: [] })),
      fetchAllClassStudents(classId),
      // A lesson without a session row yet has nothing recorded to load.
      sessionId ? attendanceAPI.getBySession(sessionId).catch(() => ({ data: [] })) : { data: [] },
      sessionId ? gradeAPI.getBySession(sessionId).catch(() => ({ data: [] })) : { data: [] },
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
  /** Sessions plus the dates that already have attendance, for the lesson picker calendar. */
  async loadLessonCalendar(classId: number) {
    const [sessionsResponse, attendanceResponse] = await Promise.all([
      classAPI.getSessions(classId).catch(() => ({ data: [] })),
      attendanceAPI.getByClass(classId).catch(() => ({ data: [] })),
    ]);
    const attendanceDates = new Set(
      unwrapApiRows<any>(attendanceResponse)
        .map((record) => String(record?.attendance_date || '').slice(0, 10))
        .filter(Boolean),
    );
    return { sessions: unwrapApiRows<any>(sessionsResponse), attendanceDates };
  },
  /** The class's lesson grades in one month, each with its lesson date (for the monthly image). */
  async loadClassMonthScores(classId: number, monthKey: string) {
    const sessions = unwrapApiRows<any>(await classAPI.getSessions(classId).catch(() => ({ data: [] })))
      .filter((session) => String(session?.session_date || '').startsWith(monthKey) && Number(session?.session_id) > 0);
    const perSession = await Promise.all(sessions.map(async (session) =>
      unwrapApiRows<any>(await gradeAPI.getBySession(Number(session.session_id)).catch(() => ({ data: [] })))
        .map((grade) => ({ ...grade, session_date: session.session_date }))
    ));
    return perSession.flat();
  },
  /** All of the class's attendance records, fresh from the server (for the monthly attendance image). */
  async loadClassAttendance(classId: number) {
    return unwrapApiRows<any>(await attendanceAPI.getByClass(classId));
  },
  save: (payload: Parameters<typeof gradeAPI.saveSessionWorkflow>[0]) => gradeAPI.saveSessionWorkflow(payload),
};
