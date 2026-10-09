import { useEffect, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { StudentListParams } from '@/slices/studentsSlice';
import { useLanguage } from '@/i18n/LanguageContext';
import { studentsApi } from '../api/studentsApi';
import type { Student } from '../types';
import { getMultiGroupStudents } from '../multiGroupStudentsModel';
import { StudentsFiltersBar } from './StudentsFiltersBar';
import { StudentsFilterPanel } from './StudentsFilterPanel';

interface Props {
  queryParams: StudentListParams;
  active: boolean;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  showFilters: boolean;
  setShowFilters: (value: boolean) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;
  filters: {
    gender: string;
    status: string;
    school: string;
    classId: string;
    teacherId: string;
    subjectId: string;
    level: string;
    address: string;
    age: string;
    onGender: (value: string) => void;
    onStatus: (value: string) => void;
    onSchool: (value: string) => void;
    onClassId: (value: string) => void;
    onTeacherId: (value: string) => void;
    onSubjectId: (value: string) => void;
    onLevel: (value: string) => void;
    onAddress: (value: string) => void;
    onAge: (value: string) => void;
  };
  schoolOptions: string[];
  classOptions: Array<{ id?: number; label: string; value: string | number }>;
  teacherOptions: Array<{ id?: number; label: string; value: string | number }>;
  subjectOptions: Array<{ id?: number; label: string; value: string | number }>;
  levelOptions: Array<string | number>;
  addressOptions: string[];
}

type GroupBy = 'none' | 'teacher' | 'class';

export const MultiGroupStudentsTab = ({
  queryParams,
  active,
  searchTerm,
  setSearchTerm,
  showFilters,
  setShowFilters,
  hasActiveFilters,
  clearFilters,
  filters,
  schoolOptions,
  classOptions,
  teacherOptions,
  subjectOptions,
  levelOptions,
  addressOptions,
}: Props) => {
  const { t } = useLanguage();
  const paramsKey = JSON.stringify(queryParams);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNames, setShowNames] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>('none');

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const loadAllFilteredStudents = async () => {
      setLoading(true);
      setError(null);
      try {
        const filters = JSON.parse(paramsKey) as StudentListParams;
        const rows: Student[] = [];
        let page = 1;
        let total = Number.POSITIVE_INFINITY;
        while (rows.length < total) {
          const response = await studentsApi.getAll({ ...filters, page, limit: 100 });
          const payload = (response as any).data ?? response;
          const pageRows = Array.isArray(payload)
            ? payload as Student[]
            : Array.isArray(payload?.data)
              ? payload.data as Student[]
              : Array.isArray(payload?.items)
                ? payload.items as Student[]
                : [];
          if (cancelled) return;
          rows.push(...pageRows);
          if (Array.isArray(payload)) {
            total = rows.length;
          } else {
            const reportedTotal = Number(payload?.total);
            total = Number.isFinite(reportedTotal) ? reportedTotal : rows.length + (pageRows.length === 100 ? 1 : 0);
          }
          if (pageRows.length === 0) {
            if (rows.length < total) throw new Error('The student list response ended before all filtered records were loaded.');
            break;
          }
          page += 1;
        }
        if (!cancelled) setStudents(rows);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load the filtered student roster.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadAllFilteredStudents();
    return () => {
      cancelled = true;
    };
  }, [active, paramsKey]);

  const multiGroupStudents = useMemo(() => getMultiGroupStudents(students), [students]);
  const teacherNames = useMemo(
    () => new Map(teacherOptions.map((teacher) => [Number(teacher.value || teacher.id), teacher.label])),
    [teacherOptions],
  );
  const groupedStudents = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'all', label: '', students: multiGroupStudents }];
    const groups = new Map<string, { label: string; students: Map<string, (typeof multiGroupStudents)[number]> }>();
    for (const student of multiGroupStudents) {
      const memberships = new Map<string, string>();
      for (const group of student.groups) {
        if (groupBy === 'class') {
          memberships.set(group.key, group.name);
        } else if (group.teacherId) {
          memberships.set(String(group.teacherId), teacherNames.get(group.teacherId) || `Teacher #${group.teacherId}`);
        } else {
          memberships.set('unassigned', t('Unassigned teacher'));
        }
      }
      for (const [key, label] of memberships) {
        const entry = groups.get(key) || { label, students: new Map() };
        entry.students.set(student.key, student);
        groups.set(key, entry);
      }
    }
    return Array.from(groups.entries())
      .map(([key, group]) => ({ key, label: group.label, students: Array.from(group.students.values()) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [groupBy, multiGroupStudents, t, teacherNames]);

  if (loading) {
    return <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">{t('Loading filtered students...')}</CardContent></Card>;
  }

  if (error) {
    return <Card><CardContent className="py-8 text-center text-sm text-destructive">{t('Unable to load the complete filtered student roster.')}: {t(error)}</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <StudentsFiltersBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onClearSearch={() => setSearchTerm('')}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        hasActiveFilters={hasActiveFilters}
        onClearAll={clearFilters}
      />
      <StudentsFilterPanel
        open={showFilters}
        gender={filters.gender}
        status={filters.status}
        school={filters.school}
        classId={filters.classId}
        teacherId={filters.teacherId}
        subjectId={filters.subjectId}
        level={filters.level}
        address={filters.address}
        age={filters.age}
        onGender={filters.onGender}
        onStatus={filters.onStatus}
        onSchool={filters.onSchool}
        onClassId={filters.onClassId}
        onTeacherId={filters.onTeacherId}
        onSubjectId={filters.onSubjectId}
        onLevel={filters.onLevel}
        onAddress={filters.onAddress}
        onAge={filters.onAge}
        genderOptions={[
          { id: 1, value: 'Male', label: 'Male' },
          { id: 2, value: 'Female', label: 'Female' },
          { id: 3, value: 'Other', label: 'Other' },
        ]}
        statusOptions={[
          { id: 1, value: 'Active', label: 'Active' },
          { id: 2, value: 'Inactive', label: 'Inactive' },
          { id: 3, value: 'Suspended', label: 'Suspended' },
        ]}
        schoolOptions={schoolOptions}
        classOptions={classOptions}
        showUnassignedClassOption={!filters.teacherId}
        teacherOptions={teacherOptions}
        subjectOptions={subjectOptions}
        levelOptions={levelOptions}
        addressOptions={addressOptions}
      />
      <button type="button" onClick={() => setShowNames((visible) => !visible)} className="block w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Card className="border-0 bg-violet-600 text-white shadow-sm transition hover:bg-violet-700">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-xs font-bold uppercase text-white/80">{t('Students in multiple groups')}</p>
              <p className="mt-1 text-3xl font-extrabold">{multiGroupStudents.length.toLocaleString()}</p>
              <p className="mt-1 text-xs text-white/85">{t(showNames ? 'Click to hide names' : 'Click to see their names')}</p>
            </div>
            <Users className="h-8 w-8" aria-hidden="true" />
          </CardContent>
        </Card>
      </button>

      {showNames && (
        <Card className="border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h3 className="text-sm font-bold">{t('Students in multiple groups')}</h3>
                <p className="text-xs text-muted-foreground">{t('Names and current groups')}</p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowNames(false)}>{t('Hide names')}</Button>
            </div>
            <div className="border-b px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium">{t('Group results by')}</span>
                <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupBy)}>
                  <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('No grouping')}</SelectItem>
                    <SelectItem value="teacher">{t('Teacher')}</SelectItem>
                    <SelectItem value="class">{t('Class group')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {multiGroupStudents.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('No students are enrolled in multiple groups.')}</p>
            ) : groupedStudents.map((section) => (
              <div key={section.key} className="border-b last:border-b-0">
                {section.label && <h4 className="bg-slate-50 px-4 py-2 text-sm font-semibold dark:bg-muted">{section.label} <span className="ml-1 text-xs text-muted-foreground">({section.students.length})</span></h4>}
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Student')}</TableHead>
                      <TableHead>{t('Groups')}</TableHead>
                      <TableHead>{t('Subjects')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {section.students.map((student) => (
                      <TableRow key={student.key}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.groups.map((group) => group.name).join(', ')}</TableCell>
                        <TableCell>{Array.from(new Set(student.groups.flatMap((group) => group.subjects.split(', ').filter(Boolean)))).join(', ') || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
