// Page component for the classes screen in the crm feature.

import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Info, Loader2, CalendarDays, MoreHorizontal, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ViewModeToggle, type ViewMode } from '@/components/common/ViewModeToggle';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import ClassDetailModal from './ClassDetailModal';
import { useClassesPage } from './hooks/useClassesPage';
import { formatSchedule } from './queries';

// Renders the classes page screen.
const ClassesPage = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const {
    state,
    isModalOpen,
    editingId,
    formData,
    setFormData,
    centerOptions,
    teacherOptions,
    selectedDays,
    scheduleTime,
    setScheduleTime,
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
    detailModalOpen,
    selectedClass,
    handleViewDetails,
    handleCloseDetailModal,
    handleGenerateSessions,
    frequencyOptions,
    isOwner,
  } = useClassesPage();
  const filteredClasses = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const teacherId = teacherFilter === 'all' ? null : Number(teacherFilter);

    return state.items.filter((cls) => {
      if (teacherId != null && Number(cls.teacher_id) !== teacherId) return false;
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
  }, [searchTerm, state.items, teacherFilter]);

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Classes Management</h1>
        <div className="flex items-center gap-2">
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
          <Button onClick={() => handleOpenModal()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Class
          </Button>
        </div>
      </div>

      {state.error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative max-w-xl flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search classes by name, code, schedule, room..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Select value={teacherFilter} onValueChange={setTeacherFilter}>
          <SelectTrigger className="w-full lg:w-[260px]">
            <SelectValue placeholder="Filter by teacher" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teachers</SelectItem>
            {teacherOptions.map((teacher) => (
              <SelectItem key={teacher.id || teacher.value} value={String(teacher.value)}>
                {teacher.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {state.loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : state.items.length === 0 ? (
        <Alert className="mb-4">
          <AlertDescription>No classes found. Create your first class to get started!</AlertDescription>
        </Alert>
      ) : filteredClasses.length === 0 ? (
        <Alert className="mb-4">
          <AlertDescription>No classes match your search.</AlertDescription>
        </Alert>
      ) : viewMode === 'list' ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClasses.map((cls) => (
                <TableRow key={cls.class_id || cls.id}>
                  <TableCell className="font-medium">{cls.class_name}</TableCell>
                  <TableCell className="font-mono text-sm">{cls.class_code}</TableCell>
                  <TableCell>Level {cls.level}</TableCell>
                  <TableCell>{formatSchedule(cls)}</TableCell>
                  <TableCell>{cls.capacity}</TableCell>
                  <TableCell>{cls.room_number}</TableCell>
                  <TableCell>${cls.payment_amount} ({cls.payment_frequency})</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-cyan-600" onClick={() => handleViewDetails(cls)}>
                        <Info className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleGenerateSessions(cls)}>
                        <CalendarDays className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500" onClick={() => handleOpenModal(cls)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(cls.class_id || cls.id || 0, cls.class_name)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : viewMode === 'compact' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredClasses.map((cls) => (
            <Card key={cls.class_id || cls.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => handleViewDetails(cls)}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <CalendarDays className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{cls.class_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{cls.class_code} &bull; Level {cls.level}</p>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{cls.capacity}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((cls) => (
            <Card
              key={cls.class_id || cls.id}
              className="flex flex-col h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-2"
            >
              <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
                <CardTitle className="text-lg">{cls.class_name}</CardTitle>
                <p className="text-sm text-primary-foreground/80">{cls.class_code}</p>
              </CardHeader>
              <CardContent className="flex-1 pt-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Level</p>
                  <p className="text-sm font-semibold">Level {cls.level}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Schedule</p>
                  <p className="text-sm font-semibold">{formatSchedule(cls)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Capacity</p>
                  <p className="text-sm font-semibold">{cls.capacity} students</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Room Number</p>
                  <p className="text-sm font-semibold">{cls.room_number}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment</p>
                  <p className="text-sm font-semibold">
                    ${cls.payment_amount} ({cls.payment_frequency})
                  </p>
                </div>
              </CardContent>
              <div className="px-4 pb-4 pt-0 flex justify-between items-center">
                <Button variant="ghost" size="sm" onClick={() => handleViewDetails(cls)}>
                  <Info className="mr-1 h-4 w-4" />
                  Details
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => handleGenerateSessions(cls)}>
                      <CalendarDays className="mr-2 h-4 w-4" />
                      Generate Sessions
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenModal(cls)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDelete(cls.class_id || cls.id || 0, cls.class_name)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Class Dialog */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Class' : 'Add New Class'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="class_name">Class Name *</Label>
              <Input
                id="class_name"
                required
                value={formData.class_name || ''}
                onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class_code">Class Code *</Label>
              <Input
                id="class_code"
                required
                value={formData.class_code || ''}
                onChange={(e) => setFormData({ ...formData, class_code: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="level">Level *</Label>
                <Input
                  id="level"
                  type="number"
                  required
                  value={formData.level || ''}
                  onChange={(e) => setFormData({ ...formData, level: Number(e.target.value) })}
                />
              </div>
              <div />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity *</Label>
                <Input
                  id="capacity"
                  type="number"
                  required
                  value={formData.capacity || ''}
                  onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room_number">Room Number *</Label>
                <Input
                  id="room_number"
                  required
                  value={formData.room_number || ''}
                  onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_amount">Payment Amount *</Label>
                <Input
                  id="payment_amount"
                  type="number"
                  required
                  step="0.01"
                  value={formData.payment_amount || ''}
                  onChange={(e) => setFormData({ ...formData, payment_amount: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_frequency">Payment Frequency</Label>
                <Select
                  value={formData.payment_frequency || 'Monthly'}
                  onValueChange={(val) => setFormData({ ...formData, payment_frequency: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencyOptions.map((opt) => (
                      <SelectItem key={opt.id} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Schedule Section */}
            <div className="p-4 bg-muted rounded-lg mt-2">
              <h4 className="font-bold text-sm mb-3">Class Schedule</h4>

              {/* Days Selection */}
              <div className="mb-3">
                <p className="text-xs font-semibold mb-2">Select Class Days</p>
                <div className="grid grid-cols-2 gap-2">
                  {weekDays.map((day) => (
                    <label key={day} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Switch
                        checked={selectedDays.includes(day)}
                        onCheckedChange={(checked) => handleDayChange(day, checked)}
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </div>

              {/* Time Selection */}
              <div className="space-y-2">
                <Label htmlFor="schedule_time">Class Time</Label>
                <Input
                  id="schedule_time"
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
            </div>

            {/* Center and Teacher Selection */}
            {isOwner && (
              <div className="space-y-2">
                <Label htmlFor="center_id">Center</Label>
                <Select
                  value={String(formData.center_id || '')}
                  onValueChange={(val) => setFormData({ ...formData, center_id: Number(val) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Center" />
                  </SelectTrigger>
                  <SelectContent>
                    {centerOptions.map((opt) => (
                      <SelectItem key={opt.id || opt.value} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="teacher_id">Teacher (Optional)</Label>
              <Select
                value={String(formData.teacher_id || 'none')}
                onValueChange={(val) =>
                  setFormData({
                    ...formData,
                    teacher_id: val === 'none' ? undefined : Number(val),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {teacherOptions.map((opt) => (
                    <SelectItem key={opt.id || opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={state.loading}>
                {state.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Attendance Conflict Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={(open) => !open && handleCloseDeleteModal()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Attendance records found</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The class{deleteTarget?.name ? ` "${deleteTarget.name}"` : ''} has
              {` ${deleteAttendance.length} `}
              attendance record(s). Deleting anyway will remove those records and the class.
            </p>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Session</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deleteAttendance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No attendance records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    deleteAttendance.map((record) => (
                      <TableRow key={record.attendance_id || `${record.student_id}-${record.attendance_date}`}>
                        <TableCell>
                          {record.attendance_date?.split('T')[0] || record.attendance_date}
                        </TableCell>
                        <TableCell>{record.student_id}</TableCell>
                        <TableCell>{record.status}</TableCell>
                        <TableCell>{record.session_id ?? '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseDeleteModal} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleForceDelete} disabled={deleteLoading}>
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete anyway'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Class Detail Modal with Tabs */}
      <ClassDetailModal
        open={detailModalOpen}
        classData={selectedClass}
        onClose={handleCloseDetailModal}
      />
    </div>
  );
};

export default ClassesPage;
