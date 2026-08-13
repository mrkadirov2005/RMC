import type { ReactNode } from 'react';

export const RoomTable = ({ headers, children, label }: { headers: string[]; children: ReactNode; label: string }) => (
  <div className="overflow-x-auto rounded-lg border">
    <table className="w-full min-w-[620px] text-left text-xs" aria-label={label}>
      <thead className="bg-muted/60 text-muted-foreground"><tr>{headers.map((header) => <th key={header} className="px-3 py-2 font-semibold">{header}</th>)}</tr></thead>
      <tbody className="divide-y">{children}</tbody>
    </table>
  </div>
);
export const roomRowClass = 'odd:bg-background even:bg-slate-50 dark:even:bg-muted/25';
