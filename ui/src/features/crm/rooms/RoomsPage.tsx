// Page component for the rooms screen in the crm feature.

import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Pencil, Trash2, Loader2, Building2, DoorOpen, Upload, Download, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getErrorMessage } from '@/utils/errorMessage';
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
import { roomAPI } from './api';
import { formatGroupLabel } from '@/shared/groupLabel';
import {
  setRoomsPageEditingId,
  setRoomsPageModalOpen,
  setRoomsPageSubmitting,
} from '../../../slices/pagesUiSlice';
import { useAppDispatch, useAppSelector } from '../hooks';
import { fetchRooms, fetchRoomsForce } from '../../../slices/roomsSlice';
import { fetchClasses } from '../../../slices/classesSlice';
import { fetchTeachers } from '../../../slices/teachersSlice';
import { showToast } from '@/utils/toast';
import { selectRoomsPageUi, selectTeacherOptions } from '../../../store/selectors';
import { exportCsvEntity, importCsvEntity } from '@/shared/dataCsv';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { buildAssignedClassGroups, buildRoomGroups, filterClassesByTeacher, normalizeRoomAssignments } from './roomModel';

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
  const teacherOptions = useAppSelector(selectTeacherOptions);
  const roomsUi = useAppSelector(selectRoomsPageUi);
  const { isModalOpen, editingId, submitting } = roomsUi;
  const loading = useAppSelector(state => state.rooms.loading || state.classes.loading || submitting);
  const error = useAppSelector(state => state.rooms.error || state.classes.error);
  const [formData, setFormData] = useState({
    room_number: '',
    class_id: '',
    day: 'Monday',
    time: '09:00',
    end_time: '10:00',
  });
  const [isImporting, setIsImporting] = useState(false);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>('');
  const [dialogMode, setDialogMode] = useState<'room' | 'assignment'>('room');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { t } = useLanguage();

  const normalizedRooms = useMemo(() => normalizeRoomAssignments(rooms), [rooms]);
  const roomGroups = useMemo(() => buildRoomGroups(normalizedRooms), [normalizedRooms]);
  const teacherClasses = useMemo(
    () => filterClassesByTeacher(classes, selectedTeacherId),
    [classes, selectedTeacherId],
  );

  const selectedRoom = useMemo(
    () => roomGroups.find((room) => room.roomNumber === selectedRoomNumber) || roomGroups[0] || null,
    [roomGroups, selectedRoomNumber]
  );

  const selectedRoomClasses = useMemo(() => {
    if (!selectedRoom) return [];
    return buildAssignedClassGroups(selectedRoom.assignments);
  }, [selectedRoom]);

// Runs side effects for this component.
  useEffect(() => {
    if (!selectedRoomNumber && roomGroups[0]?.roomNumber) {
      setSelectedRoomNumber(roomGroups[0].roomNumber);
    }
  }, [roomGroups, selectedRoomNumber]);


// Runs side effects for this component.
  useEffect(() => {
    dispatch(fetchRooms());
    dispatch(fetchClasses());
    dispatch(fetchTeachers());
  }, [dispatch]);

// Handles open modal.
  const handleOpenModal = (room?: any, mode: 'room' | 'assignment' = room?.class_id ? 'assignment' : 'room') => {
    setDialogMode(mode);
    const currentClass = room?.class_id
      ? classes.find((item) => Number(item.class_id || item.id) === Number(room.class_id))
      : null;
    setSelectedTeacherId(currentClass?.teacher_id ? String(currentClass.teacher_id) : '');
    if (room) {
      dispatch(setRoomsPageEditingId(room.room_id || null));
      setFormData({
        room_number: room.room_number || '',
        class_id: room.class_id ? String(room.class_id) : mode === 'assignment' ? '' : 'none',
        day: room.day || 'Monday',
        time: room.time?.substring(0, 5) || '09:00',
        end_time: room.end_time?.substring(0, 5) || '10:00',
      });
    } else {
      dispatch(setRoomsPageEditingId(null));
      setFormData({
        room_number: mode === 'assignment' ? selectedRoom?.roomNumber || '' : '',
        class_id: mode === 'assignment' ? '' : 'none',
        day: 'Monday',
        time: '09:00',
        end_time: '10:00',
      });
    }
    dispatch(setRoomsPageModalOpen(true));
  };

// Handles close modal.
  const handleCloseModal = () => {
    dispatch(setRoomsPageModalOpen(false));
    dispatch(setRoomsPageEditingId(null));
    setSelectedTeacherId('');
  };

// Handles submit.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId && dialogMode === 'room' && roomGroups.some((room) => room.roomNumber.toLowerCase() === formData.room_number.trim().toLowerCase())) {
      showToast.error('A room with this name already exists');
      return;
    }
    if (dialogMode === 'assignment' && (!selectedTeacherId || !formData.class_id)) {
      showToast.error('Choose a teacher and group');
      return;
    }
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
        showToast.success(dialogMode === 'room' ? 'Room created successfully' : 'Class assigned to room');
      }
      handleCloseModal();
      dispatch(fetchRoomsForce());
    } catch (err: any) {
      const status = err.response?.status;
      showToast.error(
        status === 409
          ? 'Room is not available for this time.'
          : err.response?.data?.error || 'Operation failed'
      );
    } finally {
      dispatch(setRoomsPageSubmitting(false));
    }
  };

  const handleDeleteRoom = async () => {
    if (!selectedRoom) return;
    if (!window.confirm(`Delete room ${selectedRoom.roomNumber} and all ${selectedRoom.assignmentCount} assignment(s)?`)) return;
    dispatch(setRoomsPageSubmitting(true));
    try {
      await Promise.all(selectedRoom.allRows.map((row: any) => roomAPI.delete(row.room_id)));
      setSelectedRoomNumber('');
      showToast.success('Room deleted successfully');
      await dispatch(fetchRoomsForce());
    } catch {
      showToast.error('Failed to delete room');
    } finally {
      dispatch(setRoomsPageSubmitting(false));
    }
  };

// Handles delete.
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this room assignment?')) return;
    dispatch(setRoomsPageSubmitting(true));
    try {
      const deletedRow = normalizedRooms.find((room) => Number(room.room_id) === Number(id));
      await roomAPI.delete(id);
      const roomRows = normalizedRooms.filter((room) => room.room_number === deletedRow?.room_number);
      if (deletedRow?.class_id && roomRows.length === 1) {
        await roomAPI.create({
          room_number: deletedRow.room_number,
          class_id: null,
          day: 'Monday',
          time: '09:00',
          end_time: '10:00',
        });
      }
      showToast.success('Room assignment deleted');
      dispatch(fetchRoomsForce());
    } catch {
      showToast.error('Failed to delete room');
    } finally {
      dispatch(setRoomsPageSubmitting(false));
    }
  };

  const handleImportRooms = async (file?: File) => {
    setIsImporting(true);
    const imported = await importCsvEntity('rooms', 'Rooms', file);
    if (imported) dispatch(fetchRoomsForce());
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportRooms = () => exportCsvEntity('rooms', 'Rooms');

  const renderSelectedRoomDetails = () => (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950 shadow-sm dark:border-border dark:bg-card dark:text-card-foreground">
      <div className="mb-3 grid gap-2 lg:grid-cols-[220px_1fr]">
        <div className="rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 p-3 text-white shadow-md">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
              <DoorOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-white/75">Selected room</p>
              <h3 className="text-xl font-black">{selectedRoom?.roomNumber}</h3>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
            <div className="rounded-md bg-white/18 p-1.5">
              <p className="text-lg font-black">{selectedRoom?.classCount || 0}</p>
              <p className="text-[9px] font-bold text-white/75">Classes</p>
            </div>
            <div className="rounded-md bg-white/18 p-1.5">
              <p className="text-lg font-black">{selectedRoom?.assignmentCount || 0}</p>
              <p className="text-[9px] font-bold text-white/75">Slots</p>
            </div>
            <div className="rounded-md bg-white/18 p-1.5">
              <p className="text-lg font-black">{selectedRoom?.dayCount || 0}</p>
              <p className="text-[9px] font-bold text-white/75">Days</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-border dark:bg-muted/20 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-lg font-black text-slate-950 dark:text-card-foreground">Registered classes</h3>
            <p className="text-xs text-muted-foreground">Compact schedule list for this room.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleOpenModal({ room_number: selectedRoom?.roomNumber }, 'assignment')}>
              <Plus className="mr-2 h-4 w-4" />Assign class
            </Button>
            <Button size="sm" variant="destructive" onClick={handleDeleteRoom}>
              <Trash2 className="mr-2 h-4 w-4" />Delete room
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {selectedRoomClasses.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No classes assigned yet. Use “Assign class” to add the first schedule.
          </div>
        ) : selectedRoomClasses.map((group, index) => (
          <div key={group.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
            <div className="flex items-center justify-between gap-2 border-b bg-slate-50 px-3 py-2 dark:bg-muted/20">
              <div className="flex min-w-0 items-center gap-2">
                <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-black text-white', index % 3 === 0 ? 'bg-blue-600' : index % 3 === 1 ? 'bg-emerald-600' : 'bg-orange-500')}>
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-950 dark:text-card-foreground">{group.name}</p>
                  <p className="text-xs font-semibold text-muted-foreground">{group.assignments.length} scheduled slot(s)</p>
                </div>
              </div>
              <Users className="h-5 w-5 text-slate-400" />
            </div>
            <div className="divide-y">
              {group.assignments.map((assignment: any) => (
                <div key={assignment.room_id} className="grid gap-2 px-3 py-2 text-sm md:grid-cols-[1fr_120px_110px_auto] md:items-center">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-card-foreground">{assignment.class_name || 'Unassigned'}</p>
                    <p className="text-xs text-muted-foreground">Assignment #{assignment.room_id}</p>
                  </div>
                  <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-black text-cyan-700 dark:bg-muted dark:text-card-foreground">
                    {assignment.day || 'No day'}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-600 dark:text-muted-foreground">
                    {assignment.time?.substring(0, 5)} - {(assignment.end_time || '').substring(0, 5) || '-'}
                  </span>
                  <div className="flex justify-start gap-1 md:justify-end">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(assignment)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(assignment.room_id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/70 to-emerald-50/55 p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.65)] dark:border-border dark:bg-card dark:bg-none dark:shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 dark:hidden" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-72 bg-gradient-to-l from-fuchsia-100/45 via-amber-100/35 to-transparent dark:hidden" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-900/10 dark:shadow-none">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-950 dark:text-foreground">Room Management</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => handleImportRooms(event.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="border-white/80 bg-white/80 shadow-sm dark:border-border dark:bg-background dark:shadow-none"
            >
              {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {isImporting ? t('Importing...') : t('Import CSV')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleExportRooms}
              className="border-white/80 bg-white/80 shadow-sm dark:border-border dark:bg-background dark:shadow-none"
            >
              <Download className="mr-2 h-4 w-4" />
              {t('Export CSV')}
            </Button>
            <Button onClick={() => handleOpenModal()} className="bg-gradient-to-br from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 font-semibold shadow-lg shadow-indigo-900/10 dark:shadow-none">
              <Plus className="mr-2 h-4 w-4" />
              Create Room
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{getErrorMessage(error)}</AlertDescription>
        </Alert>
      )}

      {loading && rooms.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="overflow-hidden border-slate-200/80 bg-white shadow-[0_18px_50px_-38px_rgba(15,23,42,0.6)] dark:border-border dark:bg-card dark:shadow-sm">
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 dark:hidden" />
          <CardHeader className="bg-gradient-to-r from-sky-50/80 via-white to-emerald-50/70 dark:bg-none">
            <CardTitle className="text-xl flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-100 to-emerald-100 text-sky-700 dark:bg-muted dark:bg-none dark:text-muted-foreground">
                <Building2 className="h-5 w-5" />
              </span>
              Physical Rooms & Schedules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {rooms.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center text-muted-foreground dark:border-border dark:bg-muted/20">
                No room assignments found.
              </div>
            ) : (
              <>
                <div className="-mx-2 overflow-x-auto px-2 pb-2">
                  <div className="flex min-w-max gap-2">
                  {roomGroups.map((room, index) => {
                    const active = room.roomNumber === selectedRoom?.roomNumber;
                    const tones = [
                      'from-blue-600 to-cyan-500',
                      'from-emerald-600 to-teal-500',
                      'from-orange-500 to-amber-400',
                      'from-fuchsia-600 to-violet-500',
                      'from-rose-600 to-pink-500',
                    ];
                    return (
                      <button
                        key={room.roomNumber}
                        type="button"
                        onClick={() => setSelectedRoomNumber(room.roomNumber)}
                        className={cn(
                          'w-36 shrink-0 rounded-xl border bg-gradient-to-br p-3 text-left text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
                          active
                            ? 'border-white/80 ring-2 ring-slate-900/15'
                            : 'border-transparent',
                          tones[index % tones.length]
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[10px] font-black uppercase text-white/80">Room</p>
                            <p className="mt-0.5 text-xl font-black text-white">
                              {room.roomNumber}
                            </p>
                          </div>
                          <DoorOpen className="h-5 w-5 text-white/90" />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-1.5 text-[10px] font-bold">
                          <span className="rounded-md bg-white/22 px-1.5 py-1 text-white">
                            {room.classCount} classes
                          </span>
                          <span className="rounded-md bg-white/22 px-1.5 py-1 text-white">
                            {room.dayCount} days
                          </span>
                        </div>
                      </button>
                    );
                  })}
                  </div>
                </div>
                {renderSelectedRoomDetails()}
              </>
            )}
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
            <DialogTitle>{editingId ? 'Edit Room Assignment' : dialogMode === 'room' ? 'Create Room' : 'Assign Class to Room'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room_number">Room Number *</Label>
              <Input
                id="room_number"
                required
                placeholder="e.g. Room 101"
                value={formData.room_number}
                disabled={dialogMode === 'assignment' && !editingId}
                onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
              />
            </div>

            {dialogMode === 'assignment' && <div className="space-y-2">
              <Label htmlFor="teacher_id">Teacher *</Label>
              <Select
                value={selectedTeacherId}
                onValueChange={(value) => {
                  setSelectedTeacherId(value);
                  setFormData({ ...formData, class_id: '' });
                }}
              >
                <SelectTrigger id="teacher_id">
                  <SelectValue placeholder="Choose a teacher first" />
                </SelectTrigger>
                <SelectContent>
                  {teacherOptions.map((teacher) => (
                    <SelectItem key={teacher.id} value={String(teacher.value)}>
                      {teacher.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>}

            {dialogMode === 'assignment' && <div className="space-y-2">
              <Label htmlFor="class_id">Group *</Label>
              <Select
                value={formData.class_id}
                onValueChange={(val) => setFormData({ ...formData, class_id: val })}
                disabled={!selectedTeacherId}
              >
                <SelectTrigger id="class_id">
                  <SelectValue placeholder={selectedTeacherId ? 'Choose a group' : 'Choose a teacher first'} />
                </SelectTrigger>
                <SelectContent>
                  {teacherClasses.map((cls) => (
                    <SelectItem key={cls.class_id || cls.id} value={String(cls.class_id || cls.id)}>
                      {formatGroupLabel(cls)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTeacherId && teacherClasses.length === 0 && (
                <p className="text-xs text-muted-foreground">This teacher has no groups.</p>
              )}
            </div>}

            {dialogMode === 'assignment' && <div className="grid gap-3 md:grid-cols-3">
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
                <Label htmlFor="time">Start Time *</Label>
                <Input
                  id="time"
                  type="time"
                  required
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time *</Label>
                <Input
                  id="end_time"
                  type="time"
                  required
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Availability is checked for the whole time range.
                </p>
              </div>
            </div>}

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
