// Page component for the classes screen in the crm feature.

import { useMemo, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Info, Loader2, CalendarDays, MoreVertical, Search, X, BookOpen, Users, MapPin, DollarSign, Upload } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
    handleImportClasses,
    isImporting,
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
  const totalCapacity = filteredClasses.reduce((sum, cls) => sum + (Number(cls.capacity) || 0), 0);
  const roomsInView = new Set(filteredClasses.map((cls) => String(cls.room_number || '').trim()).filter(Boolean)).size;
  const monthlyTuition = filteredClasses.reduce((sum, cls) => sum + (Number(cls.payment_amount) || 0), 0);
  const scheduledClasses = filteredClasses.filter((cls) => formatSchedule(cls) !== 'No schedule').length;
  const summaryCards = [
    {
      label: 'Classes shown',
      value: filteredClasses.length.toLocaleString(),
      detail: `${scheduledClasses.toLocaleString()} scheduled`,
      icon: BookOpen,
      shell: 'from-indigo-50 via-white to-sky-50 border-indigo-100',
      iconShell: 'from-indigo-500 to-sky-500',
      text: 'text-indigo-950',
    },
    {
      label: 'Capacity',
      value: totalCapacity.toLocaleString(),
      detail: 'Total seats',
      icon: Users,
      shell: 'from-emerald-50 via-white to-teal-50 border-emerald-100',
      iconShell: 'from-emerald-500 to-teal-500',
      text: 'text-emerald-950',
    },
    {
      label: 'Rooms',
      value: roomsInView.toLocaleString(),
      detail: 'In current view',
      icon: MapPin,
      shell: 'from-amber-50 via-white to-orange-50 border-amber-100',
      iconShell: 'from-amber-500 to-orange-500',
      text: 'text-amber-950',
    },
    {
      label: 'Monthly tuition',
      value: `$${monthlyTuition.toLocaleString()}`,
      detail: 'Listed amounts',
      icon: DollarSign,
      shell: 'from-cyan-50 via-white to-fuchsia-50 border-cyan-100',
      iconShell: 'from-cyan-500 to-fuchsia-500',
      text: 'text-slate-950',
    },
  ];
  const renderClassActions = (cls: any) => (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-muted"
            aria-label="Open class actions"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => handleViewDetails(cls)} className="gap-2">
            <Info className="h-4 w-4 text-cyan-600" />
            Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleGenerateSessions(cls)} className="gap-2">
            <CalendarDays className="h-4 w-4 text-indigo-600" />
            Generate Sessions
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleOpenModal(cls)} className="gap-2">
            <Pencil className="h-4 w-4 text-blue-500" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleDelete(cls.class_id || cls.id || 0, cls.class_name)}
            className="gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/70 to-emerald-50/55 p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.65)] dark:border-border dark:bg-card dark:bg-none dark:shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 dark:hidden" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-72 bg-gradient-to-l from-fuchsia-100/45 via-amber-100/35 to-transparent dark:hidden" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-900/10 dark:shadow-none">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-950 dark:text-foreground">Classes Management</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Organize class groups, schedules, rooms, tuition, and session generation.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ViewModeToggle value={viewMode} onChange={setViewMode} className="border-white/80 bg-white/80 shadow-sm dark:border-border dark:bg-background dark:shadow-none" />
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => handleImportClasses(event.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="border-white/80 bg-white/80 shadow-sm dark:border-border dark:bg-background dark:shadow-none"
            >
              {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {isImporting ? 'Importing...' : 'Import CSV'}
            </Button>
            <Button onClick={() => handleOpenModal()} className="bg-gradient-to-br from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 px-5 font-semibold shadow-lg shadow-indigo-900/10 dark:shadow-none">
              <Plus className="mr-2 h-4 w-4" />
              Add Class
            </Button>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`rounded-lg border bg-gradient-to-br ${card.shell} p-4 shadow-sm dark:border-border dark:bg-card dark:bg-none dark:shadow-none`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">{card.label}</p>
                    <p className={`mt-1 text-2xl font-bold ${card.text} dark:text-card-foreground`}>{card.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{card.detail}</p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${card.iconShell} text-white shadow-md shadow-slate-900/10 dark:shadow-none`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {state.error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3 rounded-lg border border-sky-100 bg-gradient-to-r from-white via-sky-50/60 to-emerald-50/40 p-3 shadow-sm lg:flex-row lg:items-center dark:border-border dark:bg-card dark:bg-none dark:shadow-none">
        <div className="relative max-w-xl flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search classes by name, code, schedule, room..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-white/80 bg-white/90 pl-10 pr-10 shadow-sm dark:border-input dark:bg-background dark:shadow-none"
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
          <SelectTrigger className="w-full border-white/80 bg-white/90 shadow-sm lg:w-[260px] dark:border-input dark:bg-background dark:shadow-none">
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
        <Card className="overflow-hidden border-slate-200/80 bg-white shadow-[0_18px_50px_-38px_rgba(15,23,42,0.6)] dark:border-border dark:bg-card dark:shadow-sm">
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 dark:hidden" />
          <Table>
            <TableHeader className="bg-slate-50/90 dark:bg-transparent">
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClasses.map((cls) => (
                <TableRow key={cls.class_id || cls.id} className="hover:bg-sky-50/60 dark:hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <button
                      type="button"
                      className="text-left font-semibold text-slate-950 hover:text-sky-700 dark:text-card-foreground dark:hover:text-primary"
                      onClick={() => handleViewDetails(cls)}
                    >
                      {cls.class_name}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    {renderClassActions(cls)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : viewMode === 'compact' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredClasses.map((cls) => (
            <Card
              key={cls.class_id || cls.id}
              className="cursor-pointer overflow-hidden border-slate-200/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-border dark:bg-card dark:hover:translate-y-0"
              onClick={() => handleViewDetails(cls)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-sky-100 text-indigo-700 dark:bg-primary/10 dark:bg-none dark:text-primary">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{cls.class_name}</p>
                    <p className="sr-only">{cls.class_code || 'Class details'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((cls, index) => (
            <Card
              key={cls.class_id || cls.id}
              className="flex h-full flex-col overflow-hidden border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-indigo-500/15 dark:border-border/60 dark:bg-card"
            >
              <CardHeader className={
                index % 4 === 0 ? 'bg-gradient-to-br from-indigo-500 to-sky-500 text-white' :
                index % 4 === 1 ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white' :
                index % 4 === 2 ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white' :
                'bg-gradient-to-br from-cyan-500 to-fuchsia-500 text-white'
              }>
                <CardTitle className="text-lg">{cls.class_name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 pt-4">
                <p className="font-semibold text-slate-950 dark:text-card-foreground">{cls.class_name}</p>
              </CardContent>
              <div className="flex justify-end border-t border-slate-100 bg-slate-50/70 px-4 py-4 dark:border-border/10 dark:bg-muted/50">
                {renderClassActions(cls)}
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
