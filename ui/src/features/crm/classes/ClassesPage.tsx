// Page component for the classes screen in the crm feature.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Pencil, Trash2, Info, CalendarDays, BookOpen, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { ViewMode } from '@/components/common/ViewModeToggle';
import { studentAPI } from './api';
import { useClassesPage } from './hooks/useClassesPage';
import { ClassDialogs } from './components/ClassDialogs';
import { ClassesMainView } from './components/ClassesMainView';
import { formatSchedule } from './queries';
import { exportCsvEntity } from '@/shared/dataCsv';
import { useLanguage } from '@/i18n/LanguageContext';
import { paginateItems } from '@/components/common/PaginationBar';
import type { Student } from '@/slices/studentsSlice';
import { buildRoomNumberOptions } from './classFormOptions';

const readStudentList = (response: unknown): Student[] => {
  const data = (response as any)?.data ?? response;
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.data) ? data.data : [];
};

// Renders the classes page screen.
const ClassesPage = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [groupView, setGroupView] = useState<'groups' | 'teachers'>('teachers');
  const [searchTerm, setSearchTerm] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [expandedTeacherIds, setExpandedTeacherIds] = useState<Set<number>>(new Set());
  const [expandedClassIds, setExpandedClassIds] = useState<Set<number>>(new Set());
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [classStudentsLoading, setClassStudentsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedClassIds, setSelectedClassIds] = useState<Set<number>>(new Set());
  const { t } = useLanguage();
  const {
    state,
    rooms,
    isModalOpen,
    editingId,
    formData,
    setFormData,
    centerOptions,
    teacherOptions,
    subjectOptions,
    selectedDays,
    scheduleTime,
    scheduleEndTime,
    setScheduleTime,
    setScheduleEndTime,
    handleDayChange,
    weekDays,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleDelete,
    deleteModalOpen,
    deleteTarget,
    deleteAttendance,
    deleteLoading,
    handleCloseDeleteModal,
    handleForceDelete,
    handleGenerateSessions,
    handleImportClasses,
    handleBulkDelete,
    isImporting,
    frequencyOptions,
    isOwner,
  } = useClassesPage();
  const getClassId = (cls: any) => Number(cls.class_id || cls.id || 0);
  const roomOptions = useMemo(
    () => buildRoomNumberOptions(rooms, formData.room_number),
    [formData.room_number, rooms]
  );
  const studentsByClassId = useMemo(() => {
    const map = new Map<number, Student[]>();
    for (const student of classStudents) {
      const classId = Number(student.class_id);
      if (!classId) continue;
      if (!map.has(classId)) map.set(classId, []);
      map.get(classId)?.push(student);
    }
    for (const students of map.values()) {
      students.sort((a, b) =>
        `${a.first_name || ''} ${a.last_name || ''}`.localeCompare(`${b.first_name || ''} ${b.last_name || ''}`)
      );
    }
    return map;
  }, [classStudents]);
  const effectiveTeacherByClassId = useMemo(() => {
    const map = new Map<number, number>();
    for (const cls of state.items) {
      const classId = getClassId(cls);
      if (!classId) continue;
      const explicitTeacherId = Number(cls.teacher_id || 0);
      if (explicitTeacherId > 0) {
        map.set(classId, explicitTeacherId);
        continue;
      }

      const counts = new Map<number, number>();
      for (const student of studentsByClassId.get(classId) || []) {
        const studentTeacherId = Number(student.teacher_id || 0);
        if (studentTeacherId > 0) counts.set(studentTeacherId, (counts.get(studentTeacherId) || 0) + 1);
      }
      const inferredTeacherId = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 0;
      map.set(classId, inferredTeacherId);
    }
    return map;
  }, [state.items, studentsByClassId]);
  const getEffectiveTeacherId = (cls: any) => effectiveTeacherByClassId.get(getClassId(cls)) || Number(cls.teacher_id || 0);
  const filteredClasses = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const teacherId = teacherFilter === 'all' ? null : Number(teacherFilter);

    return state.items.filter((cls) => {
      if (teacherId != null && getEffectiveTeacherId(cls) !== teacherId) return false;
      if (!search) return true;

      const schedule = formatSchedule(cls);
      return [
        cls.class_name,
        cls.class_code,
        cls.level,
        cls.capacity,
        cls.room_number,
        cls.payment_amount,
        cls.payment_frequency,
        schedule,
      ]
        .filter((value) => value != null)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  }, [effectiveTeacherByClassId, searchTerm, state.items, teacherFilter]);
  const teacherById = useMemo(() => {
    const map = new Map<number, string>();
    teacherOptions.forEach((teacher) => map.set(Number(teacher.value), teacher.label));
    return map;
  }, [teacherOptions]);
  const getTeacherName = (teacherId?: number | string | null) => {
    const id = Number(teacherId);
    return id > 0 ? teacherById.get(id) || t('Unknown teacher') : t('No teacher');
  };
  const roomsByClassId = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const room of rooms) {
      const classId = Number(room.class_id);
      const roomNumber = String(room.room_number || '').trim();
      if (!classId || !roomNumber) continue;
      map.set(classId, Array.from(new Set([...(map.get(classId) || []), roomNumber])));
    }
    return map;
  }, [rooms]);
  const getClassRoomLabel = (cls: any) => {
    const roomNumber = String(cls.room_number || '').trim();
    if (roomNumber) return roomNumber;
    const assignments = Array.isArray(cls.room_assignments) ? cls.room_assignments : [];
    const rooms = Array.from(new Set(assignments.map((room: any) => String(room.room_number || '').trim()).filter(Boolean)));
    if (rooms.length > 0) return rooms.join(', ');
    return (roomsByClassId.get(getClassId(cls)) || []).join(', ');
  };
  const teacherRows = useMemo(() => {
    const rows = new Map<number, { id: number; name: string; classes: any[] }>();
    teacherOptions.forEach((teacher) => {
      rows.set(Number(teacher.value), { id: Number(teacher.value), name: teacher.label, classes: [] });
    });
    filteredClasses.forEach((cls) => {
      const teacherId = getEffectiveTeacherId(cls);
      const key = teacherId > 0 ? teacherId : 0;
      if (!rows.has(key)) rows.set(key, { id: key, name: key === 0 ? t('No teacher') : getTeacherName(key), classes: [] });
      rows.get(key)?.classes.push(cls);
    });
    return Array.from(rows.values())
      .filter((row) => row.classes.length > 0)
      .map((row) => ({
        ...row,
        classes: [...row.classes].sort((a, b) => String(a.class_name || '').localeCompare(String(b.class_name || ''))),
      }))
      .sort((a, b) => b.classes.length - a.classes.length || a.name.localeCompare(b.name));
  }, [effectiveTeacherByClassId, filteredClasses, getTeacherName, t, teacherOptions]);
  const paginatedClasses = useMemo(
    () => paginateItems(filteredClasses, page, pageSize),
    [filteredClasses, page, pageSize]
  );
  const visibleClassIds = paginatedClasses.items.map(getClassId).filter((id) => id > 0);
  const selectedVisibleClassCount = visibleClassIds.filter((id) => selectedClassIds.has(id)).length;
  const allVisibleClassesSelected = visibleClassIds.length > 0 && selectedVisibleClassCount === visibleClassIds.length;
  useEffect(() => {
    setPage(1);
  }, [searchTerm, teacherFilter, viewMode, groupView]);
  const toggleClass = (id: number, checked: boolean) => {
    setSelectedClassIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const toggleAllVisibleClasses = (checked: boolean) => {
    setSelectedClassIds((current) => {
      const next = new Set(current);
      for (const id of visibleClassIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };
  const toggleTeacherExpanded = (id: number) => {
    setExpandedTeacherIds((current) => {
      if (current.has(id)) return new Set();
      return new Set([id]);
    });
  };
  const toggleClassExpanded = (id: number) => {
    setExpandedClassIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        if (!studentsByClassId.has(id)) {
          setClassStudentsLoading(true);
          studentAPI.getAll({ class_id: id, page: 1, limit: 100 })
            .then((response) => {
              const students = readStudentList(response);
              setClassStudents((currentStudents) => {
                const others = currentStudents.filter((student) => Number(student.class_id) !== id);
                return [...others, ...students];
              });
            })
            .catch(() => {
              setClassStudents((currentStudents) => currentStudents.filter((student) => Number(student.class_id) !== id));
            })
            .finally(() => setClassStudentsLoading(false));
        }
      }
      return next;
    });
  };
  const deleteSelectedClasses = async () => {
    await handleBulkDelete(Array.from(selectedClassIds));
    setSelectedClassIds(new Set());
  };
  const handleExportClasses = () => exportCsvEntity('classes', 'Classes');
  const roomsInView = new Set(filteredClasses.map((cls) => getClassRoomLabel(cls)).filter(Boolean)).size;
  const scheduledClasses = filteredClasses.filter((cls) => formatSchedule(cls) !== 'No schedule').length;
  useEffect(() => {
    if (groupView !== 'teachers') {
      setExpandedTeacherIds(new Set());
      setExpandedClassIds(new Set());
      setClassStudents([]);
    }
  }, [groupView]);
  const summaryCards = [
    {
      label: t('Classes shown'),
      value: filteredClasses.length.toLocaleString(),
      detail: `${scheduledClasses.toLocaleString()} ${t('scheduled')}`,
      icon: BookOpen,
      shell: 'from-indigo-50 via-white to-sky-50 border-indigo-100',
      iconShell: 'from-indigo-500 to-sky-500',
      text: 'text-indigo-950',
    },
    {
      label: t('Rooms'),
      value: roomsInView.toLocaleString(),
      detail: t('In current view'),
      icon: MapPin,
      shell: 'from-amber-50 via-white to-orange-50 border-amber-100',
      iconShell: 'from-amber-500 to-orange-500',
      text: 'text-amber-950',
    },
  ];
  const renderClassActions = (cls: any) => (
    <div className="flex flex-wrap justify-end gap-1.5">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => navigate(`/classes/${getClassId(cls)}`)}
        className="h-7 px-2 text-[11px] font-semibold text-slate-700"
      >
        <Info className="mr-1 h-3.5 w-3.5" />
        {t('View')}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => handleGenerateSessions(cls)}
        className="h-7 px-2 text-[11px] font-semibold text-slate-700"
      >
        <CalendarDays className="mr-1 h-3.5 w-3.5" />
        {t('Sessions')}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => handleOpenModal(cls)}
        className="h-7 px-2 text-[11px] font-semibold text-slate-700"
      >
        <Pencil className="mr-1 h-3.5 w-3.5" />
        {t('Edit')}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => handleDelete(cls.class_id || cls.id || 0, cls.class_name)}
        className="h-7 px-2 text-[11px] font-semibold text-rose-600"
      >
        <Trash2 className="mr-1 h-3.5 w-3.5" />
        {t('Delete')}
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <ClassesMainView
        t={t}
        viewMode={viewMode}
        setViewMode={setViewMode}
        groupView={groupView}
        setGroupView={setGroupView}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        teacherFilter={teacherFilter}
        setTeacherFilter={setTeacherFilter}
        teacherOptions={teacherOptions}
        state={state}
        summaryCards={summaryCards}
        fileInputRef={fileInputRef}
        handleImportClasses={handleImportClasses}
        isImporting={isImporting}
        handleExportClasses={handleExportClasses}
        handleOpenModal={handleOpenModal}
        filteredClasses={filteredClasses}
        teacherRows={teacherRows}
        expandedTeacherIds={expandedTeacherIds}
        expandedClassIds={expandedClassIds}
        toggleTeacherExpanded={toggleTeacherExpanded}
        toggleClassExpanded={toggleClassExpanded}
        classStudentsLoading={classStudentsLoading}
        studentsByClassId={studentsByClassId}
        getClassId={getClassId}
        getTeacherName={getTeacherName}
        getClassRoomLabel={getClassRoomLabel}
        navigate={navigate}
        selectedClassIds={selectedClassIds}
        setSelectedClassIds={setSelectedClassIds}
        toggleClass={toggleClass}
        allVisibleClassesSelected={allVisibleClassesSelected}
        selectedVisibleClassCount={selectedVisibleClassCount}
        toggleAllVisibleClasses={toggleAllVisibleClasses}
        deleteSelectedClasses={deleteSelectedClasses}
        paginatedClasses={paginatedClasses}
        pageSize={pageSize}
        setPageSize={setPageSize}
        setPage={setPage}
        renderClassActions={renderClassActions}
      />

      <ClassDialogs
        t={t}
        isModalOpen={isModalOpen}
        editingId={editingId}
        formData={formData}
        setFormData={setFormData}
        centerOptions={centerOptions}
        teacherOptions={teacherOptions}
        subjectOptions={subjectOptions}
        roomOptions={roomOptions}
        selectedDays={selectedDays}
        scheduleTime={scheduleTime}
        scheduleEndTime={scheduleEndTime}
        setScheduleTime={setScheduleTime}
        setScheduleEndTime={setScheduleEndTime}
        handleDayChange={handleDayChange}
        weekDays={weekDays}
        handleCloseModal={handleCloseModal}
        handleSubmit={handleSubmit}
        frequencyOptions={frequencyOptions}
        isOwner={isOwner}
        loading={state.loading}
        deleteModalOpen={deleteModalOpen}
        deleteTarget={deleteTarget}
        deleteAttendance={deleteAttendance}
        deleteLoading={deleteLoading}
        handleCloseDeleteModal={handleCloseDeleteModal}
        handleForceDelete={handleForceDelete}
      />

    </div>
  );
};

export default ClassesPage;
