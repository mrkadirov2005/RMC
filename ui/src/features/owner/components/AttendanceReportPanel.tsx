import { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart } from '@/shared/components/PieChart';
import type { OwnerManagerStatisticsCollections } from '../types';

const getId = (row: any, key: string) => Number(row?.[key] || row?.id || 0);
const getGroupName = (group: any) => String(
  group?.class_name || group?.className || group?.name || group?.class_code || group?.classCode || `Group ${getId(group, 'class_id')}`
);
const getBreakdown = (records: any[]) => {
  const present = records.filter((row) => String(row.status || '').toLowerCase() === 'present').length;
  const late = records.filter((row) => String(row.status || '').toLowerCase() === 'late').length;
  const absent = records.filter((row) => String(row.status || '').toLowerCase().includes('absent')).length;
  const total = records.length;
  return { total, present, late, absent, rate: total ? Math.round(((present + late) / total) * 100) : 0 };
};

export const AttendanceReportPanel = ({ collections }: { collections: OwnerManagerStatisticsCollections }) => {
  const [teacherId, setTeacherId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [detailGroupId, setDetailGroupId] = useState<number | null>(null);
  const records = collections.attendance || [];
  const students = collections.students || [];
  const classes = collections.classes || [];
  const teachers = collections.teachers || [];

  const studentById = useMemo(() => new Map(students.map((row) => [getId(row, 'student_id'), row])), [students]);
  const recordsForGroup = (id: number) => records.filter((record) => {
    const student = studentById.get(Number(record.student_id));
    return Number(record.class_id || student?.class_id || 0) === id;
  });
  const teacherGroups = classes.filter((row) => Number(row.teacher_id || 0) === Number(teacherId));
  const overall = getBreakdown(records);
  const teacherGroupRows = teacherGroups.map((group) => {
    const id = getId(group, 'class_id');
    return { group, id, stats: getBreakdown(recordsForGroup(id)) };
  });
  const selectedDetail = classes.find((row) => getId(row, 'class_id') === detailGroupId);
  const detail = detailGroupId ? getBreakdown(recordsForGroup(detailGroupId)) : null;
  const teacherPieData = teacherGroupRows.map(({ group, stats }) => ({
    label: getGroupName(group),
    value: stats.present + stats.late,
    color: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'][getId(group, 'class_id') % 6],
  }));
  const selectedGroup = classes.find((row) => getId(row, 'class_id') === Number(groupId));
  const selectedGroupStats = groupId ? getBreakdown(recordsForGroup(Number(groupId))) : null;
  const overallPieData = [
    { label: 'Present', value: overall.present + overall.late, color: '#10b981' },
    { label: 'Absent', value: overall.absent, color: '#f43f5e' },
  ];

  return <div className="space-y-4">
    <Card className="overflow-hidden"><CardContent className="grid items-center justify-center gap-6 p-6 md:grid-cols-[300px_300px]">
      <div className="flex justify-center">{overall.total ? <PieChart data={overallPieData} size={240} strokeWidth={40} /> : <div className="h-60 w-60 rounded-full border-[40px] border-slate-100 dark:border-slate-800" />}</div>
      <div><p className="text-5xl font-black text-slate-950 dark:text-white">{overall.rate}%</p>
        <div className="mt-5 flex gap-5"><span className="flex items-center gap-2 text-sm"><i className="h-3 w-3 rounded-full bg-emerald-500" />Present {overall.present + overall.late}</span><span className="flex items-center gap-2 text-sm"><i className="h-3 w-3 rounded-full bg-rose-500" />Absent {overall.absent}</span></div>
      </div>
    </CardContent></Card>

    <div className="grid items-start gap-4 xl:grid-cols-2">
      <Card><CardContent className="space-y-4 p-5">
        <h2 className="text-lg font-black">By teacher</h2>
        <Select value={teacherId} onValueChange={setTeacherId}><SelectTrigger><SelectValue placeholder="Select a teacher" /></SelectTrigger><SelectContent>{teachers.map((teacher) => { const id = getId(teacher, 'teacher_id'); return <SelectItem key={id} value={String(id)}>{teacher.first_name} {teacher.last_name}</SelectItem>; })}</SelectContent></Select>
        {teacherId ? <div className="grid gap-4 md:grid-cols-[210px_1fr]">
          <div className="flex justify-center rounded-xl border bg-slate-50 p-3 dark:bg-muted/20">{teacherPieData.some((slice) => slice.value > 0) ? <PieChart data={teacherPieData} size={190} strokeWidth={28} /> : <div className="h-[190px] w-[190px] rounded-full border-[28px] border-slate-200 dark:border-slate-700" />}</div>
          <div className="space-y-2">{teacherGroupRows.map(({ group, id, stats }, index) => <button key={id} onClick={() => setDetailGroupId(id)} className="flex w-full items-center justify-between rounded-lg border p-3 text-left hover:border-indigo-300"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: teacherPieData[index]?.color }} /><b>{getGroupName(group)}</b></span><strong className="text-indigo-600">{stats.rate}%</strong></button>)}</div>
        </div> : null}
      </CardContent></Card>

      <Card><CardContent className="space-y-4 p-5">
        <h2 className="text-lg font-black">By class</h2>
        <Select value={groupId} onValueChange={setGroupId}><SelectTrigger><SelectValue placeholder="Select a group" /></SelectTrigger><SelectContent>{classes.map((group) => { const id = getId(group, 'class_id'); return <SelectItem key={id} value={String(id)}>{getGroupName(group)}</SelectItem>; })}</SelectContent></Select>
        {selectedGroupStats && <button onClick={() => setDetailGroupId(Number(groupId))} className="grid w-full gap-4 rounded-xl border p-5 text-left transition hover:border-indigo-300 md:grid-cols-[190px_1fr]">
          <div className="flex justify-center rounded-xl border bg-slate-50 p-3 dark:bg-muted/20">{selectedGroupStats.total ? <PieChart data={[{ label: 'Present', value: selectedGroupStats.present + selectedGroupStats.late, color: '#10b981' }, { label: 'Absent', value: selectedGroupStats.absent, color: '#f43f5e' }]} size={170} strokeWidth={26} /> : <div className="h-[170px] w-[170px] rounded-full border-[26px] border-slate-200 dark:border-slate-700" />}</div>
          <div className="self-center"><p className="text-sm text-muted-foreground">{getGroupName(selectedGroup)}</p><p className="text-4xl font-black text-indigo-600">{selectedGroupStats.rate}%</p></div>
        </button>}
      </CardContent></Card>
    </div>

    <Dialog open={detailGroupId !== null} onOpenChange={(open) => !open && setDetailGroupId(null)}>
      <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{getGroupName(selectedDetail)} attendance</DialogTitle><DialogDescription>Percentage distribution for this group.</DialogDescription></DialogHeader>
        {detail && <div className="space-y-3">
          {[['Attendance rate', detail.rate, 'bg-indigo-500'], ['Present', detail.total ? Math.round(detail.present / detail.total * 100) : 0, 'bg-emerald-500'], ['Late', detail.total ? Math.round(detail.late / detail.total * 100) : 0, 'bg-amber-500'], ['Absent', detail.total ? Math.round(detail.absent / detail.total * 100) : 0, 'bg-rose-500']].map(([label, value, color]: any) => <div key={label}><div className="mb-1 flex justify-between text-sm"><span>{label}</span><b>{value}%</b></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${color}`} style={{ width: `${value}%` }} /></div></div>)}
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm dark:bg-muted"><Users className="h-4 w-4" />{detail.total} total attendance records</div>
        </div>}
      </DialogContent>
    </Dialog>
  </div>;
};
