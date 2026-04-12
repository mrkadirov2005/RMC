import { SelectField } from '../students/components/SelectField';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
  ArrowLeft,
  Plus,
  BookOpen,
  Users,
  User,
  Folder,
  CheckCircle,
  Filter,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
} from 'lucide-react';
import { useAttendancePage } from './hooks/useAttendancePage';

const AttendancePage = () => {
  const attendanceHelpers = useAttendancePage();
  const {
    state,
    teachers,
    classes,
    students,
    activeTab,
    setActiveTab,
    selectedFolder,
    isModalOpen,
    editingId,
    formData,
    setFormData,
    studentOptions,
    teacherOptions,
    classOptions,
    isLoadingOptions,
    loadingData,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    filterDate,
    setFilterDate,
    showFilters,
    setShowFilters,
    displayedAttendance,
    hasActiveFilters,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleDelete,
    handleFolderClick,
    handleBackToFolders,
    clearFilters,
    getStudentName,
    getStatusBadgeClasses,
    getAttendanceCountForTeacher,
    getAttendanceCountForClass,
    getPresentCountForClass,
    getAttendanceCountForStudent,
    getPresentCountForStudent,
    attendanceStatusOptions,
  } = attendanceHelpers;
  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          {selectedFolder && (
            <Button variant="outline" size="sm" onClick={handleBackToFolders}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          )}
          <h1 className="text-2xl font-bold">
            {selectedFolder
              ? `Attendance - ${selectedFolder.name}`
              : 'Attendance Management'}
          </h1>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="h-4 w-4 mr-2" /> Add Attendance
        </Button>
      </div>

      {!selectedFolder ? (
        <>
          {/* Tab Navigation */}
          <div className="border-b border-border mb-6">
            <div className="flex space-x-1">
              <Button
                variant={activeTab === 'students' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('students')}
                className="rounded-b-none"
              >
                <Users className="h-4 w-4 mr-2" />
                By Students
              </Button>
              <Button
                variant={activeTab === 'classes' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('classes')}
                className="rounded-b-none"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                By Classes
              </Button>
              <Button
                variant={activeTab === 'teachers' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('teachers')}
                className="rounded-b-none"
              >
                <User className="h-4 w-4 mr-2" />
                By Teachers
              </Button>
            </div>
          </div>

          {/* Tab Content */}
          <div>
            {/* By Students Tab */}
            {activeTab === 'students' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loadingData ? (
                  <div className="col-span-full text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading students...</p>
                  </div>
                ) : students.length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <p className="text-muted-foreground">No students found</p>
                  </div>
                ) : (
                  students.map((student) => {
                    const studentId = student.student_id || student.id || 0;
                    const attendanceCount = getAttendanceCountForStudent(studentId);
                    const presentCount = getPresentCountForStudent(studentId);
                    return (
                      <Card
                        key={studentId}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleFolderClick('student', studentId, `${student.first_name} ${student.last_name}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <Folder className="h-9 w-9 text-primary" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-semibold">{student.first_name} {student.last_name}</h3>
                            <p className="text-sm text-muted-foreground">ID: {studentId}</p>
                          </div>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>{presentCount}/{attendanceCount} present</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                              <span>{attendanceCount > 0 ? Math.round((presentCount / attendanceCount) * 100) : 0}%</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            )}

            {/* By Classes Tab */}
            {activeTab === 'classes' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loadingData ? (
                  <div className="col-span-full text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading classes...</p>
                  </div>
                ) : classes.length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <p className="text-muted-foreground">No classes found</p>
                  </div>
                ) : (
                  classes.map((cls) => {
                    const classId = cls.class_id || cls.id || 0;
                    const attendanceCount = getAttendanceCountForClass(classId);
                    const presentCount = getPresentCountForClass(classId);
                    return (
                      <Card
                        key={classId}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleFolderClick('class', classId, cls.class_name)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <Folder className="h-9 w-9 text-primary" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-semibold">{cls.class_name}</h3>
                            <p className="text-sm text-muted-foreground">{cls.class_code} • Level {cls.level}</p>
                          </div>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>{presentCount}/{attendanceCount} present</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                              <span>{attendanceCount > 0 ? Math.round((presentCount / attendanceCount) * 100) : 0}%</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            )}

            {/* By Teachers Tab */}
            {activeTab === 'teachers' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loadingData ? (
                  <div className="col-span-full text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading teachers...</p>
                  </div>
                ) : teachers.length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <p className="text-muted-foreground">No teachers found</p>
                  </div>
                ) : (
                  teachers.map((teacher) => {
                    const teacherId = teacher.teacher_id || teacher.id || 0;
                    const attendanceCount = getAttendanceCountForTeacher(teacherId);
                    return (
                      <Card
                        key={teacherId}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleFolderClick('teacher', teacherId, `${teacher.first_name} ${teacher.last_name}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <Folder className="h-9 w-9 text-primary" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-semibold">{teacher.first_name} {teacher.last_name}</h3>
                            <p className="text-sm text-muted-foreground">{teacher.employee_id}</p>
                          </div>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Users className="h-3.5 w-3.5" />
                              <span>{attendanceHelpers.getStudentIdsForTeacher(teacherId).length} students</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>{attendanceCount} records</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        // ATTENDANCE LIST VIEW
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg mb-6">
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
            </div>
          )}

          {/* Attendance Table */}
          <div className="border rounded-lg overflow-hidden">
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
                {state.loading ? (
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
                  displayedAttendance.map((attendance) => (
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
        </>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Attendance' : 'Add New Attendance'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label="Student"
                name="student_id"
                value={formData.student_id || ''}
                onChange={(value) =>
                  setFormData({ ...formData, student_id: Number(value) })
                }
                options={studentOptions}
                isLoading={isLoadingOptions}
                required
                placeholder="Select a student"
              />
              <SelectField
                label="Teacher"
                name="teacher_id"
                value={formData.teacher_id || ''}
                onChange={(value) =>
                  setFormData({ ...formData, teacher_id: Number(value) })
                }
                options={teacherOptions}
                isLoading={isLoadingOptions}
                required
                placeholder="Select a teacher"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label="Class"
                name="class_id"
                value={formData.class_id || ''}
                onChange={(value) =>
                  setFormData({ ...formData, class_id: Number(value) })
                }
                options={classOptions}
                isLoading={isLoadingOptions}
                required
                placeholder="Select a class"
              />
              <div className="space-y-2">
                <Label htmlFor="attendance_date">Attendance Date *</Label>
                <Input
                  type="date"
                  id="attendance_date"
                  required
                  value={formData.attendance_date || ''}
                  onChange={(e) => setFormData({ ...formData, attendance_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select required value={formData.status || 'Present'} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {attendanceStatusOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={formData.remarks || ''}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Additional remarks..."
              />
            </div>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={state.loading} onClick={handleSubmit}>
              {state.loading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendancePage;
