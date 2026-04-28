// Page component for the rooms screen in the crm feature.

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { roomAPI } from '@/shared/api/api';
import {
  setRoomsPageEditingId,
  setRoomsPageModalOpen,
  setRoomsPageSubmitting,
} from '../../../slices/pagesUiSlice';
import { useAppDispatch, useAppSelector } from '../hooks';
import { fetchRooms, fetchRoomsForce } from '../../../slices/roomsSlice';
import { fetchClasses } from '../../../slices/classesSlice';
import { showToast } from '@/utils/toast';
import { selectRoomsPageUi } from '../../../store/selectors';

const weekDays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

// Renders the rooms page screen.
const RoomsPage = () => {
  const dispatch = useAppDispatch();
  const rooms = useAppSelector(state => state.rooms.items);
  const classes = useAppSelector(state => state.classes.items);
  const roomsUi = useAppSelector(selectRoomsPageUi);
  const { isModalOpen, editingId, submitting } = roomsUi;
  const loading = useAppSelector(state => state.rooms.loading || state.classes.loading || submitting);
  const error = useAppSelector(state => state.rooms.error || state.classes.error);
  const [formData, setFormData] = useState({
    room_number: '',
    class_id: '',
    day: 'Monday',
    time: '09:00',
  });

// Runs side effects for this component.
  useEffect(() => {
    dispatch(fetchRooms());
    dispatch(fetchClasses());
  }, [dispatch]);

// Handles open modal.
  const handleOpenModal = (room?: any) => {
    if (room) {
      dispatch(setRoomsPageEditingId(room.room_id));
      setFormData({
        room_number: room.room_number,
        class_id: room.class_id ? String(room.class_id) : 'none',
        day: room.day,
        time: room.time?.substring(0, 5) || '09:00',
      });
    } else {
      dispatch(setRoomsPageEditingId(null));
      setFormData({
        room_number: '',
        class_id: 'none',
        day: 'Monday',
        time: '09:00',
      });
    }
    dispatch(setRoomsPageModalOpen(true));
  };

// Handles close modal.
  const handleCloseModal = () => {
    dispatch(setRoomsPageModalOpen(false));
    dispatch(setRoomsPageEditingId(null));
  };

// Handles submit.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setRoomsPageSubmitting(true));
    try {
      const payload = {
        ...formData,
        class_id: formData.class_id === 'none' ? null : Number(formData.class_id),
      };

      if (editingId) {
        await roomAPI.update(editingId, payload);
        showToast.success('Room updated successfully');
      } else {
        await roomAPI.create(payload);
        showToast.success('Room created successfully');
      }
      handleCloseModal();
      dispatch(fetchRoomsForce());
    } catch (err: any) {
      showToast.error(err.response?.data?.error || 'Operation failed');
    } finally {
      dispatch(setRoomsPageSubmitting(false));
    }
  };

// Handles delete.
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this room assignment?')) return;
    dispatch(setRoomsPageSubmitting(true));
    try {
      await roomAPI.delete(id);
      showToast.success('Room assignment deleted');
      dispatch(fetchRoomsForce());
    } catch (err: any) {
      showToast.error('Failed to delete room');
    } finally {
      dispatch(setRoomsPageSubmitting(false));
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Room Management</h1>
          <p className="text-sm text-muted-foreground">Manage class assignments to physical rooms.</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Room Assignment
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && rooms.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Physical Rooms & Schedules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room Number</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No room assignments found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rooms.map((room) => (
                      <TableRow key={room.room_id}>
                        <TableCell className="font-semibold">{room.room_number}</TableCell>
                        <TableCell>{room.class_name || 'Unassigned'}</TableCell>
                        <TableCell>{room.day}</TableCell>
                        <TableCell>{room.time?.substring(0, 5)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenModal(room)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(room.room_id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Room Dialog */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseModal();
            return;
          }
          dispatch(setRoomsPageModalOpen(true));
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Room Assignment' : 'Add New Room Assignment'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room_number">Room Number *</Label>
              <Input
                id="room_number"
                required
                placeholder="e.g. Room 101"
                value={formData.room_number}
                onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="class_id">Assigned Class</Label>
              <Select
                value={formData.class_id}
                onValueChange={(val) => setFormData({ ...formData, class_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.class_id || cls.id} value={String(cls.class_id || cls.id)}>
                      {cls.class_name} ({cls.class_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="day">Day *</Label>
                <Select
                  value={formData.day}
                  onValueChange={(val) => setFormData({ ...formData, day: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {weekDays.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time *</Label>
                <Input
                  id="time"
                  type="time"
                  required
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoomsPage;
