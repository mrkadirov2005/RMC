import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * A page's open tab kept in the address (?tab=payments), so a reload or a shared link opens the
 * same tab, and Back goes back to the page, not through every tab. An unknown value falls back
 * to the default. Other query values on the page are kept.
 */
export function useUrlTab<T extends string>(
  fallback: T,
  allowed?: readonly T[],
  param = 'tab',
  /** Write the tab even when it is the default (for a default that a reload does not remember). */
  { keepDefault = false }: { keepDefault?: boolean } = {}
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get(param) as T | null;
  const value = raw && (!allowed || allowed.includes(raw)) ? raw : fallback;

  const setValue = useCallback(
    (next: string) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          if (next === fallback && !keepDefault) params.delete(param);
          else params.set(param, next);
          return params;
        },
        { replace: true }
      );
    },
    [fallback, keepDefault, param, setSearchParams]
  );

  return [value, setValue] as const;
}
