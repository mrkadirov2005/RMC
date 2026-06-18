import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { showToast } from '@/utils/toast';
import { Calendar, Plus, Loader2 } from 'lucide-react';

interface RoomSlotsGeneratorProps {
  roomId: number;
  centerId: number;
  onSlotsGenerated?: () => void;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface SlotConfig {
  day: string;
  slots: string[];
}

export const RoomSlotsGenerator: React.FC<RoomSlotsGeneratorProps> = ({
  roomId,
  centerId,
  onSlotsGenerated,
}) => {
  const [showGenerator, setShowGenerator] = useState(false);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [slotDuration, setSlotDuration] = useState('30');

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const generateTimeSlots = (start: string, end: string, duration: number): string[] => {
    const slots: string[] = [];
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    
    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    while (currentMinutes < endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const minutes = currentMinutes % 60;
      slots.push(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
      currentMinutes += duration;
    }
    
    return slots;
  };

  const handleGenerateSlots = async () => {
    if (!startDate || !endDate || selectedDays.length === 0) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      showToast('Start date must be before end date', 'error');
      return;
    }

    try {
      setLoading(true);

      const timeSlots = generateTimeSlots(startTime, endTime, parseInt(slotDuration));
      const slotConfigs: SlotConfig[] = selectedDays.map(day => ({
        day,
        slots: timeSlots
      }));

      const response = await fetch('/api/room-slots/slots/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          center_id: centerId,
          room_id: roomId,
          start_date: startDate,
          end_date: endDate,
          slot_configs: slotConfigs
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate slots');
      }

      const result = await response.json();
      showToast(result.message, 'success');
      setShowGenerator(false);
      
      // Reset form
      setStartDate('');
      setEndDate('');
      setSelectedDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
      setStartTime('09:00');
      setEndTime('17:00');
      setSlotDuration('30');
      
      onSlotsGenerated?.();
    } catch (err: any) {
      showToast(err.message || 'Failed to generate slots', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowGenerator(true)}
        className="gap-2"
      >
        <Calendar className="w-4 h-4" />
        Generate Slots
      </Button>

      <Dialog open={showGenerator} onOpenChange={setShowGenerator}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Room Slots</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="duration">Slot Duration (min)</Label>
                <Select value={slotDuration} onValueChange={setSlotDuration}>
                  <SelectTrigger id="duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Days Selection */}
            <div>
              <Label>Days of Week</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                {DAYS_OF_WEEK.map(day => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={day}
                      checked={selectedDays.includes(day)}
                      onCheckedChange={() => handleDayToggle(day)}
                    />
                    <label
                      htmlFor={day}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {day}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 p-4 rounded">
              <h4 className="font-semibold mb-2">Preview</h4>
              <p className="text-sm text-gray-600">
                Creating slots from <strong>{startDate}</strong> to <strong>{endDate}</strong>
              </p>
              <p className="text-sm text-gray-600">
                Time: <strong>{startTime}</strong> - <strong>{endTime}</strong> ({slotDuration} min intervals)
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Days: <strong>{selectedDays.join(', ')}</strong>
              </p>
              <div className="mt-3 text-sm">
                <p className="font-medium">Sample slots for a single day:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {generateTimeSlots(startTime, endTime, parseInt(slotDuration))
                    .slice(0, 5)
                    .map((time, idx) => (
                      <span key={idx} className="bg-white px-2 py-1 rounded text-xs border">
                        {time}
                      </span>
                    ))}
                  {generateTimeSlots(startTime, endTime, parseInt(slotDuration)).length > 5 && (
                    <span className="text-xs text-gray-500">
                      +{generateTimeSlots(startTime, endTime, parseInt(slotDuration)).length - 5} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerator(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleGenerateSlots} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Generate Slots
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
