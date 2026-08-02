// Attendance list view with search, filters, and table.

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CalendarDays,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { SimplePaginationBar } from '@/components/common/SimplePaginationBar';
import { paginateItems } from '@/components/common/pagination';
import { useMemo } from 'react';
import type { Attendance, Class, Student, Teacher } from '../types';

interface AttendanceListViewProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  filterDate: string;
  setFilterDate: (date: string) => void;
  filterAgeRange: string;
  setFilterAgeRange: (range: string) => void;
  filterTeacherId: string;
  setFilterTeacherId: (id: string) => void;
  filterClassId: string;
  setFilterClassId: (id: string) => void;
  filterStudentId: string;
  setFilterStudentId: (id: string) => void;
  teachers: Teacher[];
  classes: Class[];
  students: Student[];
  displayedAttendance: Attendance[];
  attendancePage: number;
  attendancePageSize: number;
  attendancePageSizeOptions: number[];
  onAttendancePageChange: (page: number) => void;
  onAttendancePageSizeChange: (size: number) => void;
  stateLoading: boolean;
  getStudentName: (id: number) => string;
  getStatusBadgeClasses: (status: string) => string;
  handleOpenModal: (attendance: Attendance) => void;
  handleDelete: (id: number) => void;
  attendanceStatusOptions: { id: number; value: string; label: string }[];
}

const AttendanceListView = ({
  searchTerm,
  setSearchTerm,
  hasActiveFilters,
  clearFilters,
  filterStatus,
  setFilterStatus,
  filterDate,
  setFilterDate,
  filterAgeRange,
  setFilterAgeRange,
  filterTeacherId,
  setFilterTeacherId,
  filterClassId,
  setFilterClassId,
  filterStudentId,
  setFilterStudentId,
  teachers,
  classes,
  students,
  displayedAttendance,
  attendancePage,
  attendancePageSize,
  attendancePageSizeOptions,
  onAttendancePageChange,
  onAttendancePageSizeChange,
  stateLoading,
  getStudentName,
  getStatusBadgeClasses,
  handleOpenModal,
  handleDelete,
  attendanceStatusOptions,
}: AttendanceListViewProps) => {
  const paginatedAttendance = useMemo(
    () => paginateItems(displayedAttendance, attendancePage, attendancePageSize),
    [displayedAttendance, attendancePage, attendancePageSize]
  );
  const classById = useMemo(() => new Map(classes.map((item) => [Number(item.class_id || item.id), item])), [classes]);
  const teacherById = useMemo(() => new Map(teachers.map((item) => [Number(item.teacher_id || item.id), item])), [teachers]);
  const studentById = useMemo(() => new Map(students.map((item) => [Number(item.student_id || item.id), item])), [students]);
  const filteredStudents = useMemo(
    () => students.filter((student) => !filterClassId || Number(student.class_id || 0) === Number(filterClassId)),
    [filterClassId, students]
  );

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-border dark:bg-card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold">Filters</h2>
            <p className="text-xs text-muted-foreground">Narrow the records without leaving this page.</p>
          </div>
          {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="mr-1 h-4 w-4" />Reset filters</Button>}
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative xl:col-span-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by student name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          </div>
          <Select value={filterTeacherId || 'all'} onValueChange={(value) => {
            setFilterTeacherId(value === 'all' ? '' : value);
            setFilterClassId('');
            setFilterStudentId('');
          }}>
            <SelectTrigger><SelectValue placeholder="All teachers" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teachers</SelectItem>
              {teachers.map((teacher) => {
                const id = Number(teacher.teacher_id || teacher.id);
                return <SelectItem key={id} value={String(id)}>{teacher.first_name} {teacher.last_name}</SelectItem>;
              })}
            </SelectContent>
          </Select>
          <Select value={filterClassId || 'all'} onValueChange={(value) => { setFilterClassId(value === 'all' ? '' : value); setFilterStudentId(''); }}>
            <SelectTrigger><SelectValue placeholder="All groups" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All groups</SelectItem>
              {classes.filter((item) => !filterTeacherId || Number(item.teacher_id || 0) === Number(filterTeacherId)).map((item) => {
                const id = Number(item.class_id || item.id);
                return <SelectItem key={id} value={String(id)}>{item.class_name}</SelectItem>;
              })}
            </SelectContent>
          </Select>
          <Select value={filterStudentId || 'all'} onValueChange={(value) => setFilterStudentId(value === 'all' ? '' : value)}>
            <SelectTrigger><SelectValue placeholder="All students" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All students</SelectItem>
              {filteredStudents.map((student) => {
                const id = Number(student.student_id || student.id);
                return <SelectItem key={id} value={String(id)}>{student.first_name} {student.last_name}</SelectItem>;
              })}
            </SelectContent>
          </Select>
          <Select value={filterStatus || 'all'} onValueChange={(value) => setFilterStatus(value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {attendanceStatusOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
          </div>
            <Select value={filterAgeRange || 'all'} onValueChange={(value) => setFilterAgeRange(value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Ages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ages</SelectItem>
                <SelectItem value="3-6">3-6 years</SelectItem>
                <SelectItem value="7-10">7-10 years</SelectItem>
                <SelectItem value="11-14">11-14 years</SelectItem>
                <SelectItem value="15-18">15-18 years</SelectItem>
                <SelectItem value="19-25">19-25 years</SelectItem>
              </SelectContent>
            </Select>
          <div className="flex items-center justify-end text-sm font-semibold text-muted-foreground">{displayedAttendance.length} records</div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="mt-4 overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-card [&_table]:text-xs [&_th]:text-xs [&_td]:py-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stateLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6">Loading...</TableCell>
              </TableRow>
            ) : displayedAttendance.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                  {hasActiveFilters ? 'No attendance records match your criteria' : 'No attendance records found'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedAttendance.items.map((attendance) => {
                const student = studentById.get(Number(attendance.student_id));
                const studentClass = classById.get(Number(attendance.class_id || student?.class_id || 0));
                const teacher = teacherById.get(Number(attendance.teacher_id || studentClass?.teacher_id || student?.teacher_id || 0));
                return <TableRow key={attendance.attendance_id || attendance.id}>
                  <TableCell className="font-semibold">{getStudentName(attendance.student_id)}</TableCell>
                  <TableCell>{studentClass?.class_name || '—'}</TableCell>
                  <TableCell>{teacher ? `${teacher.first_name} ${teacher.last_name}` : '—'}</TableCell>
                  <TableCell>{new Date(attendance.attendance_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusBadgeClasses(attendance.status)}>
                      {attendance.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{attendance.remarks || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenModal(attendance)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(attendance.attendance_id || attendance.id || 0)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>;
              })
            )}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4">
        <SimplePaginationBar
          total={displayedAttendance.length}
          currentPage={paginatedAttendance.currentPage}
          totalPages={paginatedAttendance.totalPages}
          start={paginatedAttendance.start}
          end={paginatedAttendance.end}
          pageSize={attendancePageSize}
          pageSizeOptions={attendancePageSizeOptions}
          onPageChange={onAttendancePageChange}
          onPageSizeChange={(pageSize) => {
            onAttendancePageSizeChange(pageSize);
            onAttendancePageChange(1);
          }}
        />
      </div>
    </>
  );
};

export default AttendanceListView;
