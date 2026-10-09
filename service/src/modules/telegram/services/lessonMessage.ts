// The Telegram message a student (and their parent) gets after each lesson: the score and why,
// coins, and where they stand. Rankings follow the center's rules: say so if the student is in
// their group's top 5 or bottom 5 (otherwise nothing), and for the whole center either their
// top-5 place or "not yet - keep trying".

const STATUS_LABELS: Record<string, string> = {
  present: 'Vaqtida keldi',
  late: 'Kechikdi',
  'absent r': 'Sababli kelmadi',
  excused: 'Sababli kelmadi',
  absent: 'Kelmadi',
  'absent nr': 'Kelmadi',
};

// The default scoring labels in Uzbek; a label a center renamed is shown as they wrote it.
const OPTION_LABELS: Record<string, string> = {
  'on time': 'Vaqtida keldi',
  late: 'Kechikdi',
  excused: 'Sababli',
  absent: 'Kelmadi',
  excellent: "A'lo",
  good: 'Yaxshi',
  half: 'Yarmi bajarilgan',
  weak: 'Sust',
  none: 'Bajarilmagan',
  stellar: 'Yulduz o‘quvchi',
  'very active': 'Juda faol',
  little: 'Kam qatnashdi',
  'barely noticeable': 'Deyarli sezilmadi',
  average: "O'rtacha",
  'no activity': 'Faol emas',
};

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char] as string);

const uz = (label: unknown) => {
  const text = String(label || '').trim();
  return OPTION_LABELS[text.toLowerCase()] || text;
};

const formatDay = (value: unknown) => {
  const day = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? `${day.slice(8, 10)}.${day.slice(5, 7)}.${day.slice(0, 4)}` : day;
};

export interface LessonMessageInput {
  studentName: string;
  className: string;
  lessonDate: string;
  attendanceStatus?: string | null;
  attendanceScore?: number | null;
  reason?: string | null;
  homework?: { label: string; score: number } | null;
  activity?: { label: string; score: number } | null;
  pointsScore?: number | null;
  total: number;
  /** The most this lesson could score (attendance only is out of 40); defaults to 100. */
  maxScore?: number;
  grade: string;
  coinsDelta?: number | null;
  coinsBalance?: number | null;
  groupPlace?: number | null;
  groupSize?: number;
  inGroupBottomFive?: boolean;
  centerPlace?: number | null;
}

const buildLessonMessage = (input: LessonMessageInput) => {
  const lines = [
    `📘 <b>${escapeHtml(input.className)}</b> · ${formatDay(input.lessonDate)}`,
    `👤 ${escapeHtml(input.studentName)}`,
    '',
    `⭐️ <b>Ball: ${input.total}/${input.maxScore || 100}</b> (baho: ${input.grade})`,
  ];

  const status = String(input.attendanceStatus || '').trim().toLowerCase();
  if (status) {
    const score = input.attendanceScore != null ? ` — ${input.attendanceScore}` : '';
    lines.push(`• Davomat: ${STATUS_LABELS[status] || escapeHtml(input.attendanceStatus)}${score}`);
  }
  if (input.homework) lines.push(`• Uy vazifasi: ${escapeHtml(uz(input.homework.label))} — ${input.homework.score}`);
  if (input.activity) lines.push(`• Darsdagi faollik: ${escapeHtml(uz(input.activity.label))} — ${input.activity.score}`);
  if (input.pointsScore != null) lines.push(`• Dars bali: ${input.pointsScore}/100`);
  if (input.reason) lines.push(`📝 Izoh: ${escapeHtml(input.reason)}`);

  if (input.coinsDelta != null) {
    const sign = input.coinsDelta > 0 ? '+' : '';
    const balance = input.coinsBalance != null ? ` (jami: ${input.coinsBalance})` : '';
    lines.push('', `🪙 Coin: ${sign}${input.coinsDelta}${balance}`);
  }

  const standing: string[] = [];
  if (input.groupPlace && input.groupPlace <= 5) {
    standing.push(`🏆 Bu oy guruhda <b>${input.groupPlace}-o'rin</b>dasiz!`);
  } else if (input.inGroupBottomFive) {
    standing.push("⚠️ Bu oy guruhdagi eng past 5 talikdasiz. Ko'proq harakat qiling!");
  }
  standing.push(input.centerPlace && input.centerPlace <= 5
    ? `🌟 Markaz bo'yicha <b>${input.centerPlace}-o'rin</b>dasiz!`
    : "🎯 Markaz bo'yicha eng yaxshi 5 talikka hali kirmagansiz — harakat qiling!");
  lines.push('', ...standing);

  return lines.join('\n');
};

export interface ParentLessonMessageInput {
  parentName?: string | null;
  studentName: string;
  subject: string;
  lessonDate: string;
  attendanceStatus?: string | null;
  homework?: { label: string; score: number } | null;
  activity?: { label: string; score: number } | null;
  pointsScore?: number | null;
  total: number;
  maxScore?: number;
  grade: string;
  centerName?: string | null;
}

const ABSENT_STATUSES = new Set(['absent', 'absent nr', 'absent r', 'excused']);

/**
 * The formal message a parent gets after each lesson, addressed to them by name:
 * "Assalomu alaykum, Dilnoza Karimova! Bugun, 09.10.2026, farzandingiz Ali Valiyev Matematika
 * fanidan 79/100 ball to'pladi (baho: 4)." An absent child gets "darsga kelmadi" instead of a score.
 */
const buildParentLessonMessage = (input: ParentLessonMessageInput) => {
  const greeting = input.parentName ? `Assalomu alaykum, ${escapeHtml(input.parentName)}!` : 'Assalomu alaykum, hurmatli ota-ona!';
  const intro = `Bugun, ${formatDay(input.lessonDate)}, farzandingiz <b>${escapeHtml(input.studentName)}</b> ${escapeHtml(input.subject)} fanidan`;
  const status = String(input.attendanceStatus || '').trim().toLowerCase();
  const lines = [greeting, ''];

  if (ABSENT_STATUSES.has(status)) {
    const excused = status === 'absent r' || status === 'excused';
    lines.push(`${intro} ${excused ? 'darsga sababli kelmadi' : 'darsga kelmadi'}.`);
  } else {
    lines.push(`${intro} <b>${input.total}/${input.maxScore || 100}</b> ball to'pladi (baho: ${input.grade}).`);
    const details: string[] = [];
    if (status) details.push(`• Davomat: ${STATUS_LABELS[status] || escapeHtml(input.attendanceStatus)}`);
    if (input.homework) details.push(`• Uy vazifasi: ${escapeHtml(uz(input.homework.label))}`);
    if (input.activity) details.push(`• Darsdagi faollik: ${escapeHtml(uz(input.activity.label))}`);
    if (input.pointsScore != null) details.push(`• Dars bali: ${input.pointsScore}/100`);
    if (details.length) lines.push('', ...details);
  }

  const signature = input.centerName ? `«${escapeHtml(input.centerName)}» o'quv markazi ma'muriyati` : "O'quv markazi ma'muriyati";
  lines.push('', `Hurmat bilan, ${signature}.`);
  return lines.join('\n');
};

module.exports = { buildLessonMessage, buildParentLessonMessage };

export {};
