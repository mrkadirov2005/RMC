// Page component for the rooms screen in the crm feature.

import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Pencil, Trash2, Loader2, Building2, CalendarDays, DoorOpen, Clock, Upload, Download } from 'lucide-react';
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
import { exportCsvEntity, importCsvEntity } from '@/shared/dataCsv';
import { useLanguage } from '@/i18n/LanguageContext';

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
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { t } = useLanguage();
  const summaryCards = useMemo(() => {
    const uniqueRooms = new Set(rooms.map((room: any) => String(room.room_number || '').trim()).filter(Boolean)).size;
    const assignedRooms = rooms.filter((room: any) => room.class_id || room.class_name).length;
    const activeDays = new Set(rooms.map((room: any) => String(room.day || '').trim()).filter(Boolean)).size;
    const scheduledTimes = new Set(rooms.map((room: any) => String(room.time || '').substring(0, 5)).filter(Boolean)).size;

    return [
      {
        label: 'Assignments',
        value: rooms.length.toLocaleString(),
        detail: `${assignedRooms.toLocaleString()} assigned`,
        icon: Building2,
        shell: 'from-indigo-50 via-white to-sky-50 border-indigo-100',
        iconShell: 'from-indigo-500 to-sky-500',
        text: 'text-indigo-950',
      },
      {
        label: 'Rooms',
        value: uniqueRooms.toLocaleString(),
        detail: 'Physical spaces',
        icon: DoorOpen,
        shell: 'from-emerald-50 via-white to-teal-50 border-emerald-100',
        iconShell: 'from-emerald-500 to-teal-500',
        text: 'text-emerald-950',
      },
      {
        label: 'Active days',
        value: activeDays.toLocaleString(),
        detail: 'Weekly schedule',
        icon: CalendarDays,
        shell: 'from-amber-50 via-white to-orange-50 border-amber-100',
        iconShell: 'from-amber-500 to-orange-500',
        text: 'text-amber-950',
      },
      {
        label: 'Time slots',
        value: scheduledTimes.toLocaleString(),
        detail: 'Unique starts',
        icon: Clock,
        shell: 'from-cyan-50 via-white to-fuchsia-50 border-cyan-100',
        iconShell: 'from-cyan-500 to-fuchsia-500',
        text: 'text-slate-950',
      },
    ];
  }, [rooms]);

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

  const handleImportRooms = async (file?: File) => {
    setIsImporting(true);
    const imported = await importCsvEntity('rooms', 'Rooms', file);
    if (imported) dispatch(fetchRoomsForce());
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportRooms = () => exportCsvEntity('rooms', 'Rooms');

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
              <p className="mt-1 text-sm text-muted-foreground">Manage class assignments to physical rooms and schedule slots.</p>
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
              Add Room Assignment
            </Button>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`rounded-lg border bg-gradient-to-br ${card.shell} p-4 shadow-sm dark:border-border dark:bg-card dark:bg-none dark:shadow-none`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">{card.label}</p>
                    <p className={`mt-1 text-2xl font-bold ${card.text} dark:text-card-foreground`}>{card.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{card.detail}</p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${card.iconShell} text-white shadow-md shadow-slate-900/10 dark:shadow-none`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            );
          })}
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
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-border dark:bg-card">
              <Table>
                <TableHeader className="bg-slate-50/90 dark:bg-transparent">
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
                      <TableRow key={room.room_id} className="hover:bg-sky-50/60 dark:hover:bg-muted/50">
                        <TableCell className="font-semibold text-slate-950 dark:text-card-foreground">
                          <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-indigo-700 dark:bg-muted dark:text-card-foreground">
                            {room.room_number}
                          </span>
                        </TableCell>
                        <TableCell className={room.class_name ? 'font-medium' : 'text-muted-foreground'}>{room.class_name || 'Unassigned'}</TableCell>
                        <TableCell>{room.day}</TableCell>
                        <TableCell className="font-mono text-sm text-cyan-700 dark:text-muted-foreground">{room.time?.substring(0, 5)}</TableCell>
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
