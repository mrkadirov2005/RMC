import React, { useState, useEffect } from 'react';
import { Loader2, Save } from 'lucide-react';
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
import { studentAPI, attendanceAPI, gradeAPI } from '../../../shared/api/api';
import { showToast } from '../../../utils/toast';

const ATTENDANCE_POINTS: Record<string, number> = {
  'Present': 50,
  'Late': 40,
  'Absent R': 30,
  'Absent NR': 0
};

const HOMETASK_POINTS: Record<string, number> = {
  'Full': 20,
  'Half-full': 15,
  'Half': 10,
  'Unacceptable': 5,
  'No': 0
};

const ACTIVITY_POINTS: Record<string, number> = {
  'Active': 30,
  'Awesome': 30,
  'Average': 20,
  'BAD': 10
};

interface SessionModalProps {
  open: boolean;
  classData: any;
  sessionId: number | null;
  selectedDate?: string;
  onClose: () => void;
}

const SessionModal: React.FC<SessionModalProps> = ({
  open,
  classData,
  sessionId,
  selectedDate,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'hometask' | 'activity'>('attendance');
  const [students, setStudents] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  const [attendance, setAttendance] = useState<Map<number, string>>(new Map());
  const [homeworkScores, setHomeworkScores] = useState<Map<number, string>>(new Map());
  const [activityScores, setActivityScores] = useState<Map<number, string>>(new Map());

  const classId = classData?.class_id || classData?.id;

  useEffect(() => {
    if (open && classId) {
      loadStudents();
      if (sessionId) {
        loadSessionData();
      }
    }
  }, [open, classId, sessionId]);

  const loadStudents = async () => {
    try {
      const res = await studentAPI.getAll();
      const allStudents = res.data || [];
      const classStudents = allStudents.filter((s: any) => Number(s.class_id) === Number(classId));
      setStudents(classStudents);

      // Initialize maps
      setAttendance(new Map(classStudents.map((s: any) => [s.student_id || s.id, ''])));
      setHomeworkScores(new Map(classStudents.map((s: any) => [s.student_id || s.id, ''])));
      setActivityScores(new Map(classStudents.map((s: any) => [s.student_id || s.id, ''])));
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  const loadSessionData = async () => {
    try {
      // Load existing attendance
      const attRes = await attendanceAPI.getBySession(sessionId!);
      const attList = attRes.data || [];
      const newAtt = new Map();
      attList.forEach((a: any) => newAtt.set(a.student_id, a.status));
      if (newAtt.size > 0) setAttendance(newAtt);

      // Load existing grades/scores
      const gradeRes = await gradeAPI.getBySession(sessionId!);
      const sessionGrades = gradeRes.data || [];
      
      const newH = new Map();
      const newA = new Map();
      
      sessionGrades.forEach((g: any) => {
        // Reverse map points to labels
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

  const handleAttendanceToggle = (studentId: number, status: string) => {
    const newMap = new Map(attendance);
    newMap.set(studentId, newMap.get(studentId) === status ? '' : status);
    setAttendance(newMap);
  };

  const handleHomeworkToggle = (studentId: number, status: string) => {
    const newMap = new Map(homeworkScores);
    newMap.set(studentId, newMap.get(studentId) === status ? '' : status);
    setHomeworkScores(newMap);
  };

  const handleActivityToggle = (studentId: number, status: string) => {
    const newMap = new Map(activityScores);
    newMap.set(studentId, newMap.get(studentId) === status ? '' : status);
    setActivityScores(newMap);
  };

  const handleSave = async () => {
    if (!sessionId) return;
    try {
      setSubmitting(true);
      const today = selectedDate || new Date().toISOString().split('T')[0];

      for (const student of students) {
        const studentId = student.student_id || student.id;
        const status = attendance.get(studentId);
        
        if (!status) continue;

        // 1. Save Attendance
        await attendanceAPI.create({
          student_id: studentId,
          class_id: classId,
          session_id: sessionId,
          attendance_date: today,
          status: status,
          remarks: 'Daily Session Grading',
          teacher_id: classData?.teacher_id || 1,
        });

        // 2. Save Scores
        const hStatus = homeworkScores.get(studentId);
        const aStatus = activityScores.get(studentId);

        await gradeAPI.upsertSessionScores({
          student_id: studentId,
          teacher_id: classData?.teacher_id || 1,
          class_id: classId,
          session_id: sessionId,
          attendance_score: ATTENDANCE_POINTS[status] || 0,
          homework_score: hStatus ? (HOMETASK_POINTS[hStatus] ?? 0) : 0,
          activity_score: aStatus ? (ACTIVITY_POINTS[aStatus] ?? 0) : 0,
          subject: classData?.class_name || 'Class Session',
          total_marks: 100
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
      <DialogContent className="max-w-6xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center pr-8">
            <span>Session: {classData?.class_name}</span>
            {selectedDate && <span className="text-sm font-normal text-muted-foreground mr-4">Date: {selectedDate}</span>}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="attendance">1. Attendance</TabsTrigger>
            <TabsTrigger value="hometask">2. Hometask</TabsTrigger>
            <TabsTrigger value="activity">3. Activity & Finalize</TabsTrigger>
          </TabsList>

          <TabsContent value="attendance" className="pt-4">
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary">
                    <TableHead className="text-primary-foreground font-semibold">Student Name</TableHead>
                    <TableHead className="text-primary-foreground font-semibold text-center">Status</TableHead>
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
                          <div className="flex gap-2 justify-center">
                            {Object.keys(ATTENDANCE_POINTS).map((s) => (
                              <Button
                                key={s}
                                size="sm"
                                variant={status === s ? 'default' : 'outline'}
                                className={cn(
                                  'text-[10px] h-8 px-2 min-w-[70px]',
                                  status === s && (s.includes('Present') ? 'bg-green-600' : s.includes('Late') ? 'bg-yellow-600' : 'bg-red-600')
                                )}
                                onClick={() => handleAttendanceToggle(sid, s)}
                              >
                                {s}
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
                <Button onClick={() => setActiveTab('hometask')}>Next: Hometask</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="hometask" className="pt-4">
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary">
                    <TableHead className="text-primary-foreground font-semibold">Student Name</TableHead>
                    <TableHead className="text-primary-foreground font-semibold text-center">Hometask Score</TableHead>
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
                          <div className="flex gap-2 justify-center">
                            {Object.keys(HOMETASK_POINTS).map((s) => (
                              <Button
                                key={s}
                                size="sm"
                                disabled={!enabled}
                                variant={hStatus === s ? 'default' : 'outline'}
                                className={cn('text-[10px] h-8 px-2 min-w-[70px]', hStatus === s && 'bg-blue-600')}
                                onClick={() => handleHomeworkToggle(sid, s)}
                              >
                                {s}
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
                <Button onClick={() => setActiveTab('activity')}>Next: Activity</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="pt-4">
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary">
                    <TableHead className="text-primary-foreground font-semibold">Student Name</TableHead>
                    <TableHead className="text-primary-foreground font-semibold text-center">Activity Score</TableHead>
                    <TableHead className="text-primary-foreground font-semibold text-center">Total Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const sid = student.student_id || student.id;
                    const status = attendance.get(sid) || '';
                    const hStatus = homeworkScores.get(sid) || '';
                    const aStatus = activityScores.get(sid) || '';
                    const enabled = !!status && !!hStatus;

                    const total = (ATTENDANCE_POINTS[status] || 0) + 
                                  (HOMETASK_POINTS[hStatus] || 0) + 
                                  (ACTIVITY_POINTS[aStatus] || 0);

                    return (
                      <TableRow key={sid} className={cn(!enabled && "opacity-40 grayscale")}>
                        <TableCell className="font-medium">{student.first_name} {student.last_name}</TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-center">
                            {Object.keys(ACTIVITY_POINTS).map((s) => (
                              <Button
                                key={s}
                                size="sm"
                                disabled={!enabled}
                                variant={aStatus === s ? 'default' : 'outline'}
                                className={cn('text-[10px] h-8 px-2 min-w-[70px]', aStatus === s && 'bg-purple-600')}
                                onClick={() => handleActivityToggle(sid, s)}
                              >
                                {s}
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
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Save All Session Data</>}
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
