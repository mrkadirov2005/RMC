require('dotenv').config();

const crypto = require('crypto');
const { Pool } = require('pg');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is required. Create bot/.env from bot/.env.example.');
  process.exit(1);
}

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'crm_user',
  password: process.env.DB_PASSWORD || 'crm_password',
  database: process.env.DB_NAME || 'crm_db',
});

const apiBase = `https://api.telegram.org/bot${token}`;
const userState = new Map();
const sessions = new Map();

const MAIN_KEYBOARD = {
  keyboard: [[{ text: 'Kirish' }, { text: "Ro'yhatdan o'tish" }]],
  resize_keyboard: true,
};

const AUTH_KEYBOARD = {
  keyboard: [
    [{ text: 'Darslar' }, { text: 'Oxirgi dars' }],
    [{ text: "O'rin" }, { text: "To'lovlar" }],
    [{ text: 'Natijalar' }],
    [{ text: 'Chiqish' }],
  ],
  resize_keyboard: true,
};

const RESULTS_PAGE_SIZE = 5;

const REGISTER_STEPS = [
  { key: 'first_name', prompt: 'Ismingizni kiriting:' },
  { key: 'last_name', prompt: 'Familiyangizni kiriting:' },
  { key: 'phone', prompt: 'Telefon raqamingizni kiriting:' },
  { key: 'date_of_birth', prompt: "Tug'ilgan sanangizni kiriting. Masalan: 2008-05-21" },
  { key: 'parent_name', prompt: 'Ota-ona ismini kiriting:' },
  { key: 'parent_phone', prompt: 'Ota-ona telefon raqamini kiriting:' },
  { key: 'gender', prompt: 'Jinsingizni kiriting: Male yoki Female' },
  { key: 'username', prompt: 'Login uchun username kiriting:' },
  { key: 'password', prompt: 'Login uchun parol kiriting:' },
  { key: 'school_name', prompt: 'Maktab nomini kiriting:' },
  { key: 'school_class', prompt: 'Maktab sinfingizni kiriting:' },
];

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function cleanText(text) {
  return String(text || '').trim();
}

function normalizePhone(value) {
  return String(value || '').replace(/[^\d+]/g, '');
}

function parseDateInput(value) {
  const text = cleanText(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    year < 1900 ||
    year > new Date().getUTCFullYear()
  ) {
    return null;
  }
  return text;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toISOString().slice(0, 10);
}

function moneyOrNumber(value) {
  const num = Number(value || 0);
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

function moneyText(value, currency = 'UZS') {
  return `${Number(value || 0).toLocaleString('en-US')} ${currency || 'UZS'}`;
}

async function telegram(method, payload) {
  const response = await fetch(`${apiBase}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!data.ok) throw new Error(data.description || `Telegram ${method} failed`);
  return data.result;
}

async function sendMessage(chatId, text, options = {}) {
  return telegram('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    ...options,
  });
}

async function answerCallbackQuery(callbackQueryId) {
  return telegram('answerCallbackQuery', { callback_query_id: callbackQueryId });
}

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_student_registrations (
      registration_id SERIAL PRIMARY KEY,
      telegram_user_id BIGINT NOT NULL,
      telegram_chat_id BIGINT NOT NULL,
      telegram_username VARCHAR(100),
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      phone VARCHAR(30),
      date_of_birth DATE,
      parent_name VARCHAR(200),
      parent_phone VARCHAR(30),
      gender VARCHAR(20),
      username VARCHAR(100),
      password_hash VARCHAR(255),
      school_name VARCHAR(200),
      school_class VARCHAR(50),
      center_id INT,
      class_label VARCHAR(100) NOT NULL DEFAULT 'Unassigned',
      status VARCHAR(30) NOT NULL DEFAULT 'Pending',
      converted_student_id INT,
      converted_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE telegram_student_registrations
      ADD COLUMN IF NOT EXISTS converted_student_id INT,
      ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP;

    CREATE INDEX IF NOT EXISTS idx_telegram_student_registrations_chat
      ON telegram_student_registrations(telegram_chat_id);
    CREATE INDEX IF NOT EXISTS idx_telegram_student_registrations_status
      ON telegram_student_registrations(status);
  `);
}

async function saveRegistration(from, chatId, data) {
  const centerId = Number(process.env.BOT_DEFAULT_CENTER_ID || 1);
  const classLabel = process.env.BOT_REGISTRATION_CLASS_LABEL || 'Unassigned';
  const values = [
    from.id,
    chatId,
    from.username || null,
    data.first_name,
    data.last_name,
    data.phone || null,
    data.date_of_birth || null,
    data.parent_name || null,
    data.parent_phone || null,
    data.gender || null,
    data.username || null,
    data.password ? hashPassword(data.password) : null,
    data.school_name || null,
    data.school_class || null,
    centerId,
    classLabel,
  ];
  const result = await pool.query(
    `INSERT INTO telegram_student_registrations (
       telegram_user_id,
       telegram_chat_id,
       telegram_username,
       first_name,
       last_name,
       phone,
       date_of_birth,
       parent_name,
       parent_phone,
       gender,
       username,
       password_hash,
       school_name,
       school_class,
       center_id,
       class_label
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING registration_id`,
    values
  );
  return result.rows[0];
}

async function isUsernameTaken(username) {
  const value = cleanText(username).toLowerCase();
  if (!value) return false;
  const result = await pool.query(
    `SELECT 1
     FROM students
     WHERE LOWER(TRIM(username)) = $1
       AND deleted_at IS NULL
     UNION ALL
     SELECT 1
     FROM telegram_student_registrations
     WHERE LOWER(TRIM(username)) = $1
       AND status IN ('Pending', 'Imported')
     LIMIT 1`,
    [value]
  );
  return result.rowCount > 0;
}

async function isPhoneTaken(phone) {
  const value = normalizePhone(phone);
  if (!value) return false;
  const result = await pool.query(
    `SELECT 1
     FROM students
     WHERE REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9+]', '', 'g') = $1
       AND deleted_at IS NULL
     UNION ALL
     SELECT 1
     FROM telegram_student_registrations
     WHERE REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9+]', '', 'g') = $1
       AND status IN ('Pending', 'Imported')
     LIMIT 1`,
    [value]
  );
  return result.rowCount > 0;
}

async function authenticate(username, password) {
  const result = await pool.query(
    `SELECT s.student_id, s.center_id, s.enrollment_number, s.first_name, s.last_name, s.username, s.class_id, s.teacher_id, s.coins
     FROM students s
     WHERE s.username = $1
       AND s.password_hash = $2
       AND s.status = 'Active'
       AND s.deleted_at IS NULL
     LIMIT 1`,
    [username, hashPassword(password)]
  );
  return result.rows[0] || null;
}

async function getStudentClasses(session) {
  const result = await pool.query(
    `SELECT DISTINCT
       s.student_id,
       s.status,
       s.deleted_at,
       c.class_id,
       c.class_name,
       c.class_code,
       c.level,
       t.first_name AS teacher_first_name,
       t.last_name AS teacher_last_name
     FROM students s
     JOIN classes c ON c.class_id = s.class_id
     LEFT JOIN teachers t ON t.teacher_id = s.teacher_id
     WHERE (s.student_id = $1 OR s.enrollment_number = $2 OR s.username = $3)
       AND (s.deleted_at IS NULL OR s.status = 'Transferred')
       AND c.deleted_at IS NULL
     ORDER BY c.class_name`,
    [session.student_id, session.enrollment_number, session.username]
  );
  return result.rows;
}

async function getClassPerformance(studentId, classId) {
  const [studentRes, gradesRes, attendanceRes, coinsRes] = await Promise.all([
    pool.query(
      `SELECT s.first_name, s.last_name, s.coins, c.class_name, c.class_code
       FROM students s
       JOIN classes c ON c.class_id = s.class_id
       WHERE s.student_id = $1 AND c.class_id = $2`,
      [studentId, classId]
    ),
    pool.query(
      `SELECT subject, marks_obtained, total_marks, percentage, grade_letter, attendance_score, homework_score, activity_score, created_at
       FROM grades
       WHERE student_id = $1 AND class_id = $2
       ORDER BY COALESCE(updated_at, created_at) DESC
       LIMIT 5`,
      [studentId, classId]
    ),
    pool.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'Present')::int AS present,
         COUNT(*) FILTER (WHERE status = 'Late')::int AS late,
         COUNT(*) FILTER (WHERE status::text ILIKE 'Absent%')::int AS absent
       FROM attendance
       WHERE student_id = $1 AND class_id = $2`,
      [studentId, classId]
    ),
    pool.query(
      `SELECT COALESCE(SUM(delta), 0)::int AS class_coins
       FROM student_coin_transactions
       WHERE student_id = $1
         AND (
           source_type = 'lesson_session'
           OR reason ILIKE '%Academic performance%'
           OR reason ILIKE '%Grade awarded%'
         )`,
      [studentId]
    ),
  ]);

  const grades = gradesRes.rows;
  const avg = grades.length
    ? grades.reduce((sum, grade) => sum + Number(grade.percentage || 0), 0) / grades.length
    : 0;

  return {
    student: studentRes.rows[0] || null,
    grades,
    avg,
    attendance: attendanceRes.rows[0] || { total: 0, present: 0, late: 0, absent: 0 },
    classCoins: Number(coinsRes.rows[0]?.class_coins || 0),
  };
}

async function getClassRankSummary(centerId, classId, studentId) {
  const result = await pool.query(
    `WITH points AS (
       SELECT student_id, COALESCE(SUM(marks_obtained), 0)::numeric AS points
       FROM grades
       WHERE center_id = $1 AND class_id = $2
       GROUP BY student_id
     ),
     ranked AS (
       SELECT
         s.student_id,
         s.coins,
         COALESCE(p.points, 0) AS points,
         RANK() OVER (
           ORDER BY COALESCE(s.coins, 0) DESC,
                    COALESCE(p.points, 0) DESC,
                    s.student_id ASC
         )::int AS rank,
         COUNT(*) OVER ()::int AS total_students
       FROM students s
       LEFT JOIN points p ON p.student_id = s.student_id
       WHERE s.center_id = $1
         AND s.class_id = $2
         AND s.deleted_at IS NULL
     )
     SELECT * FROM ranked WHERE student_id = $3`,
    [centerId, classId, studentId]
  );
  return result.rows[0] || null;
}

async function getCenterRankSummary(centerId, studentId) {
  const result = await pool.query(
    `WITH points AS (
       SELECT student_id, COALESCE(SUM(marks_obtained), 0)::numeric AS points
       FROM grades
       WHERE center_id = $1
       GROUP BY student_id
     ),
     ranked AS (
       SELECT
         s.student_id,
         c.class_name,
         s.coins,
         COALESCE(p.points, 0) AS points,
         RANK() OVER (
           ORDER BY COALESCE(s.coins, 0) DESC,
                    COALESCE(p.points, 0) DESC,
                    s.student_id ASC
         )::int AS rank,
         COUNT(*) OVER ()::int AS total_students
       FROM students s
       LEFT JOIN classes c ON c.class_id = s.class_id
       LEFT JOIN points p ON p.student_id = s.student_id
       WHERE s.center_id = $1
         AND s.deleted_at IS NULL
     )
     SELECT * FROM ranked WHERE student_id = $2`,
    [centerId, studentId]
  );
  return result.rows[0] || null;
}

async function getStudentResults(studentId, page) {
  const safePage = Math.max(1, Number(page || 1));
  const offset = (safePage - 1) * RESULTS_PAGE_SIZE;
  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT
         g.subject,
         g.marks_obtained,
         g.total_marks,
         g.percentage,
         g.attendance_score,
         g.homework_score,
         g.activity_score,
         g.total_daily_coin,
         se.session_date,
         se.start_time,
         c.class_name
       FROM grades g
       LEFT JOIN sessions se ON se.session_id = g.session_id
       LEFT JOIN classes c ON c.class_id = g.class_id
       WHERE g.student_id = $1
       ORDER BY se.session_date DESC NULLS LAST, se.start_time DESC NULLS LAST, g.grade_id DESC
       LIMIT $2 OFFSET $3`,
      [studentId, RESULTS_PAGE_SIZE, offset]
    ),
    pool.query('SELECT COUNT(*)::int AS total FROM grades WHERE student_id = $1', [studentId]),
  ]);
  const total = Number(count.rows[0]?.total || 0);
  return {
    rows: rows.rows,
    page: safePage,
    total,
    totalPages: Math.max(1, Math.ceil(total / RESULTS_PAGE_SIZE)),
  };
}

async function getStudentPayments(studentId, centerId, page = 1) {
  const safePage = Math.max(1, Number(page || 1));
  const limit = RESULTS_PAGE_SIZE;
  const offset = (safePage - 1) * limit;
  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT
         payment_id,
         payment_date,
         amount,
         currency,
         payment_method,
         payment_status,
         payment_type,
         receipt_number,
         final_amount,
         discount_amount,
         is_complete
       FROM payments
       WHERE student_id = $1
         AND center_id = $2
         AND deleted_at IS NULL
       ORDER BY payment_date DESC, payment_id DESC
       LIMIT $3 OFFSET $4`,
      [studentId, centerId, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total
       FROM payments
       WHERE student_id = $1
         AND center_id = $2
         AND deleted_at IS NULL`,
      [studentId, centerId]
    ),
  ]);
  const total = Number(count.rows[0]?.total || 0);
  return {
    rows: rows.rows,
    page: safePage,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

async function getLastSessionDetails(studentId, classId) {
  const sessionResult = await pool.query(
    `SELECT se.*, c.class_name, c.class_code
     FROM sessions se
     JOIN classes c ON c.class_id = se.class_id
     WHERE se.class_id = $1
       AND se.deleted_at IS NULL
       AND se.session_date <= CURRENT_DATE
     ORDER BY se.session_date DESC, se.start_time DESC
     LIMIT 1`,
    [classId]
  );
  const lesson = sessionResult.rows[0];
  if (!lesson) return null;

  const [gradeRes, attendanceRes, coinsRes] = await Promise.all([
    pool.query(
      `SELECT subject, marks_obtained, total_marks, percentage, attendance_score, homework_score, activity_score, base_coin, total_daily_coin, coin_comment
       FROM grades
       WHERE student_id = $1 AND session_id = $2
       ORDER BY grade_id DESC
       LIMIT 1`,
      [studentId, lesson.session_id]
    ),
    pool.query(
      `SELECT status, remarks
       FROM attendance
       WHERE student_id = $1 AND session_id = $2
       ORDER BY attendance_id DESC
       LIMIT 1`,
      [studentId, lesson.session_id]
    ),
    pool.query(
      `SELECT delta, reason
       FROM student_coin_transactions
       WHERE student_id = $1 AND source_type = 'lesson_session' AND source_id = $2
       ORDER BY transaction_id DESC
       LIMIT 1`,
      [studentId, lesson.session_id]
    ),
  ]);

  return {
    lesson,
    grade: gradeRes.rows[0] || null,
    attendance: attendanceRes.rows[0] || null,
    coins: coinsRes.rows[0] || null,
  };
}

function classKeyboard(classes) {
  return {
    inline_keyboard: classes.map((row) => [
      {
        text: `${row.class_name}${row.status === 'Transferred' ? ' (transferred)' : ''}`,
        callback_data: `class:${row.student_id}:${row.class_id}`,
      },
    ]),
  };
}

function rankMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "Guruh bo'yicha", callback_data: 'rank:class' }],
      [{ text: "Markaz bo'yicha", callback_data: 'rank:center' }],
    ],
  };
}

function resultsKeyboard(page, totalPages) {
  const buttons = [];
  if (page > 1) buttons.push({ text: 'Oldingi', callback_data: `results:${page - 1}` });
  if (page < totalPages) buttons.push({ text: 'Keyingi', callback_data: `results:${page + 1}` });
  return buttons.length ? { inline_keyboard: [buttons] } : undefined;
}

function paymentsKeyboard(page, totalPages) {
  const buttons = [];
  if (page > 1) buttons.push({ text: 'Oldingi', callback_data: `payments:${page - 1}` });
  if (page < totalPages) buttons.push({ text: 'Keyingi', callback_data: `payments:${page + 1}` });
  return buttons.length ? { inline_keyboard: [buttons] } : undefined;
}

function performanceText(row, stats) {
  const studentName = stats.student
    ? `${stats.student.first_name} ${stats.student.last_name}`
    : 'Student';
  const recent = stats.grades.length
    ? stats.grades
        .map((grade) => {
          const subject = grade.subject || 'Lesson';
          return `• ${subject}: ${moneyOrNumber(grade.marks_obtained)}/${moneyOrNumber(grade.total_marks)} (${moneyOrNumber(grade.percentage)}%)`;
        })
        .join('\n')
    : 'No grades yet.';

  return [
    `<b>${row.class_name}</b>`,
    `${studentName}`,
    '',
    `O'rtacha natija: ${stats.avg ? `${stats.avg.toFixed(1)}%` : '-'}`,
    `Davomat: ${stats.attendance.present || 0} present, ${stats.attendance.late || 0} late, ${stats.attendance.absent || 0} absent`,
    `Jami coins: ${stats.student?.coins ?? 0}`,
    `Dars coins tarixi: ${stats.classCoins}`,
    '',
    '<b>Oxirgi baholar:</b>',
    recent,
  ].join('\n');
}

function lastSessionText(details) {
  const { lesson, grade, attendance, coins } = details;
  const lines = [
    `<b>Oxirgi dars</b>`,
    `<b>${lesson.class_name}</b>`,
    `Sana: ${formatDate(lesson.session_date)}`,
    `Vaqt: ${lesson.start_time || '-'} - ${lesson.end_time || '-'}`,
    '',
    `<b>Davomat</b>: ${attendance?.status || '-'}`,
  ];

  if (grade) {
    lines.push(
      '',
      '<b>Ballar</b>',
      `Davomat: ${grade.attendance_score ?? 0}`,
      `Uy vazifa: ${grade.homework_score ?? 0}`,
      `Faollik: ${grade.activity_score ?? 0}`,
      `Jami: ${moneyOrNumber(grade.marks_obtained)}/${moneyOrNumber(grade.total_marks)} (${moneyOrNumber(grade.percentage)}%)`
    );
  } else {
    lines.push('', '<b>Ballar</b>: -');
  }

  lines.push('', `<b>Coins</b>: ${coins ? `${coins.delta} (${coins.reason || 'lesson'})` : '-'}`);
  return lines.join('\n');
}

function rankSummaryText(title, row) {
  if (!row) return [`<b>${title}</b>`, '', "Hozircha reyting ma'lumoti yo'q."].join('\n');
  const suffix = row.class_name ? `\nGuruh: ${row.class_name}` : '';
  return [
    `<b>${title}</b>`,
    '',
    `Siz: <b>${row.rank}-o'rin</b>`,
    `Jami: ${row.total_students} ta o'quvchi`,
    `Coins: ${row.coins || 0}`,
    `Points: ${moneyOrNumber(row.points)}`,
    suffix.trim(),
  ].filter(Boolean).join('\n');
}

function resultsText(results) {
  if (!results.rows.length) return ["<b>Natijalar</b>", '', "Hozircha natija yo'q."].join('\n');
  const rows = results.rows.map((row, index) => {
    const number = (results.page - 1) * RESULTS_PAGE_SIZE + index + 1;
    const subject = row.subject || row.class_name || 'Dars';
    return [
      `${number}. <b>${subject}</b>`,
      `Sana: ${formatDate(row.session_date)} ${row.start_time || ''}`.trim(),
      `Ball: ${moneyOrNumber(row.marks_obtained)}/${moneyOrNumber(row.total_marks)} (${moneyOrNumber(row.percentage)}%)`,
      `Davomat/Uy vazifa/Faollik: ${row.attendance_score ?? 0}/${row.homework_score ?? 0}/${row.activity_score ?? 0}`,
      `Coins: ${row.total_daily_coin ?? 0}`,
    ].join('\n');
  });
  return [`<b>Natijalar</b>`, `Sahifa: ${results.page}/${results.totalPages}`, '', ...rows].join('\n\n');
}

function paymentsText(payments) {
  if (!payments.rows.length) return ["<b>To'lovlar</b>", '', "Hozircha to'lov yozuvlari topilmadi."].join('\n');
  const rows = payments.rows.map((row, index) => {
    const number = (payments.page - 1) * RESULTS_PAGE_SIZE + index + 1;
    const paid = row.final_amount == null ? row.amount : row.final_amount;
    const discount = Number(row.discount_amount || 0);
    return [
      `${number}. <b>${formatDate(row.payment_date)}</b>`,
      `Miqdor: ${moneyText(paid, row.currency)}`,
      discount > 0 ? `Chegirma: ${moneyText(discount, row.currency)}` : '',
      `Holat: ${row.payment_status || '-'}`,
      row.receipt_number ? `Kvitansiya: ${row.receipt_number}` : '',
    ].filter(Boolean).join('\n');
  });
  return [`<b>To'lovlar</b>`, `Sahifa: ${payments.page}/${payments.totalPages}`, '', ...rows].join('\n\n');
}

async function startRegistration(chatId) {
  userState.set(chatId, { flow: 'register', step: 0, data: {} });
  await sendMessage(chatId, REGISTER_STEPS[0].prompt);
}

async function handleRegisterStep(message, state) {
  const chatId = message.chat.id;
  const text = cleanText(message.text);
  const step = REGISTER_STEPS[state.step];
  if (!step) {
    userState.delete(chatId);
    await sendMessage(chatId, 'Ro‘yxatdan o‘tish holati eskirgan. Qaytadan boshlang.', { reply_markup: MAIN_KEYBOARD });
    return;
  }
  if (!text) {
    await sendMessage(chatId, step.prompt);
    return;
  }

  if (step.key === 'phone') {
    const normalized = normalizePhone(text);
    if (await isPhoneTaken(normalized)) {
      await sendMessage(chatId, 'Bu telefon raqam allaqachon ro‘yxatdan o‘tgan. Boshqa telefon raqam kiriting:');
      return;
    }
    state.data[step.key] = normalized;
    state.step += 1;
  } else if (step.key === 'date_of_birth') {
    const parsedDate = parseDateInput(text);
    if (!parsedDate) {
      await sendMessage(chatId, "Sana noto‘g‘ri. Iltimos YYYY-MM-DD formatida kiriting. Masalan: 2008-05-21");
      return;
    }
    state.data[step.key] = parsedDate;
    state.step += 1;
  } else if (step.key === 'username') {
    if (await isUsernameTaken(text)) {
      await sendMessage(chatId, 'Bu username band. Boshqa username kiriting:');
      return;
    }
    state.data[step.key] = text;
    state.step += 1;
  } else {
    state.data[step.key] = text;
    state.step += 1;
  }

  if (state.step < REGISTER_STEPS.length) {
    userState.set(chatId, state);
    await sendMessage(chatId, REGISTER_STEPS[state.step].prompt);
    return;
  }

  try {
    const saved = await saveRegistration(message.from, chatId, state.data);
    userState.delete(chatId);
    await sendMessage(
      chatId,
      `Ro'yhatdan o'tish so'rovi saqlandi.\nID: ${saved.registration_id}\nGuruh: ${process.env.BOT_REGISTRATION_CLASS_LABEL || 'Unassigned'}\nStatus: Pending`,
      { reply_markup: MAIN_KEYBOARD }
    );
  } catch (error) {
    console.error('Registration save failed:', error);
    userState.delete(chatId);
    await sendMessage(chatId, 'Ro‘yxatdan o‘tishni saqlashda xatolik yuz berdi. Iltimos, qaytadan urinib ko‘ring.', {
      reply_markup: MAIN_KEYBOARD,
    });
  }
}

async function startLogin(chatId) {
  userState.set(chatId, { flow: 'login', step: 'username', data: {} });
  await sendMessage(chatId, ["<b>Kirish</b>", '', 'Username kiriting:'].join('\n'));
}

async function handleLoginStep(message, state) {
  const chatId = message.chat.id;
  const text = cleanText(message.text);
  if (!text) return;

  if (state.step === 'username') {
    state.data.username = text;
    state.step = 'password';
    userState.set(chatId, state);
    await sendMessage(chatId, ["<b>Kirish</b>", '', 'Parol kiriting:'].join('\n'));
    return;
  }

  const student = await authenticate(state.data.username, text);
  userState.delete(chatId);
  if (!student) {
    await sendMessage(chatId, ["<b>Kirish amalga oshmadi</b>", '', "Username yoki parol noto'g'ri."].join('\n'), {
      reply_markup: MAIN_KEYBOARD,
    });
    return;
  }

  sessions.set(chatId, { ...student, selectedClassId: student.class_id, selectedStudentId: student.student_id });
  await sendMessage(chatId, [`<b>Xush kelibsiz</b>`, `${student.first_name} ${student.last_name}`, '', "Kerakli bo'limni tanlang."].join('\n'), {
    reply_markup: AUTH_KEYBOARD,
  });
}

async function showClasses(chatId) {
  const session = sessions.get(chatId);
  if (!session) {
    await sendMessage(chatId, 'Avval Kirish tugmasi orqali tizimga kiring.', { reply_markup: MAIN_KEYBOARD });
    return;
  }

  const classes = await getStudentClasses(session);
  if (classes.length === 0) {
    await sendMessage(chatId, 'Sizga biriktirilgan guruh topilmadi.', { reply_markup: AUTH_KEYBOARD });
    return;
  }

  await sendMessage(chatId, ["<b>Darslar</b>", '', 'Guruhni tanlang:'].join('\n'), { reply_markup: classKeyboard(classes) });
}

async function showLastSession(chatId) {
  const session = sessions.get(chatId);
  if (!session) {
    await sendMessage(chatId, 'Avval Kirish tugmasi orqali tizimga kiring.', { reply_markup: MAIN_KEYBOARD });
    return;
  }

  let classId = session.selectedClassId;
  let studentId = session.selectedStudentId || session.student_id;

  if (!classId) {
    const classes = await getStudentClasses(session);
    const latest = classes[0];
    if (!latest) {
      await sendMessage(chatId, 'Guruh topilmadi.', { reply_markup: AUTH_KEYBOARD });
      return;
    }
    classId = latest.class_id;
    studentId = latest.student_id;
  }

  const details = await getLastSessionDetails(studentId, classId);
  if (!details) {
    await sendMessage(chatId, "Bu guruh uchun oxirgi dars topilmadi.", { reply_markup: AUTH_KEYBOARD });
    return;
  }
  await sendMessage(chatId, lastSessionText(details), { reply_markup: AUTH_KEYBOARD });
}

async function showRankMenu(chatId) {
  const session = sessions.get(chatId);
  if (!session) {
    await sendMessage(chatId, 'Avval Kirish tugmasi orqali tizimga kiring.', { reply_markup: MAIN_KEYBOARD });
    return;
  }
  await sendMessage(chatId, ["<b>O'rin</b>", '', "Reyting turini tanlang:"].join('\n'), { reply_markup: rankMenuKeyboard() });
}

async function showRank(chatId, scope) {
  const session = sessions.get(chatId);
  if (!session) {
    await sendMessage(chatId, 'Avval Kirish tugmasi orqali tizimga kiring.', { reply_markup: MAIN_KEYBOARD });
    return;
  }

  if (scope === 'center') {
    const row = await getCenterRankSummary(session.center_id, session.selectedStudentId || session.student_id);
    await sendMessage(chatId, rankSummaryText("Markaz bo'yicha reyting", row), { reply_markup: AUTH_KEYBOARD });
    return;
  }

  const classId = session.selectedClassId || session.class_id;
  if (!classId) {
    await sendMessage(chatId, "Avval Darslar bo'limidan guruhni tanlang.", { reply_markup: AUTH_KEYBOARD });
    return;
  }
  const row = await getClassRankSummary(session.center_id, classId, session.selectedStudentId || session.student_id);
  await sendMessage(chatId, rankSummaryText("Guruh bo'yicha reyting", row), {
    reply_markup: AUTH_KEYBOARD,
  });
}

async function showResults(chatId, page = 1) {
  const session = sessions.get(chatId);
  if (!session) {
    await sendMessage(chatId, 'Avval Kirish tugmasi orqali tizimga kiring.', { reply_markup: MAIN_KEYBOARD });
    return;
  }

  const results = await getStudentResults(session.selectedStudentId || session.student_id, page);
  const keyboard = resultsKeyboard(results.page, results.totalPages);
  await sendMessage(chatId, resultsText(results), { reply_markup: keyboard || AUTH_KEYBOARD });
}

async function showPayments(chatId, page = 1) {
  const session = sessions.get(chatId);
  if (!session) {
    await sendMessage(chatId, 'Avval Kirish tugmasi orqali tizimga kiring.', { reply_markup: MAIN_KEYBOARD });
    return;
  }

  const payments = await getStudentPayments(session.selectedStudentId || session.student_id, session.center_id, page);
  const keyboard = paymentsKeyboard(payments.page, payments.totalPages);
  await sendMessage(chatId, paymentsText(payments), { reply_markup: keyboard || AUTH_KEYBOARD });
}

async function handleMessage(message) {
  const chatId = message.chat.id;
  const text = cleanText(message.text);
  const state = userState.get(chatId);

  if (text === '/start') {
    userState.delete(chatId);
    await sendMessage(chatId, ['<b>Assalomu alaykum</b>', '', 'Kerakli bo‘limni tanlang:'].join('\n'), {
      reply_markup: MAIN_KEYBOARD,
    });
    return;
  }

  if (state?.flow === 'register') {
    await handleRegisterStep(message, state);
    return;
  }

  if (state?.flow === 'login') {
    await handleLoginStep(message, state);
    return;
  }

  if (text === "Ro'yhatdan o'tish" || text === "Ro’yhatdan o‘tish" || text === "Ro'yxatdan o'tish") {
    await startRegistration(chatId);
    return;
  }

  if (text === 'Kirish') {
    await startLogin(chatId);
    return;
  }

  if (text === 'Darslar') {
    await showClasses(chatId);
    return;
  }

  if (text === 'Oxirgi dars') {
    await showLastSession(chatId);
    return;
  }

  if (text === "O'rin" || text === "O‘rin") {
    await showRankMenu(chatId);
    return;
  }

  if (text === "To'lovlar" || text === "To‘lovlar") {
    await showPayments(chatId);
    return;
  }

  if (text === 'Natijalar') {
    await showResults(chatId);
    return;
  }

  if (text === 'Chiqish') {
    sessions.delete(chatId);
    userState.delete(chatId);
    await sendMessage(chatId, 'Tizimdan chiqdingiz.', { reply_markup: MAIN_KEYBOARD });
    return;
  }

  await sendMessage(chatId, 'Iltimos, menyudan tanlang.', {
    reply_markup: sessions.has(chatId) ? AUTH_KEYBOARD : MAIN_KEYBOARD,
  });
}

async function handleCallback(callbackQuery) {
  await answerCallbackQuery(callbackQuery.id);
  const chatId = callbackQuery.message.chat.id;
  const session = sessions.get(chatId);
  if (!session) {
    await sendMessage(chatId, 'Avval Kirish tugmasi orqali tizimga kiring.', { reply_markup: MAIN_KEYBOARD });
    return;
  }

  const [kind, studentIdRaw, classIdRaw] = String(callbackQuery.data || '').split(':');
  if (kind === 'rank') {
    await showRank(chatId, studentIdRaw);
    return;
  }
  if (kind === 'results') {
    await showResults(chatId, Number(studentIdRaw || 1));
    return;
  }
  if (kind === 'payments') {
    await showPayments(chatId, Number(studentIdRaw || 1));
    return;
  }
  if (kind !== 'class') return;

  const studentId = Number(studentIdRaw);
  const classId = Number(classIdRaw);
  const classes = await getStudentClasses(session);
  const selected = classes.find((row) => Number(row.student_id) === studentId && Number(row.class_id) === classId);
  if (!selected) {
    await sendMessage(chatId, 'Bu guruhga ruxsat topilmadi.', { reply_markup: AUTH_KEYBOARD });
    return;
  }

  session.selectedClassId = classId;
  session.selectedStudentId = studentId;
  sessions.set(chatId, session);

  const stats = await getClassPerformance(studentId, classId);
  await sendMessage(chatId, performanceText(selected, stats), { reply_markup: AUTH_KEYBOARD });
}

async function poll() {
  let offset = 0;
  while (true) {
    try {
      const updates = await telegram('getUpdates', {
        offset,
        timeout: 30,
        allowed_updates: ['message', 'callback_query'],
      });

      for (const update of updates) {
        offset = update.update_id + 1;
        try {
          if (update.message) await handleMessage(update.message);
          if (update.callback_query) await handleCallback(update.callback_query);
        } catch (error) {
          const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
          console.error('Update handling failed:', error);
          if (chatId) await sendMessage(chatId, 'Xatolik yuz berdi. Keyinroq qayta urinib ko‘ring.');
        }
      }
    } catch (error) {
      console.error('Polling failed:', error.message || error);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

async function main() {
  await initDb();
  console.log('Telegram bot started.');
  await poll();
}

process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
