// Modal component for the classes screen in the crm feature.

import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, ClipboardCheck, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '../hooks';
import { fetchStudents } from '../../../slices/studentsSlice';
import { makeSelectStudentsByClassId } from '../../../store/selectors';
import { attendanceAPI, gradeAPI } from '../../../shared/api/api';
import { showToast } from '../../../utils/toast';

const ATTENDANCE_POINTS: Record<string, number> = {
  'On time': 50,
  'Late': 40,
  'Excused': 30,
  'Absent': 0
};

const HOMETASK_POINTS: Record<string, number> = {
  'Full': 20,
  'Missing part': 15,
  'Half': 10,
  'Very weak': 5,
  'No homework': 0
};

const ACTIVITY_POINTS: Record<string, number> = {
  'Very active': 30,
  'Average': 20,
  'Weak': 10,
  'No activity': 0
};

interface SessionModalProps {
  open: boolean;
  classData: any;
  sessionId: number | null;
  selectedDate?: string;
  onClose: () => void;
}

// Renders the session modal modal.
const SessionModal: React.FC<SessionModalProps> = ({
  open,
  classData,
  sessionId,
  selectedDate,
  onClose,
}) => {
  const dispatch = useAppDispatch();
// Memoizes the select students by class derived value.
  const selectStudentsByClass = useMemo(makeSelectStudentsByClassId, []);
  const [activeTab, setActiveTab] = useState<'attendance' | 'hometask' | 'activity'>('attendance');
  const [submitting, setSubmitting] = useState(false);
  
  const [attendance, setAttendance] = useState<Map<number, string>>(new Map());
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [homeworkScores, setHomeworkScores] = useState<Map<number, string>>(new Map());
  const [activityScores, setActivityScores] = useState<Map<number, string>>(new Map());

  const classId = classData?.class_id || classData?.id;
  const centerId = Number(classData?.center_id || 0) || undefined;
  const students = useAppSelector((state) => selectStudentsByClass(state, Number(classId))) as any[];

// Runs side effects for this component.
  useEffect(() => {
    if (!open || !classId) return;
    setActiveTab('attendance');
    dispatch(fetchStudents());
  }, [classId, dispatch, open]);

// Runs side effects for this component.
  useEffect(() => {
    if (!open || !sessionId) return;
// Loads session data.
    const loadSessionData = async () => {
      try {
        // Load existing attendance
        const attRes = await attendanceAPI.getBySession(sessionId, centerId ? { center_id: centerId } : undefined);
        const attList = attRes.data || [];
        setAttendanceRecords(Array.isArray(attList) ? attList : []);
        const newAtt = new Map();
        attList.forEach((a: any) => {
          const statusMap: Record<string, string> = {
            Present: 'On time',
            'Absent R': 'Excused',
            'Absent NR': 'Absent',
          };
          newAtt.set(a.student_id, statusMap[a.status] || a.status);
        });
        if (newAtt.size > 0) setAttendance(newAtt);

        // Load existing grades/scores
        const gradeRes = await gradeAPI.getBySession(sessionId, centerId ? { center_id: centerId } : undefined);
        const sessionGrades = gradeRes.data || [];
        
        const newH = new Map();
        const newA = new Map();
        
        sessionGrades.forEach((g: any) => {
          const hLabel = Object.keys(HOMETASK_POINTS).find(k => HOMETASK_POINTS[k] === g.homework_score);
          const aLabel = Object.keys(ACTIVITY_POINTS).find(k => ACTIVITY_POINTS[k] === g.activity_score);
          if (hLabel) newH.set(g.student_id, hLabel);
          if (aLabel) newA.set(g.student_id, aLabel);
        });
        
        if (newH.size > 0) setHomeworkScores(newH);
        if (newA.size > 0) setActivityScores(newA);
      } catch (err) {
        console.error('Failed to load session data:', err);
      }
    };
    void loadSessionData();
  }, [open, sessionId]);

// Runs side effects for this component.
  useEffect(() => {
    if (!open) return;
    const ids = students.map((student) => Number(student.student_id || student.id)).filter(Boolean);
    setAttendance((prev) => {
      const next = new Map<number, string>();
      ids.forEach((id) => next.set(id, prev.get(id) || ''));
      return next;
    });
    setHomeworkScores((prev) => {
      const next = new Map<number, string>();
      ids.forEach((id) => next.set(id, prev.get(id) || ''));
      return next;
    });
    setActivityScores((prev) => {
      const next = new Map<number, string>();
      ids.forEach((id) => next.set(id, prev.get(id) || ''));
      return next;
    });
  }, [open, students]);

// Handles attendance toggle.
  const handleAttendanceToggle = (studentId: number, status: string) => {
    const newMap = new Map(attendance);
    newMap.set(studentId, newMap.get(studentId) === status ? '' : status);
    setAttendance(newMap);
  };

// Handles homework toggle.
  const handleHomeworkToggle = (studentId: number, status: string) => {
    const newMap = new Map(homeworkScores);
    newMap.set(studentId, newMap.get(studentId) === status ? '' : status);
    setHomeworkScores(newMap);
  };

// Handles activity toggle.
  const handleActivityToggle = (studentId: number, status: string) => {
    const newMap = new Map(activityScores);
    newMap.set(studentId, newMap.get(studentId) === status ? '' : status);
    setActivityScores(newMap);
  };

  const markedAttendanceCount = Array.from(attendance.values()).filter(Boolean).length;
  const markedHomeworkCount = Array.from(homeworkScores.values()).filter(Boolean).length;
  const markedActivityCount = Array.from(activityScores.values()).filter(Boolean).length;
  const totalStudents = students.length;
  const allAttendanceMarked = totalStudents > 0 && markedAttendanceCount === totalStudents;
  const allHomeworkMarked = totalStudents > 0 && markedHomeworkCount === totalStudents;
  const allActivityMarked = totalStudents > 0 && markedActivityCount === totalStudents;

  const getTotalScore = (studentId: number) => {
    const status = attendance.get(studentId) || '';
    const hStatus = homeworkScores.get(studentId) || '';
    const aStatus = activityScores.get(studentId) || '';
    return (ATTENDANCE_POINTS[status] || 0) + (HOMETASK_POINTS[hStatus] || 0) + (ACTIVITY_POINTS[aStatus] || 0);
  };

  const goToHomework = () => {
    if (!allAttendanceMarked) {
      showToast.error('Mark attendance for every student first.');
      return;
    }
    setActiveTab('hometask');
  };

  const goToActivity = () => {
    if (!allHomeworkMarked) {
      showToast.error('Add homework score for every student first.');
      return;
    }
    setActiveTab('activity');
  };

// Handles save.
  const handleSave = async () => {
    if (!sessionId) return;
    try {
      setSubmitting(true);
      const today = selectedDate || new Date().toISOString().split('T')[0];
      const userRaw = localStorage.getItem('user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      const teacherId = user?.userType === 'teacher' && user?.id ? Number(user.id) : Number(classData?.teacher_id);
      const targetCenterId = centerId || user?.center_id;

      if (!allAttendanceMarked || !allHomeworkMarked || !allActivityMarked) {
        showToast.error('Complete attendance, homework, and activity for every student.');
        return;
      }

      for (const student of students) {
        const studentId = student.student_id || student.id;
        const status = attendance.get(studentId);
        
        if (!status) continue;

        const apiStatusMap: Record<string, string> = {
          'On time': 'Present',
          Late: 'Late',
          Excused: 'Excused',
          Absent: 'Absent',
        };
        const attendancePayload = {
          center_id: targetCenterId,
          student_id: studentId,
          class_id: classId,
          session_id: sessionId,
          attendance_date: today,
          status: apiStatusMap[status] || status,
          remarks: 'Daily Session Grading',
          teacher_id: teacherId || 1,
        };

        const existingAttendance = attendanceRecords.find((record) => Number(record.student_id) === Number(studentId));
        if (existingAttendance?.attendance_id || existingAttendance?.id) {
          await attendanceAPI.update(Number(existingAttendance.attendance_id || existingAttendance.id), attendancePayload);
        } else {
          await attendanceAPI.create(attendancePayload);
        }

        // 2. Save Scores
        const hStatus = homeworkScores.get(studentId);
        const aStatus = activityScores.get(studentId);

        await gradeAPI.upsertSessionScores({
          student_id: studentId,
          teacher_id: teacherId || 1,
          class_id: classId,
          session_id: sessionId,
          attendance_score: ATTENDANCE_POINTS[status] || 0,
          homework_score: hStatus ? (HOMETASK_POINTS[hStatus] ?? 0) : 0,
          activity_score: aStatus ? (ACTIVITY_POINTS[aStatus] ?? 0) : 0,
          subject: classData?.class_name || 'Class Session',
          total_marks: 100,
          center_id: targetCenterId,
        });
      }

      showToast.success('Session data saved successfully!');
      onClose();
    } catch (err) {
      console.error('Failed to save session data:', err);
      showToast.error('Failed to save session data');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto p-0">
        <DialogHeader>
          <DialogTitle className="flex flex-col gap-2 border-b bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-5 pr-12 text-white sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xl">Take Lesson: {classData?.class_name}</span>
            {selectedDate && <span className="text-sm font-normal text-white/70">Date: {selectedDate}</span>}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full p-5 pt-4">
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <div className={cn('rounded-lg border p-3', activeTab === 'attendance' ? 'border-emerald-300 bg-emerald-50' : 'bg-muted/30')}>
              <p className="text-sm font-semibold">1. Attendance</p>
              <p className="text-xs text-muted-foreground">{markedAttendanceCount}/{totalStudents} marked</p>
            </div>
            <div className={cn('rounded-lg border p-3', activeTab === 'hometask' ? 'border-sky-300 bg-sky-50' : 'bg-muted/30')}>
              <p className="text-sm font-semibold">2. Homework</p>
              <p className="text-xs text-muted-foreground">{markedHomeworkCount}/{totalStudents} checked</p>
            </div>
            <div className={cn('rounded-lg border p-3', activeTab === 'activity' ? 'border-violet-300 bg-violet-50' : 'bg-muted/30')}>
              <p className="text-sm font-semibold">3. Activity & Coins</p>
              <p className="text-xs text-muted-foreground">{markedActivityCount}/{totalStudents} scored</p>
            </div>
          </div>

          <TabsList className="grid h-auto w-full grid-cols-3">
            <TabsTrigger value="attendance" className="py-2">Attendance</TabsTrigger>
            <TabsTrigger value="hometask" disabled={!allAttendanceMarked} className="py-2">Homework</TabsTrigger>
            <TabsTrigger value="activity" disabled={!allAttendanceMarked || !allHomeworkMarked} className="py-2">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="attendance" className="pt-4">
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary">
                    <TableHead className="text-primary-foreground font-semibold">Student</TableHead>
                    <TableHead className="text-primary-foreground font-semibold text-center">Attendance score / 50</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const sid = student.student_id || student.id;
                    const status = attendance.get(sid) || '';
                    return (
                      <TableRow key={sid}>
                        <TableCell className="font-medium">{student.first_name} {student.last_name}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap justify-center gap-2">
                            {Object.keys(ATTENDANCE_POINTS).map((s) => (
                              <Button
                                key={s}
                                size="sm"
                                variant={status === s ? 'default' : 'outline'}
                                className={cn(
                                  'text-[11px] h-8 px-2 min-w-[92px]',
                                  status === s && (s === 'On time' ? 'bg-green-600' : s === 'Late' ? 'bg-yellow-600' : 'bg-red-600')
                                )}
                                onClick={() => handleAttendanceToggle(sid, s)}
                              >
                                {s} ({ATTENDANCE_POINTS[s]})
                              </Button>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="flex justify-end p-4 border-t">
                <Button onClick={goToHomework}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Complete Attendance
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="hometask" className="pt-4">
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary">
                    <TableHead className="text-primary-foreground font-semibold">Student</TableHead>
                    <TableHead className="text-primary-foreground font-semibold text-center">Homework score / 20</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const sid = student.student_id || student.id;
                    const hStatus = homeworkScores.get(sid) || '';
                    const enabled = !!attendance.get(sid);
                    return (
                      <TableRow key={sid} className={cn(!enabled && "opacity-40 grayscale")}>
                        <TableCell className="font-medium">{student.first_name} {student.last_name}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap justify-center gap-2">
                            {Object.keys(HOMETASK_POINTS).map((s) => (
                              <Button
                                key={s}
                                size="sm"
                                disabled={!enabled}
                                variant={hStatus === s ? 'default' : 'outline'}
                                className={cn('text-[11px] h-8 px-2 min-w-[108px]', hStatus === s && 'bg-blue-600')}
                                onClick={() => handleHomeworkToggle(sid, s)}
                              >
                                {s} ({HOMETASK_POINTS[s]})
                              </Button>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="flex justify-end p-4 border-t gap-2">
                <Button variant="outline" onClick={() => setActiveTab('attendance')}>Back</Button>
                <Button onClick={goToActivity}>
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  Complete Homework
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="pt-4">
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary">
                    <TableHead className="text-primary-foreground font-semibold">Student</TableHead>
                    <TableHead className="text-primary-foreground font-semibold text-center">Class activity / 30</TableHead>
                    <TableHead className="text-primary-foreground font-semibold text-center">Combined Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const sid = student.student_id || student.id;
                    const status = attendance.get(sid) || '';
                    const hStatus = homeworkScores.get(sid) || '';
                    const aStatus = activityScores.get(sid) || '';
                    const enabled = !!status && !!hStatus;

// Handles total.
                    const total = getTotalScore(sid);

                    return (
                      <TableRow key={sid} className={cn(!enabled && "opacity-40 grayscale")}>
                        <TableCell className="font-medium">{student.first_name} {student.last_name}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap justify-center gap-2">
                            {Object.keys(ACTIVITY_POINTS).map((s) => (
                              <Button
                                key={s}
                                size="sm"
                                disabled={!enabled}
                                variant={aStatus === s ? 'default' : 'outline'}
                                className={cn('text-[11px] h-8 px-2 min-w-[108px]', aStatus === s && 'bg-purple-600')}
                                onClick={() => handleActivityToggle(sid, s)}
                              >
                                {s} ({ACTIVITY_POINTS[s]})
                              </Button>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-lg">
                          {total} <span className="text-xs text-muted-foreground">/ 100</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="flex justify-end p-4 border-t gap-2">
                <Button variant="outline" onClick={() => setActiveTab('hometask')}>Back</Button>
                <Button onClick={handleSave} disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Save Scores & Generate Coins</>}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SessionModal;
