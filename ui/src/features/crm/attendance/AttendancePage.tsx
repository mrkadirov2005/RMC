import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, Clock3, Plus, TrendingUp, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAttendancePage } from './hooks/useAttendancePage';

const AttendanceFormDialog = lazy(() => import('./components/AttendanceFormDialog'));
const AttendanceListView = lazy(() => import('./components/AttendanceListView'));

const attendancePageSizeOptions = [10, 25, 50, 100];

const AttendancePage = () => {
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendancePageSize, setAttendancePageSize] = useState(25);
  const attendance = useAttendancePage();

  useEffect(() => {
    setAttendancePage(1);
  }, [
    attendance.searchTerm,
    attendance.filterStatus,
    attendance.filterDate,
    attendance.filterAgeRange,
    attendance.filterTeacherId,
    attendance.filterClassId,
    attendance.filterStudentId,
  ]);

  const statistics = useMemo(() => {
    const records = attendance.displayedAttendance;
    const counts = records.reduce(
      (result, record) => {
        const status = String(record.status || '').trim().toLowerCase();
        if (status === 'present') result.present += 1;
        else if (status === 'late') result.late += 1;
        else if (status.includes('absent')) result.absent += 1;
        else result.other += 1;
        return result;
      },
      { present: 0, late: 0, absent: 0, other: 0 }
    );
    const attended = counts.present + counts.late;
    return {
      total: records.length,
      rate: records.length ? Math.round((attended / records.length) * 100) : 0,
      ...counts,
    };
  }, [attendance.displayedAttendance]);

  const metrics = [
    { label: 'Filtered records', value: statistics.total, icon: CalendarCheck2, tone: 'from-blue-500 to-indigo-600' },
    { label: 'Attendance rate', value: `${statistics.rate}%`, icon: TrendingUp, tone: 'from-violet-500 to-purple-600' },
    { label: 'Present', value: statistics.present, icon: UserCheck, tone: 'from-emerald-500 to-teal-600' },
    { label: 'Late', value: statistics.late, icon: Clock3, tone: 'from-amber-500 to-orange-600' },
    { label: 'Absent', value: statistics.absent, icon: UserX, tone: 'from-rose-500 to-pink-600' },
  ];

  return (
    <div className="container mx-auto space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Attendance</h1>
          <p className="text-sm text-muted-foreground">Review and manage every attendance record from one workspace.</p>
        </div>
        <Button onClick={() => attendance.handleOpenModal()} className="bg-emerald-600 text-white hover:bg-emerald-700">
          <Plus className="mr-2 h-4 w-4" /> Add attendance
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {metrics.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className={`border-0 bg-gradient-to-br ${tone} text-white shadow-sm`}>
            <CardContent className="flex items-center justify-between p-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-white/75">{label}</p>
                <p className="text-xl font-black">{value}</p>
              </div>
              <Icon className="h-5 w-5 text-white/70" />
            </CardContent>
          </Card>
        ))}
      </div>

      {attendance.state.error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {attendance.state.error}
        </div>
      )}

      <Suspense fallback={<div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">Loading attendance...</div>}>
        <AttendanceListView
          searchTerm={attendance.searchTerm}
          setSearchTerm={attendance.setSearchTerm}
          hasActiveFilters={attendance.hasActiveFilters}
          clearFilters={attendance.clearFilters}
          filterStatus={attendance.filterStatus}
          setFilterStatus={attendance.setFilterStatus}
          filterDate={attendance.filterDate}
          setFilterDate={attendance.setFilterDate}
          filterAgeRange={attendance.filterAgeRange}
          setFilterAgeRange={attendance.setFilterAgeRange}
          filterTeacherId={attendance.filterTeacherId}
          setFilterTeacherId={attendance.setFilterTeacherId}
          filterClassId={attendance.filterClassId}
          setFilterClassId={attendance.setFilterClassId}
          filterStudentId={attendance.filterStudentId}
          setFilterStudentId={attendance.setFilterStudentId}
          teachers={attendance.teachers}
          classes={attendance.classes}
          students={attendance.students}
          displayedAttendance={attendance.displayedAttendance}
          attendancePage={attendancePage}
          attendancePageSize={attendancePageSize}
          attendancePageSizeOptions={attendancePageSizeOptions}
          onAttendancePageChange={setAttendancePage}
          onAttendancePageSizeChange={setAttendancePageSize}
          stateLoading={attendance.state.loading}
          getStudentName={attendance.getStudentName}
          getStatusBadgeClasses={attendance.getStatusBadgeClasses}
          handleOpenModal={attendance.handleOpenModal}
          handleDelete={attendance.handleDelete}
          attendanceStatusOptions={attendance.attendanceStatusOptions}
        />
      </Suspense>

      <Suspense fallback={null}>
        <AttendanceFormDialog
          open={attendance.isModalOpen}
          editingId={attendance.editingId}
          loading={attendance.state.loading}
          formData={attendance.formData}
          setFormData={attendance.setFormData}
          studentOptions={attendance.studentOptions}
          teacherOptions={attendance.teacherOptions}
          classOptions={attendance.classOptions}
          isLoadingOptions={attendance.isLoadingOptions}
          attendanceStatusOptions={attendance.attendanceStatusOptions}
          onClose={attendance.handleCloseModal}
          onSubmit={attendance.handleSubmit}
        />
      </Suspense>
    </div>
  );
};

export default AttendancePage;
