import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Page state kept in the address (?q=ali&page=3): a reload, Back from a detail page or a shared
 * link brings back the same search, filters and page. Values equal to their default are left out
 * of the address. Several updates in one go (e.g. "clear filters") are combined, not lost.
 */
export function useUrlState<T extends Record<string, string>>(defaults: T) {
  const [searchParams, setSearchParams] = useSearchParams();
  // Updates made before the address has re-rendered build on each other.
  const pending = useRef<URLSearchParams | null>(null);
  // The address as last rendered, so an update from an older callback keeps the other values.
  const latest = useRef(searchParams);
  latest.current = searchParams;
  useEffect(() => {
    pending.current = null;
  }, [searchParams]);

  const values = useMemo(() => {
    const out = { ...defaults };
    (Object.keys(defaults) as Array<keyof T>).forEach((key) => {
      const raw = searchParams.get(String(key));
      if (raw !== null) out[key] = raw as T[keyof T];
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const update = useCallback(
    (patch: Partial<T>) => {
      const params = new URLSearchParams(pending.current ?? latest.current);
      Object.entries(patch).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '' || value === defaults[key]) params.delete(key);
        else params.set(key, String(value));
      });
      pending.current = params;
      setSearchParams(params, { replace: true });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setSearchParams]
  );

  return [values, update] as const;
}
