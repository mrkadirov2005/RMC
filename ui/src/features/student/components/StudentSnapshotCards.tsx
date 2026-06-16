import type { ElementType } from 'react';
import { ClipboardList, GraduationCap, MapPin, Phone, UserRound, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ClassInfo, StudentProfile, Subject, Teacher } from '../types';

interface StudentSnapshotCardsProps {
  student: StudentProfile | null;
  teacher: Teacher | null;
  classInfo: ClassInfo | null;
  subjects: Subject[];
  t: (value: string) => string;
}

export const StudentSnapshotCards = ({ student, teacher, classInfo, subjects, t }: StudentSnapshotCardsProps) => (
  <div className="grid grid-cols-1 gap-4 animate-fade-in animation-delay-400 md:grid-cols-2 lg:grid-cols-3">
    <InfoCard
      title={t('Student Profile')}
      rows={[
        [UserRound, `${student?.first_name || ''} ${student?.last_name || ''}`.trim()],
        [Users, student?.enrollment_number ? `${t('Enrollment')}: ${student.enrollment_number}` : ''],
        [Phone, student?.phone ? `${t('Phone')}: ${student.phone}` : ''],
        [Users, student?.parent_name ? `${t('Guardian')}: ${student.parent_name}` : ''],
      ]}
    />
    <InfoCard
      title={t('Class Snapshot')}
      rows={[
        [GraduationCap, classInfo?.class_name || t('Class not assigned')],
        [ClipboardList, classInfo?.class_code ? `${t('Code')}: ${classInfo.class_code}` : ''],
        [MapPin, classInfo?.room_number ? `${t('Room')}: ${classInfo.room_number}` : ''],
        [UserRound, teacher?.first_name ? `${t('Teacher')}: ${teacher.first_name} ${teacher.last_name || ''}` : ''],
      ]}
    />
    <Card className="overflow-hidden border-0 bg-gradient-to-br from-teal-500 via-emerald-500 to-lime-300 text-white shadow-lg shadow-emerald-200/50">
      <CardHeader>
        <CardTitle className="text-base text-white">{t('Subjects')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {subjects.length === 0 ? (
          <p className="text-sm text-white/75">{t('No subjects assigned yet.')}</p>
        ) : (
          subjects.slice(0, 6).map((subject) => (
            <div key={subject.subject_id || subject.id} className="flex items-center justify-between rounded-md bg-white/16 px-3 py-2">
              <span>{subject.subject_name}</span>
              <Badge className="border-white/20 bg-white/20 text-white">{t('Active')}</Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  </div>
);

const InfoCard = ({ title, rows }: { title: string; rows: [ElementType, string | undefined][] }) => (
  <Card className="overflow-hidden border-0 bg-gradient-to-br from-[#32164f] via-[#7c2d12] to-[#be123c] text-white shadow-lg shadow-rose-200/45">
    <CardHeader>
      <CardTitle className="text-base text-white">{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3 text-sm">
      {rows.filter(([, value]) => value).map(([Icon, value], index) => (
        <div key={index} className="flex items-center gap-2 rounded-md bg-white/12 px-3 py-2">
          <Icon className="h-4 w-4 text-amber-200" />
          <span>{value}</span>
        </div>
      ))}
    </CardContent>
  </Card>
);
