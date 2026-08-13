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
import { fetchTeachers } from '../../../slices/teachersSlice';
import { selectRoomsPageUi, selectTeacherOptions } from '../../../store/selectors';
import { useAppDispatch, useAppSelector } from '../hooks';
import { roomAPI } from './api';
import { buildRoomGroups, filterClassesByTeacher, normalizeRoomAssignments, type RoomAssignment } from './roomModel';
import type { RoomAvailabilityRow, RoomsTab } from './types';
import { initialRoomFilters } from './workspaceModel';
import { useRoomsWorkspace } from './hooks/useRoomsWorkspace';
import { RoomsWorkspaceHeader } from './components/RoomsWorkspaceHeader';
import { RoomsWorkspaceTabs } from './components/RoomsWorkspaceTabs';
import { RoomFilters } from './components/RoomFilters';
import { OverviewTab } from './components/OverviewTab';
import { AvailabilityTab } from './components/AvailabilityTab';
import { ScheduleBreakdownTab } from './components/ScheduleBreakdownTab';
import { ReportsTab } from './components/ReportsTab';
import { RoomInventory } from './components/RoomInventory';
import { RoomAssignmentDialog, type RoomFormData } from './components/RoomAssignmentDialog';
import { RoomSlotsPage } from './RoomSlotsManagementPage';

const emptyForm = (): RoomFormData => ({ room_number: '', class_id: '', day: 'Monday', time: '09:00', end_time: '10:00' });

const RoomsPage = () => {
  const dispatch = useAppDispatch();
  const rooms = useAppSelector((state) => state.rooms.items);
  const classes = useAppSelector((state) => state.classes.items);
  const teachers = useAppSelector((state) => state.teachers.items);
  const teacherOptions = useAppSelector(selectTeacherOptions);
  const { isModalOpen, editingId, submitting } = useAppSelector(selectRoomsPageUi);
  const storeLoading = useAppSelector((state) => state.rooms.loading || state.classes.loading);
  const error = useAppSelector((state) => state.rooms.error || state.classes.error);
  const [tab, setTab] = useState<RoomsTab>('overview');
  const [filters, setFilters] = useState(initialRoomFilters);
  const [form, setForm] = useState<RoomFormData>(emptyForm);
  const [mode, setMode] = useState<'room' | 'assignment'>('room');
  const [teacherId, setTeacherId] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [slotRoomId, setSlotRoomId] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const normalizedRooms = useMemo(() => normalizeRoomAssignments(rooms), [rooms]);
  const roomGroups = useMemo(() => buildRoomGroups(normalizedRooms), [normalizedRooms]);
  const teacherClasses = useMemo(() => filterClassesByTeacher(classes, teacherId), [classes, teacherId]);
  const teacherFilters = useMemo(() => teacherOptions.map((teacher) => ({ id: String(teacher.value), label: teacher.label })), [teacherOptions]);
  const subjects = useMemo(() => {
    const options = new Map<string, string>();
    classes.forEach((item: any) => { const id = String(item.subject_id || item.subject?.subject_id || ''); const label = String(item.subject_name || item.subject?.subject_name || ''); if (id && label) options.set(id, label); });
    return [...options].map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [classes]);
  const { schedule, availability, utilization, loading: workspaceLoading } = useRoomsWorkspace(normalizedRooms, classes, teachers, filters);

  useEffect(() => { dispatch(fetchRooms()); dispatch(fetchClasses()); dispatch(fetchTeachers()); }, [dispatch]);
  useEffect(() => { if (!selectedRoom && roomGroups[0]) setSelectedRoom(roomGroups[0].roomNumber); }, [selectedRoom, roomGroups]);

  const openDialog = (row?: RoomAssignment, dialogMode: 'room' | 'assignment' = row?.class_id ? 'assignment' : 'room') => {
    setMode(dialogMode);
    const group = row?.class_id ? classes.find((item: any) => Number(item.class_id || item.id) === Number(row.class_id)) : null;
    setTeacherId(group?.teacher_id ? String(group.teacher_id) : '');
    setForm(row ? { room_number: row.room_number || '', class_id: row.class_id ? String(row.class_id) : '', day: row.day || 'Monday', time: String(row.time || '09:00').slice(0, 5), end_time: String(row.end_time || '10:00').slice(0, 5) } : { ...emptyForm(), room_number: dialogMode === 'assignment' ? selectedRoom : '' });
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
      const payload = { ...form, class_id: form.class_id ? Number(form.class_id) : null };
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
      if (row?.class_id && sameRoom.length === 1) await roomAPI.create({ room_number: row.room_number, class_id: null, day: 'Monday', time: '09:00', end_time: '10:00' });
      showToast.success('Room assignment deleted'); await dispatch(fetchRoomsForce());
    } catch { showToast.error('Failed to delete room assignment'); } finally { dispatch(setRoomsPageSubmitting(false)); }
  };
  const deleteRoom = async () => {
    const room = roomGroups.find((item) => item.roomNumber === selectedRoom); if (!room || !window.confirm(`Delete room ${room.roomNumber} and all assignments?`)) return;
    dispatch(setRoomsPageSubmitting(true));
    try { await Promise.all(room.allRows.map((row) => roomAPI.delete(row.room_id))); setSelectedRoom(''); showToast.success('Room deleted'); await dispatch(fetchRoomsForce()); }
    catch { showToast.error('Failed to delete room'); } finally { dispatch(setRoomsPageSubmitting(false)); }
  };
  const importRooms = async (file?: File) => { setImporting(true); const imported = await importCsvEntity('rooms', 'Rooms', file); if (imported) await dispatch(fetchRoomsForce()); setImporting(false); if (fileRef.current) fileRef.current.value = ''; };
  const manageSlots = (row: RoomAvailabilityRow) => {
    const assignmentId = normalizedRooms.find((room) => room.room_number === row.roomNumber)?.room_id;
    if (!assignmentId) { showToast.error('Create a room assignment before managing dated slots'); return; }
    setSlotRoomId(assignmentId); setTab('availability');
  };

  return <div className="mx-auto max-w-[1600px] space-y-3 px-3 py-4" data-testid="rooms-workspace">
    <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => importRooms(event.target.files?.[0])} />
    <RoomsWorkspaceHeader importing={importing} onImport={() => fileRef.current?.click()} onExport={() => exportCsvEntity('rooms', 'Rooms')} onCreate={() => openDialog()} />
    {error && <Alert variant="destructive"><AlertDescription>{getErrorMessage(error)}</AlertDescription></Alert>}
    <Card className="overflow-hidden">
      <RoomsWorkspaceTabs active={tab} onChange={(next) => { setTab(next); if (next !== 'availability') setSlotRoomId(null); }} />
      <RoomFilters filters={filters} onChange={setFilters} rooms={roomGroups.map((room) => room.roomNumber)} teachers={teacherFilters} subjects={subjects} />
      {(storeLoading && !rooms.length) ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : <div role="tabpanel" id={`rooms-panel-${tab}`} aria-busy={workspaceLoading}>
        {tab === 'overview' && <OverviewTab totalRooms={roomGroups.length} availability={availability} schedule={schedule} />}
        {tab === 'availability' && (slotRoomId ? <div className="p-3"><RoomSlotsPage roomId={slotRoomId} onClose={() => setSlotRoomId(null)} /></div> : <AvailabilityTab rows={availability} onManage={manageSlots} />)}
        {tab === 'teacher' && <ScheduleBreakdownTab mode="teacher" rows={schedule} />}
        {tab === 'subject' && <ScheduleBreakdownTab mode="subject" rows={schedule} />}
        {tab === 'reports' && <ReportsTab rows={utilization} />}
      </div>}
      <RoomInventory rooms={roomGroups} selected={selectedRoom} onSelect={setSelectedRoom} onAssign={() => openDialog({ room_number: selectedRoom, room_id: 0 }, 'assignment')} onEdit={(row) => openDialog(row)} onDeleteAssignment={deleteAssignment} onDeleteRoom={deleteRoom} />
    </Card>
    <RoomAssignmentDialog open={isModalOpen} editing={Boolean(editingId)} mode={mode} submitting={submitting} form={form} teacherId={teacherId} teachers={teacherFilters} classes={teacherClasses} onForm={setForm} onTeacher={setTeacherId} onClose={closeDialog} onSubmit={submit} />
  </div>;
};

export default RoomsPage;
