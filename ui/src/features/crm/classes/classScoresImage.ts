// The class's scores image ("Suratni yuklash" after a lesson, "Ballarni yuklash" in the teacher's
// attendance tab): the month's attendance and points, with each student's place over all lessons,
// the top five in the teacher's colour and the trend arrow.

import { gradeAPI } from '@/shared/api/api';
import { unwrapApiRows } from '@/shared/api/response';
import { sessionWorkflowApi } from './api/sessionWorkflowApi';
import { buildMonthlyAttendanceGrid, downloadCanvasPng, drawMonthlyAttendanceImage, type ImageStanding } from './monthlyAttendanceImage';
import type { WorkflowStudent } from './sessionWorkflowModel';

export const downloadClassScoresImage = async ({
  classId,
  className,
  teacherName,
  monthKey,
  students,
  topColor,
}: {
  classId: number;
  className?: string | null;
  teacherName?: string | null;
  monthKey: string;
  students: WorkflowStudent[];
  topColor?: string;
}) => {
  const [records, scores, standingRows] = await Promise.all([
    sessionWorkflowApi.loadClassAttendance(classId),
    sessionWorkflowApi.loadClassMonthScores(classId, monthKey),
    // Without standings the image is still made, in A–Z order as before.
    gradeAPI.getClassStandings(classId).then((response) => unwrapApiRows<ImageStanding & { student_id: number }>(response)).catch(() => null),
  ]);
  const standings = standingRows ? new Map(standingRows.map((row) => [Number(row.student_id), row])) : undefined;
  const grid = buildMonthlyAttendanceGrid({ students, records, scores, monthKey, standings });
  const title = className || `#${classId}`;
  const canvas = drawMonthlyAttendanceImage(grid, {
    title,
    subtitle: teacherName ? `O'qituvchi: ${teacherName}` : undefined,
    topColor,
  });
  if (!canvas) throw new Error('canvas unavailable');
  const safeName = title.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '') || 'guruh';
  await downloadCanvasPng(canvas, `ballar_${safeName}_${monthKey}.png`);
};
