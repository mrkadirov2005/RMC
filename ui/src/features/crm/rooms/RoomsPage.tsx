import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { getErrorMessage } from '@/utils/errorMessage';
import { showToast } from '@/utils/toast';
import { exportCsvEntity, importCsvEntity } from '@/shared/dataCsv';
import { setRoomsPageEditingId, setRoomsPageModalOpen, setRoomsPageSubmitting } from '../../../slices/pagesUiSlice';
import { fetchRooms, fetchRoomsForce } from '../../../slices/roomsSlice';
import { fetchClasses } from '../../../slices/classesSlice';
import { fetchStudents } from '../../../slices/studentsSlice';
import { fetchTeachers } from '../../../slices/teachersSlice';
import { selectRoomsPageUi, selectTeacherOptions } from '../../../store/selectors';
import { useAppDispatch, useAppSelector } from '../hooks';
import { roomAPI } from './api';
import { buildRoomGroups, filterClassesByTeacher, normalizeRoomAssignments, type RoomAssignment } from './roomModel';
import type { RoomsTab } from './types';
import { RoomsWorkspaceHeader } from './components/RoomsWorkspaceHeader';
import { RoomsWorkspaceTabs } from './components/RoomsWorkspaceTabs';
import { RoomStatisticsTab } from './components/RoomStatisticsTab';
import { RoomManagementTab } from './components/RoomManagementTab';
import { RoomHistoryTab } from './components/RoomHistoryTab';
import { RoomAssignmentDialog, type RoomFormData } from './components/RoomAssignmentDialog';

const emptyForm = (): RoomFormData => ({ room_number: '', capacity: '', class_id: '', day: 'Monday', time: '09:00', end_time: '10:00' });

const RoomsPage = () => {
  const dispatch = useAppDispatch();
  const rooms = useAppSelector((state) => state.rooms.items);
  const classes = useAppSelector((state) => state.classes.items);
  const students = useAppSelector((state) => state.students.items);
  const teacherOptions = useAppSelector(selectTeacherOptions);
  const { isModalOpen, editingId, submitting } = useAppSelector(selectRoomsPageUi);
  const storeLoading = useAppSelector((state) => state.rooms.loading || state.classes.loading);
  const error = useAppSelector((state) => state.rooms.error || state.classes.error);
  const [tab, setTab] = useState<RoomsTab>('statistics');
  const [form, setForm] = useState<RoomFormData>(emptyForm);
  const [mode, setMode] = useState<'room' | 'assignment'>('room');
  const [teacherId, setTeacherId] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const normalizedRooms = useMemo(() => normalizeRoomAssignments(rooms), [rooms]);
  const roomGroups = useMemo(() => buildRoomGroups(normalizedRooms), [normalizedRooms]);
  const teacherClasses = useMemo(() => filterClassesByTeacher(classes, teacherId), [classes, teacherId]);
  const teacherFilters = useMemo(() => teacherOptions.map((teacher) => ({ id: String(teacher.value), label: teacher.label })), [teacherOptions]);

  useEffect(() => { dispatch(fetchRooms()); dispatch(fetchClasses()); dispatch(fetchTeachers()); dispatch(fetchStudents()); }, [dispatch]);
  useEffect(() => { if (!selectedRoom && roomGroups[0]) setSelectedRoom(roomGroups[0].roomNumber); }, [selectedRoom, roomGroups]);

  const openDialog = (row?: RoomAssignment, dialogMode: 'room' | 'assignment' = row?.class_id ? 'assignment' : 'room') => {
    setMode(dialogMode);
    const group = row?.class_id ? classes.find((item: any) => Number(item.class_id || item.id) === Number(row.class_id)) : null;
    setTeacherId(group?.teacher_id ? String(group.teacher_id) : '');
    setForm(row ? { room_number: row.room_number || '', capacity: row.capacity ? String(row.capacity) : '', class_id: row.class_id ? String(row.class_id) : '', day: row.day || 'Monday', time: String(row.time || '09:00').slice(0, 5), end_time: String(row.end_time || '10:00').slice(0, 5) } : { ...emptyForm(), room_number: dialogMode === 'assignment' ? selectedRoom : '' });
    dispatch(setRoomsPageEditingId(row?.room_id || null));
    dispatch(setRoomsPageModalOpen(true));
  };
  const closeDialog = () => { dispatch(setRoomsPageModalOpen(false)); dispatch(setRoomsPageEditingId(null)); setTeacherId(''); };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingId && mode === 'room' && roomGroups.some((room) => room.roomNumber.toLowerCase() === form.room_number.trim().toLowerCase())) return showToast.error('A room with this name already exists');
    if (mode === 'assignment' && (!teacherId || !form.class_id)) return showToast.error('Choose a teacher and group');
    dispatch(setRoomsPageSubmitting(true));
    try {
      const payload = { ...form, capacity: form.capacity ? Number(form.capacity) : undefined, class_id: form.class_id ? Number(form.class_id) : null };
      if (editingId) await roomAPI.update(editingId, payload); else await roomAPI.create(payload);
      showToast.success(editingId ? 'Room assignment updated' : mode === 'room' ? 'Room created' : 'Class assigned to room');
      closeDialog(); await dispatch(fetchRoomsForce());
    } catch (requestError: any) { showToast.error(requestError.response?.status === 409 ? 'Room is not available for this time.' : requestError.response?.data?.error || 'Operation failed'); }
    finally { dispatch(setRoomsPageSubmitting(false)); }
  };

  const deleteAssignment = async (id: number) => {
    if (!window.confirm('Delete this room assignment?')) return;
    dispatch(setRoomsPageSubmitting(true));
    try {
      const row = normalizedRooms.find((item) => item.room_id === id); await roomAPI.delete(id);
      const sameRoom = normalizedRooms.filter((item) => item.room_number === row?.room_number);
      if (row?.class_id && sameRoom.length === 1) await roomAPI.create({ room_number: row.room_number, capacity: row.capacity, class_id: null, day: 'Monday', time: '09:00', end_time: '10:00' });
      showToast.success('Room assignment deleted'); await dispatch(fetchRoomsForce());
    } catch { showToast.error('Failed to delete room assignment'); } finally { dispatch(setRoomsPageSubmitting(false)); }
  };
  const deleteRoom = async () => {
    const room = roomGroups.find((item) => item.roomNumber === selectedRoom); if (!room || !window.confirm(`Delete room ${room.roomNumber} and all assignments?`)) return;
    dispatch(setRoomsPageSubmitting(true));
    try {
      const physicalResponse = await roomAPI.getPhysical();
      const physicalRows = (physicalResponse as any)?.data?.data ?? (physicalResponse as any)?.data ?? physicalResponse;
      const physicalRoom = (Array.isArray(physicalRows) ? physicalRows : []).find((item: any) =>
        String(item.name || '').trim().toLowerCase() === room.roomNumber.trim().toLowerCase()
      );
      await Promise.all(room.allRows.map((row) => roomAPI.delete(row.room_id)));
      if (physicalRoom?.room_id) await roomAPI.deletePhysical(Number(physicalRoom.room_id));
      setSelectedRoom(''); showToast.success('Room deleted'); await dispatch(fetchRoomsForce());
    }
    catch { showToast.error('Failed to delete room'); } finally { dispatch(setRoomsPageSubmitting(false)); }
  };
  const importRooms = async (file?: File) => { setImporting(true); const imported = await importCsvEntity('rooms', 'Rooms', file); if (imported) await dispatch(fetchRoomsForce()); setImporting(false); if (fileRef.current) fileRef.current.value = ''; };
  return <div className="mx-auto max-w-[1600px] space-y-3 px-3 py-4" data-testid="rooms-workspace">
    <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => importRooms(event.target.files?.[0])} />
    <RoomsWorkspaceHeader importing={importing} onImport={() => fileRef.current?.click()} onExport={() => exportCsvEntity('rooms', 'Rooms')} onCreate={() => openDialog()} />
    {error && <Alert variant="destructive"><AlertDescription>{getErrorMessage(error)}</AlertDescription></Alert>}
    <Card className="overflow-hidden">
      <RoomsWorkspaceTabs active={tab} onChange={setTab} />
      {(storeLoading && !rooms.length) ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : <div role="tabpanel" id={`rooms-panel-${tab}`}>
        {tab === 'statistics' && <RoomStatisticsTab rooms={roomGroups} classes={classes} students={students} />}
        {tab === 'management' && <RoomManagementTab rooms={roomGroups} selected={selectedRoom} onSelect={setSelectedRoom} onAssign={() => openDialog({ room_number: selectedRoom, room_id: 0 }, 'assignment')} onEdit={(row) => openDialog(row)} onDeleteAssignment={deleteAssignment} onDeleteRoom={deleteRoom} />}
        {tab === 'reports' && <RoomHistoryTab rooms={roomGroups} selected={selectedRoom} />}
      </div>}
    </Card>
    <RoomAssignmentDialog open={isModalOpen} editing={Boolean(editingId)} mode={mode} submitting={submitting} form={form} teacherId={teacherId} teachers={teacherFilters} classes={teacherClasses} onForm={setForm} onTeacher={setTeacherId} onClose={closeDialog} onSubmit={submit} />
  </div>;
};

export default RoomsPage;
