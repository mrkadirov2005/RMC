// "Suratni yuklash": a PNG of a class's month, drawn on a canvas so it needs no image library. One
// row per student, one column per lesson date: each lesson's points on its attendance colour, then
// how many lessons were scored and the month's total points.

import { getWorkflowStudentId, type WorkflowStudent } from './sessionWorkflowModel';
import { getCombinedLessonPoints, type LessonPointRecord } from './utils/points';

export type AttendanceMark = 'present' | 'late' | 'excused' | 'absent';

/** The student's place in the group over all its lessons (grades/class/:id/standings). */
export interface ImageStanding {
  place: number;
  total_points: number;
  lessons: number;
  trend: { direction: 'up' | 'down' | 'flat' } | null;
}

/** Places drawn in the teacher's colour, as in the teacher's student table. */
export const IMAGE_TOP_PLACES = 5;

export interface MonthlyAttendanceGrid {
  monthKey: string;
  dates: string[];
  rows: Array<{
    id: number;
    name: string;
    marks: Array<AttendanceMark | null>;
    scores: Array<number | null>;
    attended: number;
    recorded: number;
    lessons: number;
    total: number;
    standing?: ImageStanding;
  }>;
  /** True when the standings were loaded: rows go by place and the image shows them. */
  ranked?: boolean;
}

const UZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];

/** "2026-10" -> "Oktyabr 2026". */
export const formatAttendanceMonth = (monthKey: string) => {
  const month = Number(monthKey.slice(5, 7));
  return month >= 1 && month <= 12 ? `${UZ_MONTHS[month - 1]} ${monthKey.slice(0, 4)}` : monthKey;
};

// Stored statuses are the workflow's Present / Late / Absent R / Absent, plus older lowercase values.
export const toAttendanceMark = (status: unknown): AttendanceMark | null => {
  const value = String(status || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!value) return null;
  if (['present', 'on_time', 'attended'].includes(value)) return 'present';
  if (value === 'late') return 'late';
  if (['absent_r', 'excused', 'absent_excused'].includes(value)) return 'excused';
  if (value === 'absent') return 'absent';
  return null;
};

export const buildMonthlyAttendanceGrid = ({
  students,
  records,
  scores = [],
  monthKey,
  standings,
}: {
  students: WorkflowStudent[];
  /** Places over all lessons; when given, rows go in that order (no lessons last), else A–Z. */
  standings?: Map<number, ImageStanding>;
  records: Array<{ student_id?: unknown; attendance_date?: unknown; status?: unknown }>;
  /** The month's lesson grades, each with its lesson date. */
  scores?: Array<LessonPointRecord & { student_id?: unknown; session_date?: unknown }>;
  monthKey: string;
}): MonthlyAttendanceGrid => {
  const byKey = new Map<string, AttendanceMark>();
  const dates = new Set<string>();
  records.forEach((record) => {
    const date = String(record.attendance_date || '').slice(0, 10);
    const mark = toAttendanceMark(record.status);
    if (!date.startsWith(monthKey) || !mark) return;
    dates.add(date);
    byKey.set(`${Number(record.student_id)}:${date}`, mark);
  });
  const pointsByKey = new Map<string, number>();
  scores.forEach((grade) => {
    const date = String(grade.session_date || '').slice(0, 10);
    const points = getCombinedLessonPoints(grade);
    if (!date.startsWith(monthKey) || points === null) return;
    dates.add(date);
    pointsByKey.set(`${Number(grade.student_id)}:${date}`, points);
  });
  const sortedDates = Array.from(dates).sort();

  const rows = students
    .filter((student) => !student.deleted_at && getWorkflowStudentId(student) > 0)
    .map((student) => {
      const id = getWorkflowStudentId(student);
      const marks = sortedDates.map((date) => byKey.get(`${id}:${date}`) || null);
      const lessonScores = sortedDates.map((date) => pointsByKey.get(`${id}:${date}`) ?? null);
      const scored = lessonScores.filter((score): score is number => score !== null);
      return {
        id,
        name: [student.last_name, student.first_name].filter(Boolean).join(' ').trim() || `#${id}`,
        marks,
        scores: lessonScores,
        // Late still counts as attended, as in the lesson summary.
        attended: marks.filter((mark) => mark === 'present' || mark === 'late').length,
        recorded: marks.filter(Boolean).length,
        lessons: scored.length,
        total: scored.reduce((sum, score) => sum + score, 0),
        standing: standings?.get(id),
      };
    })
    .sort((a, b) => {
      if (standings) {
        const pa = a.standing && a.standing.lessons > 0 ? a.standing.place : Infinity;
        const pb = b.standing && b.standing.lessons > 0 ? b.standing.place : Infinity;
        if (pa !== pb) return pa - pb;
      }
      return a.name.localeCompare(b.name);
    });

  return { monthKey, dates: sortedDates, rows, ranked: Boolean(standings) };
};

const MARK_STYLE: Record<AttendanceMark, { text: string; fill: string; color: string; label: string }> = {
  present: { text: '✓', fill: '#d1fae5', color: '#047857', label: 'Keldi' },
  late: { text: 'K', fill: '#fef3c7', color: '#b45309', label: 'Kechikdi' },
  excused: { text: 'S', fill: '#e0f2fe', color: '#0369a1', label: 'Sababli' },
  absent: { text: '✗', fill: '#ffe4e6', color: '#be123c', label: 'Kelmadi' },
};

// A scored lesson with no attendance taken.
const NO_MARK_STYLE = { text: '', fill: '#f1f5f9', color: '#334155' };

const FONT = 'Arial, Helvetica, sans-serif';

const isTop = (standing?: ImageStanding) => Boolean(standing && standing.lessons > 0 && standing.place <= IMAGE_TOP_PLACES);

const TREND_STYLE = {
  up: { color: '#059669', label: 'Yaxshilanmoqda' },
  down: { color: '#e11d48', label: 'Pasaymoqda' },
  flat: { color: '#94a3b8', label: "O'zgarishsiz" },
} as const;

// ▲ / ▼ as filled triangles and ▬ as a bar, so they do not depend on the font.
const drawTrend = (ctx: CanvasRenderingContext2D, direction: 'up' | 'down' | 'flat', x: number, y: number) => {
  ctx.fillStyle = TREND_STYLE[direction].color;
  ctx.beginPath();
  if (direction === 'up') {
    ctx.moveTo(x, y - 6); ctx.lineTo(x + 7, y + 5); ctx.lineTo(x - 7, y + 5);
  } else if (direction === 'down') {
    ctx.moveTo(x, y + 6); ctx.lineTo(x + 7, y - 5); ctx.lineTo(x - 7, y - 5);
  } else {
    ctx.rect(x - 7, y - 2, 14, 4);
  }
  ctx.closePath();
  ctx.fill();
};

/** Draws the grid; returns null when the browser has no 2D canvas. */
export const drawMonthlyAttendanceImage = (
  grid: MonthlyAttendanceGrid,
  { title, subtitle, topColor = '#FACC15' }: { title: string; subtitle?: string; topColor?: string }
) => {
  const scale = 2;
  const pad = 24;
  const numW = 30;
  const nameW = 200;
  // With standings: the trend arrow and the points over all lessons, before the lesson columns.
  const trendW = grid.ranked ? 58 : 0;
  const allW = grid.ranked ? 72 : 0;
  const dateW = 38;
  const lessonsW = 64;
  const minTotalW = 90;
  const rowH = 30;
  const headH = 84;
  const tableHeadH = 44;
  // A second legend line for the top five and the arrows.
  const legendH = grid.ranked ? 72 : 44;
  const width = Math.max(pad * 2 + numW + nameW + trendW + allW + grid.dates.length * dateW + lessonsW + minTotalW, 640);
  // With only a few lessons the total column takes up the rest, so the table spans the image.
  const totalW = width - pad * 2 - numW - nameW - trendW - allW - grid.dates.length * dateW - lessonsW;
  const height = pad + headH + tableHeadH + Math.max(grid.rows.length, 1) * rowH + legendH + pad;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(scale, scale);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Title block.
  ctx.fillStyle = '#0f172a';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillText(title, pad, pad + 24);
  ctx.font = `14px ${FONT}`;
  ctx.fillStyle = '#475569';
  ctx.fillText(`Davomat va ballar · ${formatAttendanceMonth(grid.monthKey)}`, pad, pad + 48);
  if (subtitle) ctx.fillText(subtitle, pad, pad + 68);

  const tableTop = pad + headH;
  const tableLeft = pad;
  const tableRight = width - pad;
  const xTrend = tableLeft + numW + nameW;
  const xAll = xTrend + trendW;
  const xDate = xAll + allW;
  const xLessons = xDate + grid.dates.length * dateW;
  const xTotal = xLessons + lessonsW;

  // Header row.
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(tableLeft, tableTop, tableRight - tableLeft, tableHeadH);
  ctx.fillStyle = '#334155';
  ctx.font = `bold 12px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText('№', tableLeft + numW / 2, tableTop + tableHeadH / 2);
  ctx.textAlign = 'left';
  ctx.fillText("O'quvchi", tableLeft + numW + 6, tableTop + tableHeadH / 2);
  ctx.textAlign = 'center';
  if (grid.ranked) {
    ctx.fillText('Dinamika', xTrend + trendW / 2, tableTop + tableHeadH / 2);
    ctx.fillText('Jami', xAll + allW / 2, tableTop + 15);
    ctx.font = `10px ${FONT}`;
    ctx.fillText('(barcha darslar)', xAll + allW / 2, tableTop + 31);
  }
  grid.dates.forEach((date, index) => {
    const x = xDate + index * dateW + dateW / 2;
    ctx.font = `bold 13px ${FONT}`;
    ctx.fillText(String(Number(date.slice(8, 10))), x, tableTop + 15);
    ctx.font = `10px ${FONT}`;
    ctx.fillText(date.slice(5, 7), x, tableTop + 31);
  });
  ctx.font = `bold 12px ${FONT}`;
  ctx.fillText('Darslar', xLessons + lessonsW / 2, tableTop + tableHeadH / 2);
  ctx.fillText(grid.ranked ? "O'rin" : 'Jami ball', xTotal + totalW / 2, tableTop + tableHeadH / 2);

  // Student rows.
  const fitText = (text: string, maxWidth: number) => {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let cut = text;
    while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
    return `${cut}…`;
  };
  grid.rows.forEach((row, rowIndex) => {
    const y = tableTop + tableHeadH + rowIndex * rowH;
    const top = grid.ranked && isTop(row.standing);
    if (top) {
      // The teacher's colour, lightly, with a full-colour edge.
      ctx.fillStyle = `${topColor}40`;
      ctx.fillRect(tableLeft, y, tableRight - tableLeft, rowH);
      ctx.fillStyle = topColor;
      ctx.fillRect(tableLeft, y, 4, rowH);
    } else if (rowIndex % 2 === 1) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(tableLeft, y, tableRight - tableLeft, rowH);
    }
    ctx.fillStyle = '#64748b';
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(rowIndex + 1), tableLeft + numW / 2, y + rowH / 2);
    ctx.fillStyle = '#0f172a';
    ctx.font = `600 13px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(fitText(row.name, nameW - 12), tableLeft + numW + 6, y + rowH / 2);
    if (grid.ranked) {
      if (row.standing?.trend) drawTrend(ctx, row.standing.trend.direction, xTrend + trendW / 2, y + rowH / 2);
      else {
        ctx.fillStyle = '#94a3b8';
        ctx.font = `12px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('—', xTrend + trendW / 2, y + rowH / 2);
      }
      const hasAll = row.standing && row.standing.lessons > 0;
      ctx.fillStyle = hasAll ? '#0f172a' : '#94a3b8';
      ctx.font = `bold 13px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(hasAll ? String(row.standing!.total_points) : '—', xAll + allW / 2, y + rowH / 2);
    }

    // The lesson's points on its attendance colour; the attendance symbol when it was not scored.
    row.marks.forEach((mark, index) => {
      const score = row.scores[index];
      if (!mark && score === null) return;
      const style = mark ? MARK_STYLE[mark] : NO_MARK_STYLE;
      const x = xDate + index * dateW;
      ctx.fillStyle = style.fill;
      ctx.fillRect(x + 3, y + 4, dateW - 6, rowH - 8);
      ctx.fillStyle = style.color;
      ctx.font = score === null ? `bold 14px ${FONT}` : `bold 12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(score === null ? style.text : String(score), x + dateW / 2, y + rowH / 2 + 1);
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = row.lessons ? '#334155' : '#94a3b8';
    ctx.font = `600 12px ${FONT}`;
    ctx.fillText(row.lessons ? String(row.lessons) : '—', xLessons + lessonsW / 2, y + rowH / 2);
    // Ranked: the last column is the student's place over all lessons, not the month's total.
    const lastValue = grid.ranked ? (row.standing && row.standing.lessons > 0 ? String(row.standing.place) : '—') : (row.lessons ? String(row.total) : '—');
    ctx.fillStyle = lastValue === '—' ? '#94a3b8' : '#0f172a';
    ctx.font = `bold 13px ${FONT}`;
    ctx.fillText(lastValue, xTotal + totalW / 2, y + rowH / 2);
  });
  if (grid.rows.length === 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = `13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText("O'quvchilar yo'q", (tableLeft + tableRight) / 2, tableTop + tableHeadH + rowH / 2);
  }

  // Grid lines.
  const tableBottom = tableTop + tableHeadH + Math.max(grid.rows.length, 1) * rowH;
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.strokeRect(tableLeft + 0.5, tableTop + 0.5, tableRight - tableLeft - 1, tableBottom - tableTop - 1);
  ctx.beginPath();
  [tableLeft + numW, ...(grid.ranked ? [xTrend, xAll] : []), xDate, ...grid.dates.map((_, index) => xDate + (index + 1) * dateW), xTotal].forEach((x) => {
    ctx.moveTo(Math.round(x) + 0.5, tableTop);
    ctx.lineTo(Math.round(x) + 0.5, tableBottom);
  });
  ctx.moveTo(tableLeft, tableTop + tableHeadH + 0.5);
  ctx.lineTo(tableRight, tableTop + tableHeadH + 0.5);
  ctx.stroke();

  // Legend.
  let legendX = tableLeft;
  const legendY = tableBottom + legendH / 2 + 4;
  (Object.keys(MARK_STYLE) as AttendanceMark[]).forEach((mark) => {
    const style = MARK_STYLE[mark];
    ctx.fillStyle = style.fill;
    ctx.fillRect(legendX, legendY - 10, 20, 20);
    ctx.fillStyle = style.color;
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(style.text, legendX + 10, legendY + 1);
    ctx.fillStyle = '#334155';
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(style.label, legendX + 26, legendY + 1);
    legendX += 26 + ctx.measureText(style.label).width + 18;
  });
  ctx.fillStyle = '#64748b';
  ctx.fillText('Raqam: dars bali', legendX, legendY + 1);
  if (grid.ranked) {
    let x = tableLeft;
    const y2 = legendY + 28;
    ctx.fillStyle = topColor;
    ctx.fillRect(x, y2 - 10, 20, 20);
    ctx.fillStyle = '#334155';
    ctx.fillText(`Eng yaxshi ${IMAGE_TOP_PLACES} (barcha darslar)`, x + 26, y2 + 1);
    x += 26 + ctx.measureText(`Eng yaxshi ${IMAGE_TOP_PLACES} (barcha darslar)`).width + 18;
    (['up', 'down', 'flat'] as const).forEach((direction) => {
      drawTrend(ctx, direction, x + 8, y2);
      ctx.fillStyle = '#334155';
      ctx.fillText(TREND_STYLE[direction].label, x + 22, y2 + 1);
      x += 22 + ctx.measureText(TREND_STYLE[direction].label).width + 18;
    });
  }

  return canvas;
};

/** Saves the canvas as a PNG file. */
export const downloadCanvasPng = (canvas: HTMLCanvasElement, fileName: string) =>
  new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Rasmni yaratib bo'lmadi"));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve();
    }, 'image/png');
  });
