import { useEffect, useMemo, useState } from 'react';
import { Loader2, Mail, Phone, UserRound, Users, GraduationCap, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppSelector } from '../../crm/hooks';
import type { RootState } from '../../../store';
import { studentAPI, classAPI, teacherAPI } from '../../../shared/api/api';

interface StudentProfile {
  id?: number;
  student_id?: number;
  enrollment_number?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  parent_name?: string;
  parent_phone?: string;
  class_id?: number;
  teacher_id?: number;
  status?: string;
}

interface Teacher {
  teacher_id?: number;
  id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}

interface ClassInfo {
  class_id?: number;
  id?: number;
  class_name?: string;
  class_code?: string;
  level?: number;
  section?: string;
  room_number?: string;
}

const StudentProfilePage = () => {
  const { user } = useAppSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);

  const initials = useMemo(() => {
    const first = user?.first_name?.[0] ?? '';
    const last = user?.last_name?.[0] ?? '';
    return `${first}${last}` || 'S';
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const studentRes = await studentAPI.getById(user.id).catch(() => null);
        const studentData: StudentProfile | null =
          (studentRes as any)?.data || (studentRes as any) || null;

        const classId = studentData?.class_id || user.class_id;
        const teacherId = studentData?.teacher_id;

        const [classRes, teacherRes] = await Promise.all([
          classId ? classAPI.getById(classId).catch(() => null) : Promise.resolve(null),
          teacherId ? teacherAPI.getById(teacherId).catch(() => null) : Promise.resolve(null),
        ]);

        if (!isMounted) return;
        setStudent(studentData);
        setClassInfo((classRes as any)?.data || (classRes as any) || null);
        setTeacher((teacherRes as any)?.data || (teacherRes as any) || null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.class_id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold bg-white/20 border-[3px] border-white/30">
              {initials}
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                {user?.first_name} {user?.last_name}
              </h1>
              <p className="text-white/90">Student Profile</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge className="bg-white/20 text-white border-none hover:bg-white/30">Student</Badge>
                {student?.status && (
                  <Badge className="bg-white/10 text-white border-none hover:bg-white/20">
                    {student.status}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {student?.enrollment_number && (
            <div className="text-sm text-white/90">
              Enrollment: {student.enrollment_number}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Student Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-muted-foreground" />
              <span>{user?.first_name} {user?.last_name}</span>
            </div>
            {student?.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{student.email}</span>
              </div>
            )}
            {student?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{student.phone}</span>
              </div>
            )}
            {student?.parent_name && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Guardian: {student.parent_name}</span>
              </div>
            )}
            {student?.parent_phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>Guardian Phone: {student.parent_phone}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Class Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <span>{classInfo?.class_name || 'Class not assigned'}</span>
            </div>
            {classInfo?.class_code && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">{classInfo.class_code}</Badge>
                {classInfo.level !== undefined && <span>Level {classInfo.level}</span>}
              </div>
            )}
            {classInfo?.room_number && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>Room {classInfo.room_number}</span>
              </div>
            )}
            {teacher?.first_name && (
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-muted-foreground" />
                <span>Teacher: {teacher.first_name} {teacher.last_name}</span>
              </div>
            )}
            {teacher?.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{teacher.email}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentProfilePage;
