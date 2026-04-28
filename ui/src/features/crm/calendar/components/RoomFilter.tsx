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
    <div className="mb-6 flex items-center gap-4 bg-muted/50 p-4 rounded-lg border">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filter by Room:</span>
      </div>
      <Select value={selectedRoom} onValueChange={setSelectedRoom}>
        <SelectTrigger className="w-[200px] bg-background">
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
