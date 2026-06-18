import { useState, useCallback } from 'react';

export const useRoomSlots = (roomId?: number, centerId?: number) => {
  const [slots, setSlots] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = useCallback(async (fromDate?: string, toDate?: string) => {
    if (!roomId || !centerId) return;
    
    try {
      setLoading(true);
      const params = new URLSearchParams({ center_id: centerId.toString() });
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      
      const response = await fetch(`/api/room-slots/slots/room/${roomId}?${params}`);
      const data = await response.json();
      setSlots(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [roomId, centerId]);

  const fetchBookings = useCallback(async (fromDate?: string, toDate?: string) => {
    if (!roomId || !centerId) return;
    
    try {
      const params = new URLSearchParams({ center_id: centerId.toString() });
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      
      const response = await fetch(`/api/room-slots/bookings/room/${roomId}?${params}`);
      const data = await response.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to fetch bookings:', err);
    }
  }, [roomId, centerId]);

  const createSlot = useCallback(async (slotData: any) => {
    try {
      const response = await fetch('/api/room-slots/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...slotData, center_id: centerId })
      });
      
      if (!response.ok) throw new Error('Failed to create slot');
      const newSlot = await response.json();
      setSlots([...slots, newSlot]);
      return newSlot;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [slots, centerId]);

  const bookSlot = useCallback(async (slotId: number, classId: number, sessionId?: number, teacherId?: number) => {
    try {
      const response = await fetch('/api/room-slots/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          center_id: centerId,
          slot_id: slotId,
          class_id: classId,
          session_id: sessionId || null,
          teacher_id: teacherId || null
        })
      });
      
      if (!response.ok) throw new Error('Failed to book slot');
      const booking = await response.json();
      
      // Update slot availability
      setSlots(slots.map(s => s.slot_id === slotId ? { ...s, is_available: false } : s));
      setBookings([...bookings, booking]);
      return booking;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [slots, bookings, centerId]);

  const cancelBooking = useCallback(async (bookingId: number) => {
    try {
      const response = await fetch(`/api/room-slots/bookings/${bookingId}?center_id=${centerId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to cancel booking');
      
      const booking = bookings.find(b => b.booking_id === bookingId);
      if (booking) {
        setSlots(slots.map(s => s.slot_id === booking.slot_id ? { ...s, is_available: true } : s));
        setBookings(bookings.filter(b => b.booking_id !== bookingId));
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [bookings, slots, centerId]);

  return {
    slots,
    bookings,
    loading,
    error,
    fetchSlots,
    fetchBookings,
    createSlot,
    bookSlot,
    cancelBooking
  };
};
