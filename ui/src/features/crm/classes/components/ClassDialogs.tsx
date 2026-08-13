import { BookOpen, CalendarDays, DollarSign, Loader2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface ClassDialogsProps {
  t: (key: string) => string;
  isModalOpen: boolean;
  editingId: number | null;
  formData: any;
  setFormData: (value: any) => void;
  centerOptions: any[];
  teacherOptions: any[];
  subjectOptions: any[];
  roomOptions: string[];
  roomConflict: { day: string; start: string; end: string; group: string } | null;
  selectedDays: string[];
  scheduleTime: string;
  scheduleEndTime: string;
  setScheduleTime: (value: string) => void;
  setScheduleEndTime: (value: string) => void;
  handleDayChange: (day: string, checked: boolean) => void;
  weekDays: string[];
  handleCloseModal: () => void;
  handleSubmit: (event: any) => void;
  frequencyOptions: any[];
  isOwner: boolean;
  loading: boolean;
  deleteModalOpen: boolean;
  deleteTarget: { id: number; name?: string } | null;
  deleteAttendance: any[];
  deleteLoading: boolean;
  handleCloseDeleteModal: () => void;
  handleForceDelete: () => void;
}

const toDateInputValue = (value?: string | null) => {
  if (!value) return '';
  return String(value).split('T')[0];
};

export const ClassDialogs = ({
  t,
  isModalOpen,
  editingId,
  formData,
  setFormData,
  centerOptions,
  teacherOptions,
  subjectOptions,
  roomOptions,
  roomConflict,
  selectedDays,
  scheduleTime,
  scheduleEndTime,
  setScheduleTime,
  setScheduleEndTime,
  handleDayChange,
  weekDays,
  handleCloseModal,
  handleSubmit,
  frequencyOptions,
  isOwner,
  loading,
  deleteModalOpen,
  deleteTarget,
  deleteAttendance,
  deleteLoading,
  handleCloseDeleteModal,
  handleForceDelete,
}: ClassDialogsProps) => (
  <>
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden border-0 bg-white p-0 shadow-2xl shadow-slate-900/25 dark:bg-card">
        <DialogHeader className="relative overflow-hidden bg-gradient-to-br from-sky-500 via-indigo-500 to-fuchsia-500 px-4 py-3 text-white">
          <div className="absolute right-0 top-0 h-full w-24 skew-x-[-18deg] bg-white/15" />
          <div className="absolute bottom-0 left-24 h-1.5 w-52 bg-cyan-200/70" />
          <div className="relative flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/20 shadow-lg ring-1 ring-white/30">
              <BookOpen className="h-5 w-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-white">
              {editingId ? t('Edit Class') : t('Add New Class')}
            </DialogTitle>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="max-h-[calc(92vh-112px)] overflow-y-auto">
          <div className="space-y-3 bg-gradient-to-b from-slate-50 to-white p-3 dark:from-background dark:to-card">
            <section className="rounded-lg border border-sky-100 bg-white p-2.5 shadow-sm dark:border-border dark:bg-background">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-600 text-white shadow-sm">
                  <BookOpen className="h-3.5 w-3.5" />
                </div>
                <h4 className="text-xs font-bold text-slate-950 dark:text-card-foreground">{t('Group Details')}</h4>
              </div>
              <div className="grid gap-2.5 md:grid-cols-2">
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="class_name" className="text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('Class Name')} *</Label>
                  <Input id="class_name" required value={formData.class_name || ''} onChange={(e) => setFormData({ ...formData, class_name: e.target.value })} className="h-8 border-sky-100 bg-sky-50/60 text-xs font-semibold shadow-sm focus-visible:ring-sky-500 dark:border-input dark:bg-background" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="subject_id" className="text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('Subject')} *</Label>
                  <Select
                    required
                    value={formData.subject_id ? String(formData.subject_id) : ''}
                    onValueChange={(value) => {
                      const selected = subjectOptions.find((option) => String(option.value) === value);
                      setFormData({ ...formData, subject_id: Number(value), subject_name: selected?.subjectName || selected?.label });
                    }}
                  >
                    <SelectTrigger id="subject_id" className="h-8 border-teal-100 bg-teal-50/60 text-xs font-semibold shadow-sm dark:border-input dark:bg-background">
                      <SelectValue placeholder={t('Select Subject')} />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectOptions.map((option) => (
                        <SelectItem key={option.id || option.value} value={String(option.value)}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {subjectOptions.length === 0 && <p className="text-[10px] text-amber-700">{t('Create an unassigned subject first, then return to this form.')}</p>}
                </div>
                {editingId && (
                  <div className="space-y-1">
                    <Label htmlFor="class_code" className="text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('Class Code')}</Label>
                    <Input id="class_code" value={formData.class_code || ''} onChange={(e) => setFormData({ ...formData, class_code: e.target.value })} className="h-8 border-indigo-100 bg-indigo-50/60 text-xs font-semibold shadow-sm focus-visible:ring-indigo-500 dark:border-input dark:bg-background" />
                  </div>
                )}
                <div className="space-y-1">
                  <Label htmlFor="level" className="text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('Level')} *</Label>
                  <Input id="level" type="number" required value={formData.level || ''} onChange={(e) => setFormData({ ...formData, level: Number(e.target.value) })} className="h-8 border-violet-100 bg-violet-50/60 text-xs font-semibold shadow-sm focus-visible:ring-violet-500 dark:border-input dark:bg-background" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="capacity" className="text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('Capacity')} *</Label>
                  <Input id="capacity" type="number" required value={formData.capacity || ''} onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })} className="h-8 border-emerald-100 bg-emerald-50/60 text-xs font-semibold shadow-sm focus-visible:ring-emerald-500 dark:border-input dark:bg-background" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="room_number" className="text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('Room Number')} *</Label>
                  <Select required value={formData.room_number || ''} onValueChange={(value) => setFormData({ ...formData, room_number: value })}>
                    <SelectTrigger id="room_number" aria-label={t('Room Number')} className="h-8 border-amber-100 bg-amber-50/60 text-xs font-semibold shadow-sm focus:ring-amber-500 dark:border-input dark:bg-background">
                      <SelectValue placeholder={t('Select Room')} />
                    </SelectTrigger>
                    <SelectContent>
                      {roomOptions.map((room) => <SelectItem key={room} value={room}>{room}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {roomOptions.length === 0 && <p className="text-[10px] text-amber-700">{t('Create a room first, then return to this form.')}</p>}
                  {roomConflict && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5 text-[10px] font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{t('This room is already booked by')} {roomConflict.group} — {roomConflict.day}, {roomConflict.start}–{roomConflict.end}.</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="start_date" className="text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('Start Date')}</Label>
                  <Input id="start_date" type="date" value={toDateInputValue(formData.start_date)} onChange={(e) => setFormData({ ...formData, start_date: e.target.value || null })} className="h-8 border-cyan-100 bg-cyan-50/60 text-xs font-semibold shadow-sm focus-visible:ring-cyan-500 dark:border-input dark:bg-background" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="end_date" className="text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('End Date')}</Label>
                  <Input id="end_date" type="date" value={toDateInputValue(formData.end_date)} onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })} className="h-8 border-rose-100 bg-rose-50/60 text-xs font-semibold shadow-sm focus-visible:ring-rose-500 dark:border-input dark:bg-background" />
                </div>
              </div>
            </section>

            <section className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-lg border border-cyan-100 bg-white p-2.5 shadow-sm dark:border-border dark:bg-background">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-600 text-white shadow-sm">
                    <CalendarDays className="h-3.5 w-3.5" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-950 dark:text-card-foreground">{t('Class Schedule')}</h4>
                </div>
                <div className="space-y-2">
                  <p className="mb-1.5 text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('Select Class Days')}</p>
                  <div className="grid grid-cols-3 gap-1 sm:grid-cols-4">
                    {weekDays.map((day, index) => (
                      <label key={day} className={cn('flex min-h-7 cursor-pointer items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-bold shadow-sm transition-colors', selectedDays.includes(day) ? 'border-cyan-300 bg-cyan-50 text-cyan-950 dark:border-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-100' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white dark:border-border dark:bg-card dark:text-card-foreground')}>
                        <Switch className="scale-[0.65]" checked={selectedDays.includes(day)} onCheckedChange={(checked) => handleDayChange(day, checked)} />
                        <span className="truncate">{day}</span>
                        <span className={cn('ml-auto h-2 w-2 rounded-full', index % 3 === 0 ? 'bg-sky-500' : index % 3 === 1 ? 'bg-emerald-500' : 'bg-fuchsia-500')} />
                      </label>
                    ))}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="schedule_time" className="text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('Start Time')}</Label>
                      <Input id="schedule_time" type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="h-8 border-cyan-100 bg-cyan-50/60 text-xs font-semibold shadow-sm focus-visible:ring-cyan-500 dark:border-input dark:bg-background" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="schedule_end_time" className="text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('End Time')}</Label>
                      <Input id="schedule_end_time" type="time" value={scheduleEndTime} onChange={(e) => setScheduleEndTime(e.target.value)} className="h-8 border-cyan-100 bg-cyan-50/60 text-xs font-semibold shadow-sm focus-visible:ring-cyan-500 dark:border-input dark:bg-background" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border border-emerald-100 bg-white p-2.5 shadow-sm dark:border-border dark:bg-background">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-white shadow-sm">
                      <DollarSign className="h-3.5 w-3.5" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-950 dark:text-card-foreground">{t('Payment')}</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor="payment_amount" className="text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('Payment Amount')} *</Label>
                      <Input id="payment_amount" type="number" required step="0.01" value={formData.payment_amount || ''} onChange={(e) => setFormData({ ...formData, payment_amount: Number(e.target.value) })} className="h-8 border-emerald-100 bg-emerald-50/60 text-xs font-semibold shadow-sm focus-visible:ring-emerald-500 dark:border-input dark:bg-background" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="payment_frequency" className="text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('Payment Frequency')}</Label>
                      <Select value={formData.payment_frequency || 'Monthly'} onValueChange={(val) => setFormData({ ...formData, payment_frequency: val })}>
                        <SelectTrigger className="h-8 border-emerald-100 bg-emerald-50/60 text-xs font-semibold shadow-sm dark:border-input dark:bg-background">
                          <SelectValue placeholder={t('Select Frequency')} />
                        </SelectTrigger>
                        <SelectContent>
                          {frequencyOptions.map((opt) => (
                            <SelectItem key={opt.id} value={String(opt.value)}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-fuchsia-100 bg-white p-2.5 shadow-sm dark:border-border dark:bg-background">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-fuchsia-600 text-white shadow-sm">
                      <UserRound className="h-3.5 w-3.5" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-950 dark:text-card-foreground">{t('Assignment')}</h4>
                  </div>
                  <div className="space-y-2">
                    {isOwner && (
                      <div className="space-y-1">
                        <Label htmlFor="center_id" className="text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('Center')}</Label>
                        <Select value={String(formData.center_id || '')} onValueChange={(val) => setFormData({ ...formData, center_id: Number(val) })}>
                          <SelectTrigger className="h-8 border-fuchsia-100 bg-fuchsia-50/60 text-xs font-semibold shadow-sm dark:border-input dark:bg-background">
                            <SelectValue placeholder={t('Select Center')} />
                          </SelectTrigger>
                          <SelectContent>
                            {centerOptions.map((opt) => (
                              <SelectItem key={opt.id || opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label htmlFor="teacher_id" className="text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('Teacher (Optional)')}</Label>
                      <Select value={String(formData.teacher_id || 'none')} onValueChange={(val) => setFormData({ ...formData, teacher_id: val === 'none' ? undefined : Number(val) })}>
                        <SelectTrigger className="h-8 border-fuchsia-100 bg-fuchsia-50/60 text-xs font-semibold shadow-sm dark:border-input dark:bg-background">
                          <SelectValue placeholder={t('Select Teacher')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t('None')}</SelectItem>
                          {teacherOptions.map((opt) => (
                            <SelectItem key={opt.id || opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <DialogFooter className="sticky bottom-0 border-t border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur dark:border-border dark:bg-card/95">
            <Button type="button" variant="outline" onClick={handleCloseModal} className="h-8 rounded-md px-3 text-xs">{t('Cancel')}</Button>
            <Button type="submit" disabled={loading || Boolean(roomConflict)} className="h-8 rounded-md bg-gradient-to-r from-sky-600 via-indigo-600 to-fuchsia-600 px-4 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 hover:from-sky-700 hover:via-indigo-700 hover:to-fuchsia-700">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={deleteModalOpen} onOpenChange={(open) => !open && handleCloseDeleteModal()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('Attendance records found')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The class{deleteTarget?.name ? ` "${deleteTarget.name}"` : ''} has {deleteAttendance.length} attendance record(s). Deleting anyway will remove those records and the class.
          </p>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Date')}</TableHead>
                  <TableHead>{t('Student ID')}</TableHead>
                  <TableHead>{t('Status')}</TableHead>
                  <TableHead>{t('Session')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deleteAttendance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">{t('No attendance records found.')}</TableCell>
                  </TableRow>
                ) : (
                  deleteAttendance.map((record) => (
                    <TableRow key={record.attendance_id || `${record.student_id}-${record.attendance_date}`}>
                      <TableCell>{record.attendance_date?.split('T')[0] || record.attendance_date}</TableCell>
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
          <Button type="button" variant="outline" onClick={handleCloseDeleteModal} disabled={deleteLoading}>{t('Cancel')}</Button>
          <Button type="button" variant="destructive" onClick={handleForceDelete} disabled={deleteLoading}>
            {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Delete anyway')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
);
