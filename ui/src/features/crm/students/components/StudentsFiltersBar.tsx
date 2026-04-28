// Source file for the students area in the crm feature.

import { Filter, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  hasActiveFilters: boolean;
  activeCount: number;
  onClearAll: () => void;
}

// Renders the students filters bar module.
export const StudentsFiltersBar = ({ searchTerm, onSearchChange, onClearSearch, showFilters, onToggleFilters, hasActiveFilters, activeCount, onClearAll }: Props) => (
  <div className="flex flex-wrap gap-3 mb-5 items-center">
    <div className="relative flex-1 min-w-[250px] max-w-[400px]">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input placeholder="Search by name, email, phone, enrollment..." value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} className="pl-9" />
      {searchTerm && <button onClick={onClearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"><X className="h-4 w-4 text-muted-foreground" /></button>}
    </div>
    <Button variant={showFilters ? 'default' : 'outline'} onClick={onToggleFilters}>
      <Filter className="h-4 w-4 mr-1.5" /> Filters {hasActiveFilters && <Badge className="ml-1.5 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">{activeCount}</Badge>}
    </Button>
    {hasActiveFilters && <Button variant="destructive" size="sm" onClick={onClearAll}><X className="h-4 w-4 mr-1" /> Clear All</Button>}
  </div>
);

