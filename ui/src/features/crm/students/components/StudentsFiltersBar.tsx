// Source file for the students area in the crm feature.

import { Filter, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  hasActiveFilters: boolean;
  onClearAll: () => void;
}

// Renders the students filters bar module.
export const StudentsFiltersBar = ({ searchTerm, onSearchChange, onClearSearch, showFilters, onToggleFilters, hasActiveFilters, onClearAll }: Props) => (
  <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-sky-100 bg-gradient-to-r from-white via-sky-50/60 to-emerald-50/40 p-3 shadow-sm dark:border-border dark:bg-card dark:bg-none dark:shadow-none">
    <div className="relative flex-1 min-w-[250px] max-w-[400px]">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input placeholder="Search by name, email, phone, enrollment..." value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} className="border-white/80 bg-white/90 pl-9 shadow-sm dark:border-input dark:bg-background dark:shadow-none" />
      {searchTerm && <button onClick={onClearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"><X className="h-4 w-4 text-muted-foreground" /></button>}
    </div>
    <Button variant={showFilters ? 'default' : 'outline'} onClick={onToggleFilters} className={showFilters ? 'shadow-md shadow-sky-900/10 dark:shadow-none' : 'border-white/80 bg-white/80 shadow-sm dark:border-input dark:bg-background dark:shadow-none'}>
      <Filter className="h-4 w-4 mr-1.5" /> Filters
    </Button>
    {hasActiveFilters && <Button variant="destructive" size="sm" onClick={onClearAll}><X className="h-4 w-4 mr-1" /> Clear All</Button>}
  </div>
);
