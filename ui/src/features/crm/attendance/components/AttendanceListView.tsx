// Attendance list view with search, filters, and table.

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Filter,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { SimplePaginationBar } from '@/components/common/SimplePaginationBar';
import { paginateItems } from '@/components/common/pagination';
import { useMemo } from 'react';
import type { Attendance } from '../types';

interface AttendanceListViewProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  filterDate: string;
  setFilterDate: (date: string) => void;
  filterAgeRange: string;
  setFilterAgeRange: (range: string) => void;
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
  showFilters,
  setShowFilters,
  hasActiveFilters,
  clearFilters,
  filterStatus,
  setFilterStatus,
  filterDate,
  setFilterDate,
  filterAgeRange,
  setFilterAgeRange,
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

  return (
    <>
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
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

        <Button
          variant={showFilters ? "default" : "outline"}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
              {(filterStatus ? 1 : 0) + (filterDate ? 1 : 0)}
            </span>
          )}
        </Button>

        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" /> Clear All
          </Button>
        )}

        <div className="text-sm text-muted-foreground flex items-center gap-4">
          <span>{displayedAttendance.length} records</span>
        </div>
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg mb-6">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                {attendanceStatusOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Age Range</Label>
            <Select value={filterAgeRange} onValueChange={setFilterAgeRange}>
              <SelectTrigger>
                <SelectValue placeholder="All Ages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Ages</SelectItem>
                <SelectItem value="3-6">3-6 years</SelectItem>
                <SelectItem value="7-10">7-10 years</SelectItem>
                <SelectItem value="11-14">11-14 years</SelectItem>
                <SelectItem value="15-18">15-18 years</SelectItem>
                <SelectItem value="19-25">19-25 years</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      <div className="border rounded-lg overflow-hidden [&_table]:text-xs [&_th]:text-xs [&_td]:py-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stateLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6">Loading...</TableCell>
              </TableRow>
            ) : displayedAttendance.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  {hasActiveFilters ? 'No attendance records match your criteria' : 'No attendance records found'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedAttendance.items.map((attendance) => (
                <TableRow key={attendance.attendance_id || attendance.id}>
                  <TableCell>{getStudentName(attendance.student_id)}</TableCell>
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
                </TableRow>
              ))
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
