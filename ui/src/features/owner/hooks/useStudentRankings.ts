import { useEffect, useState } from 'react';
import { getApiPayload } from '@/shared/api/response';
import { getErrorMessage } from '@/utils/errorMessage';
import { reportAPI } from '../api';
import type { StudentRankingRow } from '../studentRankingModel';

/** Loads the month's lesson points per child and group; no month means the current one. */
export const useStudentRankings = (month?: string) => {
  const [rows, setRows] = useState<StudentRankingRow[]>([]);
  const [loadedMonth, setLoadedMonth] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    reportAPI.studentRankings(month || undefined)
      .then((response) => {
        if (!alive) return;
        const payload = getApiPayload<{ month: string; rows: StudentRankingRow[] }>(response);
        setRows(payload?.rows || []);
        setLoadedMonth(payload?.month || '');
      })
      .catch((err) => { if (alive) setError(getErrorMessage(err) || 'Could not load the student ranking'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [month]);

  return { rows, month: loadedMonth, loading, error };
};
