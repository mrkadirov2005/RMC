const pool = require('../../db/pool');
const studentService = require('../students/services/student.service');

type BotStep =
  | 'idle'
  | 'login_username'
  | 'login_password'
  | 'register_name'
  | 'register_school'
  | 'register_school_class'
  | 'register_age'
  | 'register_subject'
  | 'register_phone';

interface BotState {
  step: BotStep;
  data: Record<string, any>;
  student?: any;
}

const token = String(process.env.TELEGRAM_BOT_TOKEN || '');
const apiBase = token ? `https://api.telegram.org/bot${token}` : '';
const states = new Map<number, BotState>();
let running = false;
let offset = 0;

const mainKeyboard = {
  keyboard: [['Kirish'], ["Ro'yhatdan o'tish"]],
  resize_keyboard: true,
};

const studentKeyboard = {
  keyboard: [['Profil', 'Jadval'], ['Natija'], ['Chiqish']],
  resize_keyboard: true,
};

const getState = (chatId: number): BotState => {
  const existing = states.get(chatId);
  if (existing) return existing;
  const next = { step: 'idle' as BotStep, data: {} };
  states.set(chatId, next);
  return next;
};

const postTelegram = async (method: string, payload: Record<string, any>) => {
  const response = await fetch(`${apiBase}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Telegram ${method} failed: ${response.status} ${text}`);
  }
  return response.json();
};

const sendMessage = (chatId: number, text: string, replyMarkup?: Record<string, any>) =>
  postTelegram('sendMessage', {
    chat_id: chatId,
    text,
    reply_markup: replyMarkup,
  });

const createStudentSpecialId = () => {
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID().replace(/-/g, '');
  return `${Date.now()}${Math.floor(Math.random() * 1000000)}`;
};

const compact = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, ' ');

const normalizeCommand = (value: string) => compact(value).toLowerCase().replace(/[‘’`]/g, "'");

const slug = (value: unknown) =>
  compact(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '') || 'student';

const splitName = (fullName: string) => {
  const parts = compact(fullName).split(' ').filter(Boolean);
  return {
    first_name: parts[0] || fullName,
    last_name: parts.slice(1).join(' '),
  };
};

const createUsername = async (fullName: string) => {
  const base = slug(fullName);
  let username = base;
  let suffix = 2;
  while (true) {
    const result = await pool.query('SELECT student_id FROM students WHERE username = $1', [username]);
    if (result.rowCount === 0) return username;
    username = `${base}${suffix}`;
    suffix += 1;
  }
};

const getBotCenterId = async () => {
  const configured = Number(process.env.TELEGRAM_BOT_CENTER_ID || 0);
  if (Number.isFinite(configured) && configured > 0) return configured;
  const result = await pool.query('SELECT center_id FROM edu_centers ORDER BY center_id LIMIT 1');
  return Number(result.rows[0]?.center_id || 0);
};

const getAvailableSubjects = async () => {
  const centerId = await getBotCenterId();
  const params: any[] = [];
  let query = `
    SELECT DISTINCT s.subject_name
    FROM subjects s
  `;
  if (centerId) {
    params.push(centerId);
    query += ' WHERE s.center_id = $1';
  }
  query += ' ORDER BY s.subject_name LIMIT 24';
  const result = await pool.query(query, params);
  return result.rows.map((row: any) => compact(row.subject_name)).filter(Boolean);
};

const getOrCreateOnboardingClass = async () => {
  const centerId = await getBotCenterId();
  if (!centerId) throw new Error('No CRM center found for Telegram onboarding.');

  const existing = await pool.query(
    `SELECT * FROM classes WHERE center_id = $1 AND LOWER(TRIM(class_name)) = 'onboarding' ORDER BY class_id LIMIT 1`,
    [centerId]
  );
  if (existing.rows[0]) return existing.rows[0];

  const classCode = `ONBOARDING-${centerId}`;
  const inserted = await pool.query(
    `INSERT INTO classes (center_id, class_name, class_code, capacity, payment_frequency)
     VALUES ($1, 'Onboarding', $2, 0, 'Monthly')
     ON CONFLICT (class_code) DO UPDATE SET class_name = EXCLUDED.class_name
     RETURNING *`,
    [centerId, classCode]
  );
  return inserted.rows[0];
};

const formatDate = (value: any) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
};

const getProfileText = (student: any) => [
  `Profil`,
  `Ism: ${student.first_name || ''} ${student.last_name || ''}`.trim(),
  `Username: ${student.username || '-'}`,
  `Sinf: ${student.class_name || '-'}`,
  `Maktab: ${student.school_name || '-'}`,
  `Telefon: ${student.phone || '-'}`,
  `Coins: ${Number(student.coins || 0)}`,
].join('\n');

const refreshStudent = async (studentId: number) => {
  const result = await pool.query(
    `SELECT s.*, c.class_name
     FROM students s
     LEFT JOIN classes c ON c.class_id = s.class_id
     WHERE s.student_id = $1`,
    [studentId]
  );
  return result.rows[0] || null;
};

const getScheduleText = async (student: any) => {
  if (!student?.class_id) return 'Sizga hali class biriktirilmagan.';
  const result = await pool.query(
    `SELECT s.session_date, s.start_time, s.end_time, c.class_name, t.first_name, t.last_name
     FROM sessions s
     LEFT JOIN classes c ON c.class_id = s.class_id
     LEFT JOIN teachers t ON t.teacher_id = s.teacher_id
     WHERE s.class_id = $1 AND s.session_date >= CURRENT_DATE
     ORDER BY s.session_date, s.start_time
     LIMIT 10`,
    [student.class_id]
  );
  if (result.rows.length === 0) return 'Yaqin kunlar uchun jadval topilmadi.';
  return [
    'Jadval',
    ...result.rows.map((row: any) => {
      const teacher = [row.first_name, row.last_name].filter(Boolean).join(' ') || '-';
      return `${formatDate(row.session_date)} ${row.start_time || ''}-${row.end_time || ''} | ${row.class_name || '-'} | ${teacher}`;
    }),
  ].join('\n');
};

const getResultText = async (student: any) => {
  const result = await pool.query(
    `SELECT g.*, s.session_date, s.start_time, c.class_name, t.first_name, t.last_name
     FROM grades g
     LEFT JOIN sessions s ON s.session_id = g.session_id
     LEFT JOIN classes c ON c.class_id = g.class_id
     LEFT JOIN teachers t ON t.teacher_id = g.teacher_id
     WHERE g.student_id = $1
     ORDER BY COALESCE(s.session_date, g.updated_at::date, g.created_at::date) DESC, g.grade_id DESC
     LIMIT 1`,
    [student.student_id]
  );
  const row = result.rows[0];
  if (!row) return 'Hali natija topilmadi.';
  const teacher = [row.first_name, row.last_name].filter(Boolean).join(' ') || '-';
  return [
    'Oxirgi natija',
    `Dars: ${row.subject || row.class_name || '-'}`,
    `Sana: ${formatDate(row.session_date || row.updated_at || row.created_at)} ${row.start_time || ''}`.trim(),
    `O'qituvchi: ${teacher}`,
    `Score: ${row.marks_obtained ?? '-'} / ${row.total_marks ?? '-'} (${row.percentage ?? '-'}%)`,
    `Coins: ${row.total_daily_coin ?? row.base_coin ?? 0}`,
  ].join('\n');
};

const createOnboardingStudent = async (data: Record<string, any>) => {
  const onboardingClass = await getOrCreateOnboardingClass();
  const specialId = createStudentSpecialId();
  const password = Math.floor(100000 + Math.random() * 900000).toString();
  const username = await createUsername(data.fullName);
  const name = splitName(data.fullName);
  const age = Number(data.age || 0);
  const year = age > 0 ? new Date().getFullYear() - age : null;

  const student = await studentService.createStudent({
    center_id: onboardingClass.center_id,
    enrollment_number: specialId,
    first_name: name.first_name,
    last_name: name.last_name,
    username,
    password,
    email: `temurbekschool${specialId}@gmail.com`,
    phone: data.phone,
    date_of_birth: year ? `${year}-01-01` : null,
    parent_name: `Telegram onboarding subject: ${data.subject}`,
    parent_phone: null,
    gender: 'Other',
    status: 'Active',
    teacher_id: onboardingClass.teacher_id || null,
    class_id: onboardingClass.class_id,
    school_name: data.school,
    school_class: data.schoolClass,
  });

  return { student, username, password, className: onboardingClass.class_name };
};

const handleText = async (chatId: number, text: string, message: any) => {
  const state = getState(chatId);
  const normalized = compact(text);
  const command = normalizeCommand(text);

  if (command === '/start' || command === 'chiqish') {
    states.set(chatId, { step: 'idle', data: {} });
    await sendMessage(chatId, 'Assalomu alaykum. Tanlang:', mainKeyboard);
    return;
  }

  if (state.student) {
    if (command === 'profil') {
      const student = await refreshStudent(state.student.student_id);
      if (student) state.student = student;
      await sendMessage(chatId, getProfileText(state.student), studentKeyboard);
      return;
    }
    if (command === 'jadval' || command === 'jadval(calendar)') {
      await sendMessage(chatId, await getScheduleText(state.student), studentKeyboard);
      return;
    }
    if (command === 'natija') {
      await sendMessage(chatId, await getResultText(state.student), studentKeyboard);
      return;
    }
    await sendMessage(chatId, 'Menyudan tanlang:', studentKeyboard);
    return;
  }

  if (command === 'kirish') {
    state.step = 'login_username';
    state.data = {};
    await sendMessage(chatId, 'Student username kiriting:');
    return;
  }

  if (["ro'yhatdan o'tish", "ro'yhatdan otish", "ro'yxatdan o'tish", "ro'yxatdan otish", 'royhatdan otish', 'royxatdan otish'].includes(command)) {
    state.step = 'register_name';
    state.data = {};
    await sendMessage(chatId, 'Ism va familiyangizni kiriting:');
    return;
  }

  if (state.step === 'login_username') {
    state.data.username = normalized;
    state.step = 'login_password';
    await sendMessage(chatId, 'Parolni kiriting:');
    return;
  }

  if (state.step === 'login_password') {
    const result = await studentService.authenticate(state.data.username, normalized);
    if (result.kind !== 'ok') {
      state.step = 'idle';
      state.data = {};
      await sendMessage(chatId, 'Username yoki parol xato.', mainKeyboard);
      return;
    }
    state.student = await refreshStudent(result.student.student_id);
    state.step = 'idle';
    state.data = {};
    await sendMessage(chatId, 'Kirish muvaffaqiyatli.', studentKeyboard);
    return;
  }

  if (state.step === 'register_name') {
    state.data.fullName = normalized;
    state.step = 'register_school';
    await sendMessage(chatId, 'Maktabingizni kiriting:');
    return;
  }

  if (state.step === 'register_school') {
    state.data.school = normalized;
    state.step = 'register_school_class';
    await sendMessage(chatId, 'Sinfingizni kiriting:');
    return;
  }

  if (state.step === 'register_school_class') {
    state.data.schoolClass = normalized;
    state.step = 'register_age';
    await sendMessage(chatId, 'Yoshingizni kiriting:');
    return;
  }

  if (state.step === 'register_age') {
    const age = Number(normalized);
    if (!Number.isFinite(age) || age <= 0 || age > 100) {
      await sendMessage(chatId, 'Yoshni raqam bilan kiriting.');
      return;
    }
    state.data.age = age;
    state.step = 'register_subject';
    const subjects = await getAvailableSubjects();
    if (subjects.length === 0) {
      await sendMessage(chatId, 'Hozircha CRMda subject topilmadi. Keyinroq urinib ko\'ring.', mainKeyboard);
      states.set(chatId, { step: 'idle', data: {} });
      return;
    }
    await sendMessage(chatId, 'Qaysi subject?', {
      keyboard: subjects.map((subject: string) => [subject]),
      resize_keyboard: true,
    });
    return;
  }

  if (state.step === 'register_subject') {
    const subjects = await getAvailableSubjects();
    if (!subjects.some((subject: string) => subject.toLowerCase() === normalized.toLowerCase())) {
      await sendMessage(chatId, 'Iltimos, ro\'yxatdagi subjectlardan birini tanlang.');
      return;
    }
    state.data.subject = subjects.find((subject: string) => subject.toLowerCase() === normalized.toLowerCase()) || normalized;
    state.step = 'register_phone';
    await sendMessage(chatId, 'Telefon raqamingizni yuboring:', {
      keyboard: [[{ text: 'Telefon raqamni yuborish', request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    });
    return;
  }

  if (state.step === 'register_phone') {
    state.data.phone = message?.contact?.phone_number || normalized;
    const created = await createOnboardingStudent(state.data);
    states.set(chatId, { step: 'idle', data: {}, student: created.student });
    await sendMessage(
      chatId,
      [
        `Ro'yhatdan o'tdingiz.`,
        `Class: ${created.className}`,
        `Username: ${created.username}`,
        `Parol: ${created.password}`,
      ].join('\n'),
      studentKeyboard
    );
    return;
  }

  await sendMessage(chatId, 'Tanlang:', mainKeyboard);
};

const poll = async () => {
  while (running) {
    try {
      const response = await fetch(`${apiBase}/getUpdates?timeout=25&offset=${offset}`);
      const data = await response.json() as { ok: boolean; result?: any[] };
      if (!data.ok) throw new Error(JSON.stringify(data));

      for (const update of data.result || []) {
        offset = Math.max(offset, Number(update.update_id || 0) + 1);
        const message = update.message;
        const chatId = Number(message?.chat?.id || 0);
        if (!chatId) continue;
        const text = message?.contact?.phone_number || message?.text || '';
        await handleText(chatId, text, message).catch((error: any) => {
          console.error('[telegram-bot] message failed:', error?.message || error);
          return sendMessage(chatId, 'Xatolik yuz berdi. Qaytadan urinib ko\'ring.', mainKeyboard).catch(() => null);
        });
      }
    } catch (error: any) {
      console.error('[telegram-bot] polling failed:', error?.message || error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};

const startTelegramBot = () => {
  if (!token) {
    console.log('[telegram-bot] TELEGRAM_BOT_TOKEN is not set; bot disabled.');
    return;
  }
  if (process.env.TELEGRAM_BOT_ENABLED === 'false') {
    console.log('[telegram-bot] disabled by TELEGRAM_BOT_ENABLED=false.');
    return;
  }
  if (running) return;
  running = true;
  void poll();
  console.log('[telegram-bot] started.');
};

const stopTelegramBot = () => {
  running = false;
};

module.exports = {
  startTelegramBot,
  stopTelegramBot,
};

export {};
