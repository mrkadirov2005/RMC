// The rooms and their week, loaded once for the Rooms screens and again after any change.
import { useCallback, useEffect, useState } from 'react';
import { getApiPayload, unwrapApiRows } from '@/shared/api/response';
import { getErrorMessage } from '@/utils/errorMessage';
import { roomAPI } from '../api';
import type { Weekly } from '../weeklyModel';

/** A room itself, whatever its status (the week only lists active rooms). */
export type PhysicalRoom = {
  room_id: number;
  name: string;
  nickname: string | null;
  capacity: number | null;
  location?: string | null;
  status: string;
  features: string[];
  operating_start_time: string;
  operating_end_time: string;
};

export const useRoomsOverview = () => {
  const [weekly, setWeekly] = useState<Weekly | null>(null);
  const [physical, setPhysical] = useState<PhysicalRoom[]>([]);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([roomAPI.getWeekly(), roomAPI.getPhysical()])
      .then(([week, rooms]) => {
        if (!active) return;
        setWeekly(getApiPayload<Weekly>(week));
        setPhysical(unwrapApiRows<PhysicalRoom>(rooms));
        setError('');
      })
      .catch((requestError) => {
        if (active) setError(getErrorMessage(requestError) || 'Could not load the rooms');
      });
    return () => {
      active = false;
    };
  }, [version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return { weekly, physical, error, reload };
};
