const repository = require('../repositories/telegram_student.repository');

const fullName = (row: any, prefix = '') =>
  [row?.[`${prefix}first_name`], row?.[`${prefix}last_name`]].filter(Boolean).join(' ').trim();

const toStudentProfile = (row: any) => ({
  student_id: row.student_id,
  name: fullName(row),
  status: row.status,
  coins: Number(row.coins || 0),
  telegram_user_id: row.telegram_user_id,
  class: row.class_id
    ? { class_id: row.class_id, class_name: row.class_name, class_code: row.class_code }
    : null,
  teacher: row.teacher_id
    ? { teacher_id: row.teacher_id, name: fullName(row, 'teacher_') }
    : null,
});

const requireStudent = async (telegramUserId: string) => {
  if (!telegramUserId) {
    const error: any = new Error('telegram_user_id is required');
    error.status = 400;
    throw error;
  }
  const student = await repository.resolveStudent(telegramUserId);
  if (!student) {
    const error: any = new Error('Imported Telegram student account was not found');
    error.status = 404;
    throw error;
  }
  return student;
};

const menu = async (telegramUserId: string) => {
  const student = await requireStudent(telegramUserId);
  return {
    student: toStudentProfile(student),
    menus: [
      { key: 'last_lesson', label: "Oxirgi dars" },
      { key: 'rankings', label: "O'rin", children: ['class', 'center'] },
      { key: 'results', label: 'Natijalar' },
    ],
  };
};

const lastLesson = async (telegramUserId: string) => {
  const student = await requireStudent(telegramUserId);
  const lesson = await repository.findLastLesson(student.student_id);
  if (!lesson) return { student: toStudentProfile(student), lesson: null };
  return {
    student: toStudentProfile(student),
    lesson: {
      session_id: lesson.session_id,
      date: lesson.session_date,
      start_time: lesson.start_time,
      end_time: lesson.end_time,
      teacher: fullName(lesson, 'teacher_'),
      class_name: lesson.class_name,
      rank: lesson.rank,
      total_students: lesson.total_students,
      score: {
        marks_obtained: Number(lesson.marks_obtained || 0),
        total_marks: Number(lesson.total_marks || 0),
        percentage: Number(lesson.percentage || 0),
        grade_letter: lesson.grade_letter,
      },
      components: {
        attendance: Number(lesson.attendance_score || 0),
        homework: Number(lesson.homework_score || 0),
        activity: Number(lesson.activity_score || 0),
      },
      coins_given: Number(lesson.coins_given || 0),
    },
  };
};

const rankings = async (telegramUserId: string, scope: string) => {
  const student = await requireStudent(telegramUserId);
  const normalizedScope = scope === 'center' ? 'center' : 'class';
  const rows = normalizedScope === 'center'
    ? await repository.centerRank(student.center_id)
    : student.class_id
      ? await repository.classRank(student.center_id, student.class_id)
      : [];
  return {
    student: toStudentProfile(student),
    scope: normalizedScope,
    ranking: rows.map((row: any) => ({
      rank: row.rank,
      student_id: row.student_id,
      name: fullName(row),
      status: row.status,
      class_name: row.class_name,
      coins: Number(row.coins || 0),
      points: Number(row.points || 0),
      is_me: Number(row.student_id) === Number(student.student_id),
    })),
  };
};

const results = async (telegramUserId: string, page: number, limit: number) => {
  const student = await requireStudent(telegramUserId);
  const safePage = Math.max(1, Number(page || 1));
  const safeLimit = Math.min(30, Math.max(1, Number(limit || 10)));
  const data = await repository.results(student.student_id, safePage, safeLimit);
  return {
    student: toStudentProfile(student),
    ...data,
    total_pages: Math.max(1, Math.ceil(data.total / data.limit)),
  };
};

module.exports = { menu, lastLesson, rankings, results };

export {};
