import type { RoomsTab } from '../types';

const tabs: Array<{ id: RoomsTab; label: string }> = [
  { id: 'statistics', label: 'Statistics' },
  { id: 'management', label: 'Room management' },
  { id: 'reports', label: 'Room reports' },
];

export const RoomsWorkspaceTabs = ({ active, onChange }: { active: RoomsTab; onChange: (tab: RoomsTab) => void }) => (
  <div role="tablist" aria-label="Room workspace views" className="flex gap-1 overflow-x-auto border-b bg-card px-2 pt-2">
    {tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={active === tab.id} aria-controls={`rooms-panel-${tab.id}`} data-testid={`rooms-tab-${tab.id}`} onClick={() => onChange(tab.id)} className={`whitespace-nowrap rounded-t-md px-3 py-2 text-xs font-semibold transition ${active === tab.id ? 'bg-slate-900 text-white dark:bg-primary dark:text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>{tab.label}</button>)}
  </div>
);
