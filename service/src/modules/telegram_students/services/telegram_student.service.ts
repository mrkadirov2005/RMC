const repository = require('../repositories/telegram_student.repository');

const fullName = (row: any, prefix = '') =>
  [row?.[`${prefix}first_name`], row?.[`${prefix}last_name`]].filter(Boolean).join(' ').trim();

const money = (value: unknown, currency = 'UZS') =>
  `${Number(value || 0).toLocaleString('en-US')} ${currency || 'UZS'}`;

const fmtDate = (value: unknown) => {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '-';
  return date.toISOString().slice(0, 10);
};

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
      { key: 'last_lesson', label: "🕘 Oxirgi dars" },
      { key: 'payments', label: "💳 To'lovlar" },
      { key: 'rankings', label: "🏆 O'rin", children: ['class', 'center'] },
      { key: 'results', label: '📊 Natijalar' },
    ],
    message: `👋 Xush kelibsiz, ${fullName(student)}.\nKerakli bo'limni tanlang.`,
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
  const summary = normalizedScope === 'center'
    ? await repository.centerRankSummary(student.center_id, student.student_id)
    : student.class_id
      ? await repository.classRankSummary(student.center_id, student.class_id, student.student_id)
      : null;
  const title = normalizedScope === 'center' ? "🏫 Markaz bo'yicha o'rin" : "👥 Guruh bo'yicha o'rin";
  return {
    student: toStudentProfile(student),
    scope: normalizedScope,
    ranking: summary
      ? {
          rank: Number(summary.rank || 0),
          total_students: Number(summary.total_students || 0),
          coins: Number(summary.coins || 0),
          points: Number(summary.points || 0),
          class_name: summary.class_name || student.class_name || null,
        }
      : null,
    message: summary
      ? `${title}\n📍 ${summary.rank}-o'rin / ${summary.total_students} ta o'quvchi\n🪙 Coins: ${summary.coins || 0}\n⭐ Points: ${summary.points || 0}`
      : `${title}\nHozircha reyting ma'lumoti topilmadi.`,
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

const payments = async (telegramUserId: string, page: number, limit: number) => {
  const student = await requireStudent(telegramUserId);
  const safePage = Math.max(1, Number(page || 1));
  const safeLimit = Math.min(20, Math.max(1, Number(limit || 10)));
  const data = await repository.payments(student.student_id, student.center_id, safePage, safeLimit);
  const rows = data.data.map((row: any) => ({
    payment_id: row.payment_id,
    date: row.payment_date,
    amount: Number(row.amount || 0),
    final_amount: row.final_amount == null ? null : Number(row.final_amount || 0),
    discount_amount: row.discount_amount == null ? null : Number(row.discount_amount || 0),
    currency: row.currency || 'UZS',
    method: row.payment_method,
    status: row.payment_status,
    type: row.payment_type,
    receipt_number: row.receipt_number,
    is_complete: Boolean(row.is_complete),
  }));
  const lines = rows.length
    ? rows.map((row: any, index: number) =>
        `${index + 1}. 📅 ${fmtDate(row.date)} · 💰 ${money(row.final_amount ?? row.amount, row.currency)} · ${row.status || '-'}`
      )
    : ["📭 Hozircha to'lov yozuvlari topilmadi."];

  return {
    student: toStudentProfile(student),
    data: rows,
    total: data.total,
    page: data.page,
    limit: data.limit,
    total_pages: Math.max(1, Math.ceil(data.total / data.limit)),
    message: [`💳 To'lovlar tarixi`, `👤 ${fullName(student)}`, '', ...lines].join('\n'),
  };
};

module.exports = { menu, lastLesson, rankings, results, payments };

export {};
