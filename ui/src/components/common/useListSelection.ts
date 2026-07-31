import { useCallback, useMemo, useState } from 'react';

export const useListSelection = <T,>(items: T[], getId: (item: T) => number) => {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const visibleIds = useMemo(() => items.map(getId).filter((id) => id > 0), [getId, items]);
  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.has(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;

  const toggle = useCallback((id: number, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggleAllVisible = useCallback((checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      visibleIds.forEach((id) => checked ? next.add(id) : next.delete(id));
      return next;
    });
  }, [visibleIds]);

  const clear = useCallback(() => setSelectedIds(new Set()), []);

  return {
    selectedIds,
    selectedVisibleCount,
    allVisibleSelected,
    toggle,
    toggleAllVisible,
    clear,
  };
};
