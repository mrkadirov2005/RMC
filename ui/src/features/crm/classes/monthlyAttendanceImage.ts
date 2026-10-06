// "Suratni yuklash": a PNG of a class's attendance for one month, drawn on a canvas so it needs
// no image library. One row per student, one column per lesson date that has attendance.

import { getWorkflowStudentId, type WorkflowStudent } from './sessionWorkflowModel';

export type AttendanceMark = 'present' | 'late' | 'excused' | 'absent';

export interface MonthlyAttendanceGrid {
  monthKey: string;
  dates: string[];
  rows: Array<{ id: number; name: string; marks: Array<AttendanceMark | null>; attended: number; recorded: number }>;
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
  monthKey,
}: {
  students: WorkflowStudent[];
  records: Array<{ student_id?: unknown; attendance_date?: unknown; status?: unknown }>;
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
  const sortedDates = Array.from(dates).sort();

  const rows = students
    .filter((student) => !student.deleted_at && getWorkflowStudentId(student) > 0)
    .map((student) => {
      const id = getWorkflowStudentId(student);
      const marks = sortedDates.map((date) => byKey.get(`${id}:${date}`) || null);
      return {
        id,
        name: [student.last_name, student.first_name].filter(Boolean).join(' ').trim() || `#${id}`,
        marks,
        // Late still counts as attended, as in the lesson summary.
        attended: marks.filter((mark) => mark === 'present' || mark === 'late').length,
        recorded: marks.filter(Boolean).length,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return { monthKey, dates: sortedDates, rows };
};

const MARK_STYLE: Record<AttendanceMark, { text: string; fill: string; color: string; label: string }> = {
  present: { text: '✓', fill: '#d1fae5', color: '#047857', label: 'Keldi' },
  late: { text: 'K', fill: '#fef3c7', color: '#b45309', label: 'Kechikdi' },
  excused: { text: 'S', fill: '#e0f2fe', color: '#0369a1', label: 'Sababli' },
  absent: { text: '✗', fill: '#ffe4e6', color: '#be123c', label: 'Kelmadi' },
};

const FONT = 'Arial, Helvetica, sans-serif';

/** Draws the grid; returns null when the browser has no 2D canvas. */
export const drawMonthlyAttendanceImage = (grid: MonthlyAttendanceGrid, { title, subtitle }: { title: string; subtitle?: string }) => {
  const scale = 2;
  const pad = 24;
  const numW = 30;
  const nameW = 200;
  const dateW = 38;
  const minTotalW = 90;
  const rowH = 30;
  const headH = 84;
  const tableHeadH = 44;
  const legendH = 44;
  const width = Math.max(pad * 2 + numW + nameW + grid.dates.length * dateW + minTotalW, 520);
  // With only a few lessons the total column takes up the rest, so the table spans the image.
  const totalW = width - pad * 2 - numW - nameW - grid.dates.length * dateW;
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
  ctx.fillText(`Davomat · ${formatAttendanceMonth(grid.monthKey)}`, pad, pad + 48);
  if (subtitle) ctx.fillText(subtitle, pad, pad + 68);

  const tableTop = pad + headH;
  const tableLeft = pad;
  const tableRight = width - pad;
  const xDate = tableLeft + numW + nameW;
  const xTotal = xDate + grid.dates.length * dateW;

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
  grid.dates.forEach((date, index) => {
    const x = xDate + index * dateW + dateW / 2;
    ctx.font = `bold 13px ${FONT}`;
    ctx.fillText(String(Number(date.slice(8, 10))), x, tableTop + 15);
    ctx.font = `10px ${FONT}`;
    ctx.fillText(date.slice(5, 7), x, tableTop + 31);
  });
  ctx.font = `bold 12px ${FONT}`;
  ctx.fillText('Jami', xTotal + totalW / 2, tableTop + tableHeadH / 2);

  // Student rows.
  const fitText = (text: string, maxWidth: number) => {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let cut = text;
    while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
    return `${cut}…`;
  };
  grid.rows.forEach((row, rowIndex) => {
    const y = tableTop + tableHeadH + rowIndex * rowH;
    if (rowIndex % 2 === 1) {
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

    row.marks.forEach((mark, index) => {
      if (!mark) return;
      const style = MARK_STYLE[mark];
      const x = xDate + index * dateW;
      ctx.fillStyle = style.fill;
      ctx.fillRect(x + 4, y + 4, dateW - 8, rowH - 8);
      ctx.fillStyle = style.color;
      ctx.font = `bold 14px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(style.text, x + dateW / 2, y + rowH / 2 + 1);
    });

    const percent = row.recorded ? Math.round((row.attended / row.recorded) * 100) : 0;
    ctx.fillStyle = row.recorded === 0 ? '#94a3b8' : percent >= 80 ? '#047857' : percent >= 50 ? '#b45309' : '#be123c';
    ctx.font = `bold 12px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(row.recorded ? `${row.attended}/${row.recorded} · ${percent}%` : '—', xTotal + totalW / 2, y + rowH / 2);
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
  [tableLeft + numW, xDate, ...grid.dates.map((_, index) => xDate + (index + 1) * dateW)].forEach((x) => {
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
