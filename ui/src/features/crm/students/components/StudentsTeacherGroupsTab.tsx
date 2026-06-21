import { ArrowLeft, ArrowRight, ArrowRightLeft, BookOpen, Loader2, Search, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ViewMode } from '@/components/common/ViewModeToggle';
import { StudentsTableView } from './StudentsTableView';
import type { Class, Student } from '../types';

interface Option {
  id?: number;
  label: string;
  value: string | number;
}

interface Props {
  students: Student[];
  classes: Class[];
  teacherOptions: Option[];
  loading: boolean;
  viewMode: ViewMode;
  onView: (id: number) => void;
  onEdit: (student: Student) => void;
  onDelete: (id: number) => void;
  onTransfer?: (student: Student, targetClassId: number) => Promise<void> | void;
  onBulkDelete?: (ids: number[]) => Promise<void> | void;
  onPasswordUpdate?: (student: Student, password: string) => Promise<void> | void;
  onCoinsUpdated?: () => void;
  onTransferGroup: (classId: number, teacherId: number) => Promise<void> | void;
}

const toId = (value: unknown) => {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
};

const buttonToneClasses = [
  'bg-sky-600 hover:bg-sky-700',
  'bg-emerald-600 hover:bg-emerald-700',
  'bg-amber-500 hover:bg-amber-600',
  'bg-fuchsia-600 hover:bg-fuchsia-700',
  'bg-rose-600 hover:bg-rose-700',
  'bg-cyan-600 hover:bg-cyan-700',
];

const getTone = (index: number) => buttonToneClasses[index % buttonToneClasses.length];

const normalizeSearch = (value: unknown) => String(value || '').trim().toLowerCase();

const getStudentSearchText = (student: Student) =>
  [
    student.first_name,
    student.last_name,
    student.username,
    student.email,
    student.phone,
  ].filter(Boolean).join(' ');

type TeacherClassRow = {
  cls: Partial<Class> & { class_name?: string; class_code?: string; level?: number | null };
  classId: number;
  teacherId: number | null;
  students: Student[];
  isDirect?: boolean;
};

export const StudentsTeacherGroupsTab = ({
  students,
  classes,
  teacherOptions,
  loading,
  viewMode,
  onView,
  onEdit,
  onDelete,
  onTransfer,
  onBulkDelete,
  onPasswordUpdate,
  onCoinsUpdated,
  onTransferGroup,
}: Props) => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [targetTeachers, setTargetTeachers] = useState<Record<number, string>>({});
  const [savingClassId, setSavingClassId] = useState<number | null>(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const teachers = useMemo(() => {
    const map = new Map<number, { id: number; name: string }>();
    for (const teacher of teacherOptions) {
      const id = toId(teacher.value || teacher.id);
      if (id) map.set(id, { id, name: teacher.label });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [teacherOptions]);

  const classRows = useMemo<TeacherClassRow[]>(() => {
    const realRows = classes
      .map((cls) => {
        const classId = toId(cls.class_id || cls.id) || 0;
        const teacherId = toId(cls.teacher_id);
        const groupStudents = students.filter((student) => toId(student.class_id) === classId);
        return { cls, classId, teacherId, students: groupStudents };
      })
      .filter((row) => row.classId > 0);

    const teacherClassIds = new Map<number, Set<number>>();
    realRows.forEach((row) => {
      if (!row.teacherId) return;
      const ids = teacherClassIds.get(row.teacherId) || new Set<number>();
      ids.add(row.classId);
      teacherClassIds.set(row.teacherId, ids);
    });

    const directRows = teachers
      .map((teacher) => {
        const classIdsForTeacher = teacherClassIds.get(teacher.id) || new Set<number>();
        const directStudents = students.filter((student) => {
          const studentTeacherId = toId(student.teacher_id);
          const studentClassId = toId(student.class_id);
          return studentTeacherId === teacher.id && (!studentClassId || !classIdsForTeacher.has(studentClassId));
        });
        return {
          cls: { class_name: 'Directly assigned students' },
          classId: -teacher.id,
          teacherId: teacher.id,
          students: directStudents,
          isDirect: true,
        };
      })
      .filter((row) => row.students.length > 0);

    return [...realRows, ...directRows];
  }, [classes, students, teachers]);

  const selectedTeacher = selectedTeacherId ? teachers.find((teacher) => teacher.id === selectedTeacherId) : null;
  const selectedClass = selectedClassId ? classRows.find((row) => row.classId === selectedClassId) : null;
  const normalizedSearch = normalizeSearch(searchQuery);
  const filteredTeachers = useMemo(() => {
    if (!normalizedSearch) return teachers;

    return teachers.filter((teacher) => {
      const groups = classRows.filter((row) => row.teacherId === teacher.id);
      const haystack = [
        teacher.name,
        ...groups.flatMap((group) => [
          group.cls.class_name,
          group.cls.class_code,
          group.cls.level,
          ...group.students.map(getStudentSearchText),
        ]),
      ].filter(Boolean).join(' ');

      return normalizeSearch(haystack).includes(normalizedSearch);
    });
  }, [classRows, normalizedSearch, teachers]);
  const selectedTeacherClasses = selectedTeacherId
    ? classRows
      .filter((row) => row.teacherId === selectedTeacherId)
      .filter((row) => {
        if (!normalizedSearch) return true;
        const haystack = [
          row.cls.class_name,
          row.cls.class_code,
          row.cls.level,
          ...row.students.map(getStudentSearchText),
        ].filter(Boolean).join(' ');
        return normalizeSearch(haystack).includes(normalizedSearch);
      })
      .sort((a, b) => Number(a.isDirect) - Number(b.isDirect) || String(a.cls.class_name || '').localeCompare(String(b.cls.class_name || '')))
    : [];

  const applySearch = () => {
    setSearchQuery(searchDraft.trim());
    setSelectedClassId(null);
  };

  const clearSearch = () => {
    setSearchDraft('');
    setSearchQuery('');
    setSelectedClassId(null);
  };

  const saveTransfer = async (classId: number) => {
    const teacherId = Number(targetTeachers[classId]);
    if (!teacherId) return;
    setSavingClassId(classId);
    try {
      await onTransferGroup(classId, teacherId);
      setTargetTeachers((current) => ({ ...current, [classId]: '' }));
      setSelectedTeacherId(teacherId);
      setSelectedClassId(null);
    } finally {
      setSavingClassId(null);
    }
  };

  const goBackToTeachers = () => {
    setSelectedTeacherId(null);
    setSelectedClassId(null);
  };

  const goBackToClasses = () => {
    setSelectedClassId(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading teachers and groups...
        </CardContent>
      </Card>
    );
  }

  if (selectedClass) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="outline" size="sm" className="h-7 w-fit gap-1.5 text-xs" onClick={goBackToClasses}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to classes
          </Button>
          <div className="text-xs text-muted-foreground">
            {selectedTeacher?.name || 'Teacher'} / {selectedClass.cls.class_name || `Class #${selectedClass.classId}`}
          </div>
        </div>
        <StudentsTableView
          students={selectedClass.students}
          loading={false}
          hasActiveFilters={false}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onTransfer={onTransfer}
          onBulkDelete={onBulkDelete}
          onPasswordUpdate={onPasswordUpdate}
          onCoinsUpdated={onCoinsUpdated}
          classOptions={classes}
          hideTeacherGroup
          viewMode={viewMode}
        />
      </div>
    );
  }

  if (selectedTeacher) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="outline" size="sm" className="h-7 w-fit gap-1.5 text-xs" onClick={goBackToTeachers}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to teachers
          </Button>
          <div className="text-xs text-muted-foreground">{selectedTeacher.name}</div>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-border dark:bg-card sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') applySearch();
              }}
              placeholder="Search groups or students..."
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Button type="button" size="sm" className="h-8 gap-1.5 bg-sky-600 px-3 text-xs text-white hover:bg-sky-700" onClick={applySearch}>
            <Search className="h-3.5 w-3.5" />
            Search
          </Button>
          {searchQuery && (
            <Button type="button" size="sm" className="h-8 gap-1.5 bg-rose-600 px-3 text-xs text-white hover:bg-rose-700" onClick={clearSearch}>
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
          <span className="text-xs text-muted-foreground sm:ml-auto">{selectedTeacherClasses.length} groups</span>
        </div>

        {selectedTeacherClasses.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {searchQuery ? 'No groups or students match this search.' : 'No groups assigned to this teacher.'}
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
            <div className="grid grid-cols-[minmax(0,1fr)_100px_minmax(260px,320px)] items-center gap-3 border-b bg-slate-50 px-3 py-2 text-xs font-bold uppercase text-muted-foreground dark:bg-muted/40">
              <span>Group</span>
              <span className="text-center">Students</span>
              <span className="text-right">Teacher transfer</span>
            </div>
            {selectedTeacherClasses.map(({ cls, classId, teacherId, students: groupStudents, isDirect }, index) => (
              <div key={classId} className="grid gap-2 border-b px-3 py-2 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_100px_minmax(260px,320px)] lg:items-center">
                <div className="flex min-w-0 items-center gap-2.5">
                  <button type="button" className={`${getTone(index)} flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm`} onClick={() => setSelectedClassId(classId)} aria-label={`Open ${cls.class_name || `Class #${classId}`}`}>
                    <Users className="h-4 w-4" />
                  </button>
                  <div className="min-w-0">
                    <button type="button" className="truncate text-left text-sm font-semibold text-slate-950 hover:text-sky-700 dark:text-foreground" onClick={() => setSelectedClassId(classId)}>
                      {cls.class_name || `Class #${classId}`}
                    </button>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{isDirect ? 'Students assigned to this teacher outside their groups' : [cls.class_code, cls.level ? `Level ${cls.level}` : null].filter(Boolean).join(' / ') || 'Group'}</p>
                  </div>
                </div>

                <button type="button" className="w-fit rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 lg:mx-auto" onClick={() => setSelectedClassId(classId)}>
                  {groupStudents.length} students
                </button>

                {isDirect ? (
                  <div className="text-right text-xs font-medium text-muted-foreground">Direct assignment</div>
                ) : (
                  <div className="flex flex-col gap-1.5 sm:flex-row" onClick={(event) => event.stopPropagation()}>
                    <Select
                      value={targetTeachers[classId] || ''}
                      onValueChange={(value) => setTargetTeachers((current) => ({ ...current, [classId]: value }))}
                      disabled={savingClassId === classId}
                    >
                      <SelectTrigger className="h-7 bg-white text-xs dark:bg-background">
                        <SelectValue placeholder="Transfer teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers
                          .filter((teacher) => teacher.id !== teacherId)
                          .map((teacher) => (
                            <SelectItem key={teacher.id} value={String(teacher.id)}>
                              {teacher.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" size="sm" className={`${getTone(index)} h-7 gap-1.5 px-2 text-xs text-white`} onClick={() => saveTransfer(classId)} disabled={!targetTeachers[classId] || savingClassId === classId}>
                      {savingClassId === classId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRightLeft className="h-3.5 w-3.5" />}
                      Transfer
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (teachers.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">No teachers found.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-border dark:bg-card sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') applySearch();
            }}
            placeholder="Search teacher, group, student..."
            className="h-8 pl-8 text-xs"
          />
        </div>
        <Button type="button" size="sm" className="h-8 gap-1.5 bg-sky-600 px-3 text-xs text-white hover:bg-sky-700" onClick={applySearch}>
          <Search className="h-3.5 w-3.5" />
          Search
        </Button>
        {searchQuery && (
          <Button type="button" size="sm" className="h-8 gap-1.5 bg-rose-600 px-3 text-xs text-white hover:bg-rose-700" onClick={clearSearch}>
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
        <span className="text-xs text-muted-foreground sm:ml-auto">{filteredTeachers.length} teachers</span>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
        <div className="grid grid-cols-[minmax(0,1fr)_100px_110px_86px] items-center gap-3 border-b bg-slate-50 px-3 py-2 text-xs font-bold uppercase text-muted-foreground dark:bg-muted/40">
          <span>Teacher</span>
          <span className="text-center">Groups</span>
          <span className="text-center">Students</span>
          <span className="text-right">Open</span>
        </div>
        {filteredTeachers.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">No teachers, groups, or students match this search.</div>
        ) : (
          filteredTeachers.map((teacher, index) => {
            const groups = classRows.filter((row) => row.teacherId === teacher.id);
            const studentCount = groups.reduce((sum, group) => sum + group.students.length, 0);
            return (
              <div key={teacher.id} className="grid gap-2 border-b px-3 py-2 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_100px_110px_86px] lg:items-center">
                <div className="flex min-w-0 items-center gap-2.5">
                  <button type="button" className={`${getTone(index)} flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm`} onClick={() => setSelectedTeacherId(teacher.id)} aria-label={`Open ${teacher.name}`}>
                    <BookOpen className="h-4 w-4" />
                  </button>
                  <div className="min-w-0">
                    <button type="button" className="truncate text-left text-sm font-semibold text-slate-950 hover:text-sky-700 dark:text-foreground" onClick={() => setSelectedTeacherId(teacher.id)}>
                      {teacher.name}
                    </button>
                    <p className="mt-0.5 text-xs text-muted-foreground">Teacher groups and students</p>
                  </div>
                </div>
                <button type="button" className="w-fit rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 lg:mx-auto" onClick={() => setSelectedTeacherId(teacher.id)}>
                  {groups.length} groups
                </button>
                <button type="button" className="w-fit rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 lg:mx-auto" onClick={() => setSelectedTeacherId(teacher.id)}>
                  {studentCount} students
                </button>
                <Button type="button" size="sm" className={`${getTone(index)} h-7 gap-1 px-2 text-xs text-white`} onClick={() => setSelectedTeacherId(teacher.id)}>
                  Open
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
