// Source file for the calendar area in the crm feature.

import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RoomFilterProps {
  selectedRoom: string;
  setSelectedRoom: (room: string) => void;
  uniqueRoomNumbers: string[];
}

// Renders the room filter module.
export const RoomFilter = ({
  selectedRoom,
  setSelectedRoom,
  uniqueRoomNumbers,
}: RoomFilterProps) => {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-sky-100 bg-gradient-to-r from-white via-sky-50/60 to-emerald-50/40 p-4 shadow-sm dark:border-border dark:bg-card dark:bg-none dark:shadow-none">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-100 to-emerald-100 text-sky-700 dark:bg-muted dark:bg-none dark:text-muted-foreground">
          <Building2 className="h-4 w-4" />
        </span>
        <span className="text-sm font-medium">Filter by Room:</span>
      </div>
      <Select value={selectedRoom} onValueChange={setSelectedRoom}>
        <SelectTrigger className="w-[200px] border-white/80 bg-white/90 shadow-sm dark:border-input dark:bg-background dark:shadow-none">
          <SelectValue placeholder="All Rooms" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Rooms</SelectItem>
          {uniqueRoomNumbers.map((num) => (
            <SelectItem key={num} value={num}>
              {num}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedRoom !== 'all' && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setSelectedRoom('all')} 
          className="text-xs"
        >
          Clear Filter
        </Button>
      )}
    </div>
  );
};
