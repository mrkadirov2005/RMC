import { useEffect, useState } from 'react';
import { unwrapApiRows } from '@/shared/api/response';
import { studentsApi } from '../api/studentsApi';

export type StudentHit = { student_id: number; first_name: string; last_name: string; class_name?: string | null };

/** Students whose name matches what was typed (2+ letters), after a short pause in typing. */
export const useStudentSearch = (query: string, enabled = true) => {
  const [hits, setHits] = useState<StudentHit[]>([]);
  useEffect(() => {
    if (!enabled || query.trim().length < 2) { setHits([]); return; }
    const timer = window.setTimeout(async () => {
      try {
        setHits(unwrapApiRows<StudentHit>(await studentsApi.getAll({ q: query.trim(), page: 1, limit: 8 })));
      } catch {
        setHits([]);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, enabled]);
  return { hits, clear: () => setHits([]) };
};
