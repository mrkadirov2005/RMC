import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useChildren } from '../api/queries';
import type { Child } from '../api/types';
import { Chips } from '../components/ui';
import { storage } from '../lib/storage';

const CHILD_KEY = 'ts.parent.child';

type Value = { children: Child[]; child: Child | null; childId: number | null; setChildId: (id: number) => void; query: ReturnType<typeof useChildren> };

const ParentChildContext = createContext<Value | null>(null);

// @MOB-130 The child a parent is looking at, shared by all parent tabs and remembered.
export function ParentChildProvider({ children: content }: { children: ReactNode }) {
  const query = useChildren();
  const [childId, setChildIdState] = useState<number | null>(null);
  const list = query.data?.items ?? [];

  useEffect(() => {
    storage.get(CHILD_KEY).then((saved) => {
      if (saved) setChildIdState(Number(saved));
    });
  }, []);

  const child = list.find((c) => c.student_id === childId) ?? list[0] ?? null;

  const value = useMemo<Value>(
    () => ({
      children: list,
      child,
      childId: child?.student_id ?? null,
      setChildId: (id) => {
        setChildIdState(id);
        void storage.set(CHILD_KEY, String(id));
      },
      query,
    }),
    [list, child, query],
  );
  return <ParentChildContext.Provider value={value}>{content}</ParentChildContext.Provider>;
}

export const useParentChild = () => {
  const value = useContext(ParentChildContext);
  if (!value) throw new Error('useParentChild must be used inside ParentChildProvider');
  return value;
};

// @MOB-130 Switcher shown when a parent has more than one child.
export function ChildSwitcher() {
  const { children, childId, setChildId } = useParentChild();
  if (children.length < 2 || childId == null) return null;
  return (
    <Chips<number>
      options={children.map((c) => ({ value: c.student_id, label: c.first_name || `#${c.student_id}` }))}
      value={childId}
      onChange={setChildId}
    />
  );
}
