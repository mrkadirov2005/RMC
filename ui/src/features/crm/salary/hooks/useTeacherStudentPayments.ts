import { useEffect, useState } from 'react';
import { paymentAPI } from '@/shared/api/api';
import { getApiPayload } from '@/shared/api/response';
import { monthRange, type StudentPaymentRow } from '../model/teacherStudentPayments';

const MAX_PAGES = 20;

/**
 * Every student of one teacher with what they paid in the month, from the same endpoint as
 * Dashboard → To'lovlar (100 rows a page, so a large teacher takes a few requests).
 */
export const useTeacherStudentPayments = (teacherId: number | null, year: number, month: number) => {
  const [rows, setRows] = useState<StudentPaymentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!teacherId) {
      setRows([]);
      setLoading(false);
      setFailed(false);
      return;
    }
    let cancelled = false;
    const { from, to } = monthRange(year, month);
    setLoading(true);
    setFailed(false);
    setRows([]);
    (async () => {
      const all: StudentPaymentRow[] = [];
      for (let page = 1; page <= MAX_PAGES; page += 1) {
        const payload = getApiPayload<{ rows?: StudentPaymentRow[]; total?: number; limit?: number }>(
          await paymentAPI.getStudentsSummary({ teacher_id: teacherId, from, to, page })
        );
        const pageRows = payload?.rows || [];
        all.push(...pageRows);
        if (!pageRows.length || all.length >= Number(payload?.total || 0)) break;
      }
      return all;
    })()
      .then((all) => {
        if (!cancelled) setRows(all);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teacherId, year, month, reloadKey]);

  return { rows, loading, failed, reload: () => setReloadKey((key) => key + 1) };
};
