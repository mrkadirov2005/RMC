// A student's journey through the center: every record of the same child (one per group, joined
// by transfers, added groups, the enrollment number, or the same phone and first name), in date
// order, with the teacher(s) they had in each group, how each stretch went (attendance, grades,
// coins, money) and how it ended (transferred, left, still studying). Read-only.
const pool = require('../../../db/pool');
const { priceAtSql } = require('../../classes/classPriceSql');

const query = (text: string, params: any[] = []) => pool.query(text, params).then((r: any) => r.rows);

const DAY_MS = 24 * 60 * 60 * 1000;
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const num = (value: unknown) => Number(value || 0);

// Tashkent is UTC+5 all year.
const tashkentToday = () => new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
const day = (value: unknown) => {
  if (!value) return null;
  if (value instanceof Date) return new Date(value.getTime() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const text = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
};
const daysBetween = (from: string, to: string) =>
  Math.max(0, Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1);
const shiftDay = (value: string, count: number) =>
  new Date(Date.parse(`${value}T00:00:00Z`) + count * DAY_MS).toISOString().slice(0, 10);

/** The last 9 digits of a phone number (Uzbek numbers with or without +998), or '' if too short. */
const phoneKey = (value: unknown) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 7 ? digits.slice(-9) : '';
};
const nameKey = (value: unknown) => String(value || '').trim().toLowerCase().split(/\s+/)[0] || '';

type MatchReason = 'self' | 'group' | 'transfer' | 'enrollment' | 'phone';

/**
 * Every record of the same child in the center. Records are linked by the main record of a child
 * in several groups, by transfers (both ways), by the enrollment number, and by the same phone
 * number with the same first name (siblings share a parent's phone, so the name must match too).
 */
const findFamily = async (studentId: number, centerId: number | null) => {
  const seed = await query(
    `SELECT student_id, center_id FROM students WHERE student_id = $1 AND ($2::int IS NULL OR center_id = $2)`,
    [studentId, centerId]
  );
  if (!seed[0]) return null;
  const center = Number(seed[0].center_id);
  const found = new Map<number, MatchReason>([[studentId, 'self']]);
  for (let round = 0; round < 8; round += 1) {
    const known = await query(
      `SELECT student_id, main_student_id, transferred_from_student_id, enrollment_number, phone, first_name
       FROM students WHERE student_id = ANY($1::int[])`,
      [[...found.keys()]]
    );
    const ids = known.map((row: any) => Number(row.student_id));
    const linkedIds = known.flatMap((row: any) => [row.main_student_id, row.transferred_from_student_id]).filter(Boolean).map(Number);
    const enrollments = [...new Set(known.map((row: any) => String(row.enrollment_number || '').trim()).filter(Boolean))];
    const phoneNames = [...new Set(known.map((row: any) => {
      const phone = phoneKey(row.phone);
      const name = nameKey(row.first_name);
      return phone && name ? `${phone}|${name}` : '';
    }).filter(Boolean))];
    const rows = await query(
      `SELECT s.student_id,
              CASE
                WHEN s.student_id = ANY($2::int[]) OR s.main_student_id = ANY($1::int[]) OR s.student_id IN (
                  SELECT x.main_student_id FROM students x WHERE x.student_id = ANY($1::int[])) THEN 'group'
                WHEN s.transferred_from_student_id = ANY($1::int[]) THEN 'transfer'
                WHEN NULLIF(trim(s.enrollment_number), '') = ANY($3::text[]) THEN 'enrollment'
                ELSE 'phone'
              END AS reason
       FROM students s
       WHERE s.center_id = $5 AND NOT (s.student_id = ANY($1::int[])) AND (
         s.student_id = ANY($2::int[])
         OR s.main_student_id = ANY($1::int[])
         OR s.transferred_from_student_id = ANY($1::int[])
         OR s.student_id IN (SELECT x.main_student_id FROM students x WHERE x.student_id = ANY($1::int[]))
         OR NULLIF(trim(s.enrollment_number), '') = ANY($3::text[])
         OR (right(regexp_replace(COALESCE(s.phone, ''), '\\D', '', 'g'), 9)
               || '|' || lower(split_part(trim(COALESCE(s.first_name, '')), ' ', 1))) = ANY($4::text[])
       )`,
      [ids, linkedIds, enrollments, phoneNames, center]
    );
    if (!rows.length) break;
    rows.forEach((row: any) => {
      const id = Number(row.student_id);
      // The record a known one was transferred from counts as a transfer too.
      const reason = known.some((k: any) => Number(k.transferred_from_student_id) === id) ? 'transfer' : row.reason;
      if (!found.has(id)) found.set(id, reason as MatchReason);
    });
  }
  return { center, found };
};

/** The group's teachers over time: [{ teacher_id, name, from }], oldest first. */
const teacherPeriods = async (classIds: number[]) => {
  if (!classIds.length) return new Map<number, any[]>();
  const rows = await query(
    `SELECT h.class_id, h.teacher_id, h.changed_at, NULLIF(trim(concat_ws(' ', t.first_name, t.last_name)), '') AS name
     FROM class_teacher_history h LEFT JOIN teachers t ON t.teacher_id = h.teacher_id
     WHERE h.class_id = ANY($1::int[]) ORDER BY h.class_id, h.changed_at, h.history_id`,
    [classIds]
  );
  const byClass = new Map<number, any[]>();
  rows.forEach((row: any) => {
    const list = byClass.get(Number(row.class_id)) || [];
    list.push({ teacher_id: row.teacher_id == null ? null : Number(row.teacher_id), name: row.name, from: day(row.changed_at) });
    byClass.set(Number(row.class_id), list);
  });
  return byClass;
};

/** Splits a stretch in a group into the teachers the group had during it. */
const splitByTeacher = (periods: any[], from: string, to: string, fallback: { teacher_id: number | null; name: string | null }) => {
  const segments: any[] = [];
  periods.forEach((period, index) => {
    // The group's first known teacher also covers the time before it was recorded.
    const periodStart = index === 0 ? '0000-01-01' : period.from;
    const periodEnd = periods[index + 1] ? shiftDay(periods[index + 1].from, -1) : '9999-12-31';
    const start = periodStart > from ? periodStart : from;
    const end = periodEnd < to ? periodEnd : to;
    if (start <= end) segments.push({ teacher_id: period.teacher_id, name: period.name, from: start, to: end, days: daysBetween(start, end) });
  });
  return segments.length ? segments : [{ ...fallback, from, to, days: daysBetween(from, to) }];
};

const getJourney = async (studentId: number, centerId: number | null) => {
  const family = await findFamily(studentId, centerId);
  if (!family) return null;
  const ids = [...family.found.keys()];
  const today = tashkentToday();
  const rows = await query(
    `SELECT s.student_id, s.first_name, s.last_name, s.status, s.class_id, s.teacher_id, s.main_student_id,
            s.transferred_from_student_id, s.enrollment_number, s.phone,
            COALESCE(s.start_date, s.created_at::date) AS start_day, (s.start_date IS NULL) AS start_approx,
            COALESCE(s.end_date, s.deleted_at::date) AS end_day, s.deleted_at IS NOT NULL AS left_center,
            c.class_name, c.payment_amount AS group_price,
            (SELECT sub.subject_name FROM subjects sub WHERE sub.class_id = s.class_id ORDER BY sub.subject_id LIMIT 1) AS subject_name,
            (SELECT l.level_name FROM subject_levels l WHERE l.level_id = c.level_id) AS level_name,
            NULLIF(trim(concat_ws(' ', st.first_name, st.last_name)), '') AS student_teacher_name,
            tr.reason_name AS transfer_reason, dr.reason_name AS leave_reason, s.delete_reason_note AS leave_note,
            att.attended, att.missed, att.excused, att.total AS lessons_marked,
            gr.avg_percentage, coin.coins,
            pay.paid, pay.discounts, pay.payments_count, pay.last_payment,
            (SELECT COALESCE(SUM(billing_month_share(c.section, COALESCE(s.start_date, s.created_at::date),
                       COALESCE(s.end_date, s.deleted_at::date), m::date)
                     * ${priceAtSql('s.class_id', 'm', 'c.payment_amount')}), 0)
               FROM generate_series(date_trunc('month', COALESCE(s.start_date, s.created_at::date)),
                                    date_trunc('month', LEAST(COALESCE(s.end_date, s.deleted_at::date, $2::date), $2::date)),
                                    interval '1 month') m) AS expected
     FROM students s
     LEFT JOIN classes c ON c.class_id = s.class_id
     LEFT JOIN teachers st ON st.teacher_id = s.teacher_id
     LEFT JOIN student_action_reasons tr ON tr.reason_id = s.transfer_reason_id
     LEFT JOIN student_action_reasons dr ON dr.reason_id = s.delete_reason_id
     LEFT JOIN LATERAL (
       SELECT count(*) FILTER (WHERE lower(a.status::text) IN ('present', 'late')) AS attended,
              count(*) FILTER (WHERE lower(a.status::text) = 'absent') AS missed,
              count(*) FILTER (WHERE lower(a.status::text) = 'excused') AS excused,
              count(*) AS total
       FROM attendance a WHERE a.student_id = s.student_id
     ) att ON true
     LEFT JOIN LATERAL (
       SELECT round(avg(g.percentage)::numeric, 1) AS avg_percentage FROM grades g
       WHERE g.student_id = s.student_id AND g.percentage IS NOT NULL
     ) gr ON true
     LEFT JOIN LATERAL (
       SELECT COALESCE(sum(ct.delta), 0) AS coins FROM student_coin_transactions ct WHERE ct.student_id = s.student_id
     ) coin ON true
     LEFT JOIN LATERAL (
       SELECT COALESCE(sum(p.amount), 0) AS paid, COALESCE(sum(p.discount_amount), 0) AS discounts,
              count(*) AS payments_count, max(p.payment_date)::date AS last_payment
       FROM payments p WHERE p.student_id = s.student_id AND p.deleted_at IS NULL
         AND lower(COALESCE(p.payment_status::text, '')) IN ('completed', 'paid')
     ) pay ON true
     WHERE s.student_id = ANY($1::int[])
     ORDER BY COALESCE(s.start_date, s.created_at::date), s.student_id`,
    [ids, today]
  );
  if (!rows.length) return null;

  const periods = await teacherPeriods([...new Set(rows.map((row: any) => Number(row.class_id)).filter(Boolean))] as number[]);
  const nextOf = new Map<number, any>();
  rows.forEach((row: any) => {
    if (row.transferred_from_student_id) nextOf.set(Number(row.transferred_from_student_id), row);
  });

  const stints = rows.map((row: any) => {
    const from = day(row.start_day) || today;
    const ended = day(row.end_day);
    const to = ended && ended < today ? ended : today;
    const next = nextOf.get(Number(row.student_id));
    const transferred = String(row.status || '') === 'Transferred';
    const outcome = row.left_center
      ? 'left'
      : transferred
        ? 'transferred'
        : ended && ended < today
          ? 'ended'
          : 'active';
    const teachers = splitByTeacher(periods.get(Number(row.class_id)) || [], from, to < from ? from : to, {
      teacher_id: row.teacher_id == null ? null : Number(row.teacher_id),
      name: row.student_teacher_name,
    });
    return {
      student_id: Number(row.student_id),
      matched_by: family.found.get(Number(row.student_id)) || 'self',
      class_id: row.class_id == null ? null : Number(row.class_id),
      class_name: row.class_name || null,
      subject_name: row.subject_name || null,
      level_name: row.level_name || null,
      status: row.status || null,
      from,
      to: outcome === 'active' ? null : to,
      from_approx: Boolean(row.start_approx),
      days: daysBetween(from, to),
      parallel: Boolean(row.main_student_id) && !row.transferred_from_student_id,
      outcome,
      transfer_reason: row.transfer_reason || null,
      transferred_to: next ? { student_id: Number(next.student_id), class_name: next.class_name || null } : null,
      leave_reason: row.leave_reason || null,
      leave_note: row.leave_note || null,
      teachers,
      attended: num(row.attended),
      missed: num(row.missed),
      excused: num(row.excused),
      lessons_marked: num(row.lessons_marked),
      avg_grade: row.avg_percentage == null ? null : Number(row.avg_percentage),
      coins: num(row.coins),
      paid: roundMoney(num(row.paid)),
      discounts: roundMoney(num(row.discounts)),
      expected: roundMoney(num(row.expected)),
      payments_count: num(row.payments_count),
      last_payment: day(row.last_payment),
    };
  });

  // Time with each teacher: their share of each stretch (attendance and money split by days).
  const teacherMap = new Map<string, any>();
  stints.forEach((stint: any) => {
    const total = stint.teachers.reduce((sum: number, t: any) => sum + t.days, 0) || 1;
    stint.teachers.forEach((segment: any) => {
      const key = String(segment.teacher_id ?? `none:${segment.name || ''}`);
      const entry = teacherMap.get(key) || {
        teacher_id: segment.teacher_id,
        name: segment.name,
        days: 0,
        from: segment.from,
        to: segment.to,
        groups: [] as string[],
        attended: 0,
        missed: 0,
        paid: 0,
        expected: 0,
        current: false,
        outcomes: [] as string[],
      };
      const part = segment.days / total;
      entry.days += segment.days;
      entry.from = segment.from < entry.from ? segment.from : entry.from;
      entry.to = segment.to > entry.to ? segment.to : entry.to;
      if (stint.class_name && !entry.groups.includes(stint.class_name)) entry.groups.push(stint.class_name);
      entry.attended += Math.round(stint.attended * part);
      entry.missed += Math.round(stint.missed * part);
      entry.paid = roundMoney(entry.paid + stint.paid * part);
      entry.expected = roundMoney(entry.expected + stint.expected * part);
      const lastSegment = segment === stint.teachers[stint.teachers.length - 1];
      if (stint.outcome === 'active' && lastSegment) entry.current = true;
      if (lastSegment) {
        const outcome = stint.outcome === 'transferred'
          ? `transferred${stint.transfer_reason ? `: ${stint.transfer_reason}` : ''}`
          : stint.outcome === 'left'
            ? `left${stint.leave_reason ? `: ${stint.leave_reason}` : ''}`
            : stint.outcome;
        if (!entry.outcomes.includes(outcome)) entry.outcomes.push(outcome);
      } else if (!entry.outcomes.includes('teacher_changed')) {
        entry.outcomes.push('teacher_changed');
      }
      teacherMap.set(key, entry);
    });
  });
  const teachers = [...teacherMap.values()].sort((a, b) => (a.from < b.from ? -1 : 1));

  const first = stints[0];
  const active = stints.filter((stint: any) => stint.outcome === 'active');
  const lastDay = active.length ? today : stints.map((stint: any) => stint.to || today).sort().pop();
  const current = active[active.length - 1] || stints[stints.length - 1];
  const sum = (key: string) => stints.reduce((total: number, stint: any) => total + stint[key], 0);
  return {
    student: {
      student_id: studentId,
      name: `${rows[rows.length - 1].first_name || ''} ${rows[rows.length - 1].last_name || ''}`.trim(),
      enrollment_number: rows[rows.length - 1].enrollment_number || null,
    },
    summary: {
      first_day: first.from,
      first_day_approx: first.from_approx,
      last_day: active.length ? null : lastDay,
      days: daysBetween(first.from, lastDay),
      status: active.length ? 'active' : current.outcome,
      groups: new Set(stints.map((stint: any) => stint.class_id).filter(Boolean)).size,
      teachers: teachers.filter((teacher) => teacher.teacher_id != null).length,
      attended: sum('attended'),
      missed: sum('missed'),
      excused: sum('excused'),
      coins: sum('coins'),
      paid: roundMoney(sum('paid')),
      discounts: roundMoney(sum('discounts')),
      expected: roundMoney(sum('expected')),
    },
    teachers,
    stints: [...stints].reverse(),
  };
};

module.exports = { getJourney, phoneKey, nameKey, splitByTeacher };

export {};
