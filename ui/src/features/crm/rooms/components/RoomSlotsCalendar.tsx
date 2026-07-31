import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, BookCheck, X } from 'lucide-react';
import { useRoomSlots } from '../hooks/useRoomSlots';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { showToast } from '@/utils/toast';

interface RoomSlotsCalendarProps {
  roomId: number;
  centerId: number;
  roomNumber: string;
}

export const RoomSlotsCalendar: React.FC<RoomSlotsCalendarProps> = ({
  roomId,
  centerId,
  roomNumber,
}) => {
  const { slots, bookings, loading, fetchSlots, fetchBookings, createSlot, bookSlot, cancelBooking } = useRoomSlots(roomId, centerId);
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showCreateSlot, setShowCreateSlot] = useState(false);
  const [showBookSlot, setShowBookSlot] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [newSlotTime, setNewSlotTime] = useState({ start: '09:00', end: '09:30' });
  const [bookingClassId, setBookingClassId] = useState('');
  const [classes, setClasses] = useState<any[]>([]);

  // Fetch slots for the month when component mounts or month changes
  useEffect(() => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().split('T')[0];
    
    fetchSlots(firstDay, lastDay);
    fetchBookings(firstDay, lastDay);
  }, [currentMonth, fetchSlots, fetchBookings]);

  // Fetch classes for booking dropdown
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await fetch(`/api/classes?center_id=${centerId}`);
        const data = await response.json();
        setClasses(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch classes:', err);
      }
    };
    fetchClasses();
  }, [centerId]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const prevMonthDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const getDateSlots = (day: number) => {
    const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      .toISOString()
      .split('T')[0];
    return slots.filter(s => s.slot_date === dateStr);
  };

  const getDateBookings = (day: number) => {
    const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      .toISOString()
      .split('T')[0];
    return bookings.filter(b => b.slot_date === dateStr);
  };

  const handleCreateSlot = async () => {
    if (!selectedDate) return;
    
    try {
      await createSlot({
        room_id: roomId,
        slot_date: selectedDate,
        start_time: newSlotTime.start,
        end_time: newSlotTime.end,
        duration_minutes: 30
      });
      
      showToast.success('Slot created successfully');
      setShowCreateSlot(false);
      setNewSlotTime({ start: '09:00', end: '09:30' });
      
      const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().split('T')[0];
      fetchSlots(firstDay, lastDay);
    } catch (err) {
      showToast.error('Failed to create slot');
    }
  };

  const handleBookSlot = async () => {
    if (!selectedSlotId || !bookingClassId) {
      showToast.error('Please select both slot and class');
      return;
    }
    
    try {
      await bookSlot(selectedSlotId, parseInt(bookingClassId));
      showToast.success('Slot booked successfully');
      setShowBookSlot(false);
      setBookingClassId('');
    } catch (err: any) {
      showToast.error(err.message || 'Failed to book slot');
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
      await cancelBooking(bookingId);
      showToast.success('Booking cancelled successfully');
    } catch (err: any) {
      showToast.error(err.message || 'Failed to cancel booking');
    }
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Room {roomNumber} - Slots Schedule
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            >
              ←
            </Button>
            <span className="text-sm font-medium w-32 text-center">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            >
              →
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <>
            {/* Calendar Grid */}
            <div className="mb-8">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map(day => (
                  <div key={day} className="text-center font-semibold text-sm py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {prevMonthDays.map((_, i) => (
                  <div key={`prev-${i}`} className="aspect-square p-2 bg-gray-50 rounded border" />
                ))}
                
                {days.map(day => {
                  const daySlots = getDateSlots(day);
                  const dayBookings = getDateBookings(day);
                  const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                    .toISOString()
                    .split('T')[0];
                  
                  return (
                    <div
                      key={day}
                      className="aspect-square p-2 border rounded hover:bg-blue-50 cursor-pointer transition"
                      onClick={() => {
                        setSelectedDate(dateStr);
                        setShowCreateSlot(true);
                      }}
                    >
                      <div className="text-sm font-semibold mb-1">{day}</div>
                      <div className="text-xs space-y-0.5">
                        {daySlots.length > 0 && (
                          <Badge variant={daySlots.some(s => s.is_available) ? 'secondary' : 'destructive'} className="text-xs">
                            {daySlots.filter(s => s.is_available).length} available
                          </Badge>
                        )}
                        {dayBookings.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {dayBookings.length} booked
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Slots List */}
            {selectedDate && getDateSlots(parseInt(selectedDate.split('-')[2])) && (
              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">
                  Slots for {new Date(selectedDate).toLocaleDateString('default', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h3>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {getDateSlots(parseInt(selectedDate.split('-')[2])).map(slot => {
                    const booking = bookings.find(b => b.slot_id === slot.slot_id);
                    
                    return (
                      <div
                        key={slot.slot_id}
                        className={`flex items-center justify-between p-3 rounded border ${
                          booking ? 'bg-red-50' : 'bg-green-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="text-sm font-medium">
                              {slot.start_time} - {slot.end_time}
                            </div>
                            {booking && (
                              <div className="text-xs text-gray-600">
                                Booked by: {booking.class_name}
                              </div>
                            )}
                          </div>
                          <Badge variant={booking ? 'destructive' : 'success'}>
                            {booking ? 'Booked' : 'Available'}
                          </Badge>
                        </div>
                        
                        <div className="flex gap-2">
                          {!booking && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedSlotId(slot.slot_id);
                                setShowBookSlot(true);
                              }}
                            >
                              <BookCheck className="w-4 h-4" />
                            </Button>
                          )}
                          {booking && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleCancelBooking(booking.booking_id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Create Slot Dialog */}
      <Dialog open={showCreateSlot} onOpenChange={setShowCreateSlot}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Slot</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Input value={selectedDate || ''} disabled />
            </div>
            <div>
              <Label>Start Time</Label>
              <Input
                type="time"
                value={newSlotTime.start}
                onChange={(e) => setNewSlotTime({ ...newSlotTime, start: e.target.value })}
              />
            </div>
            <div>
              <Label>End Time</Label>
              <Input
                type="time"
                value={newSlotTime.end}
                onChange={(e) => setNewSlotTime({ ...newSlotTime, end: e.target.value })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSlot(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSlot}>
              Create Slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Book Slot Dialog */}
      <Dialog open={showBookSlot} onOpenChange={setShowBookSlot}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book Room Slot</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Class</Label>
              <Select value={bookingClassId} onValueChange={setBookingClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    <SelectItem key={cls.class_id} value={cls.class_id.toString()}>
                      {cls.class_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookSlot(false)}>
              Cancel
            </Button>
            <Button onClick={handleBookSlot}>
              Book Slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
