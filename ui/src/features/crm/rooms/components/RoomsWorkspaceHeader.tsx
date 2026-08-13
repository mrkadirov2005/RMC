import { Building2, Download, Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = { importing: boolean; onImport: () => void; onExport: () => void; onCreate: () => void };

export const RoomsWorkspaceHeader = ({ importing, onImport, onExport, onCreate }: Props) => (
  <header className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between" data-testid="rooms-header">
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white"><Building2 className="h-5 w-5" /></span>
      <div><h1 className="text-xl font-bold">Rooms</h1><p className="text-xs text-muted-foreground">Availability, schedules and utilization</p></div>
    </div>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={onImport} disabled={importing}><Upload className="mr-2 h-4 w-4" />{importing ? 'Importing…' : 'Import CSV'}</Button>
      <Button size="sm" variant="outline" onClick={onExport}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
      <Button size="sm" onClick={onCreate} data-testid="create-room-button"><Plus className="mr-2 h-4 w-4" />Create room</Button>
    </div>
  </header>
);
