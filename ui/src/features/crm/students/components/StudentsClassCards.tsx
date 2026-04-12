import { Folder, FolderOpen, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { Class, Student } from '../types';

const toId = (value: unknown) => {
  const normalized = Number(value);
  return Number.isNaN(normalized) ? null : normalized;
};

interface Props {
  classes: Class[];
  students: Student[];
  onClassClick: (cls: Class) => void;
}

export const StudentsClassCards = ({ classes, students, onClassClick }: Props) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
    {classes.map((cls) => {
      const classId = cls.class_id || cls.id || 0;
      const studentCount = students.filter((student) => toId(student.class_id) === toId(classId)).length;
      return (
        <Card key={classId} onClick={() => onClassClick(cls)} className="cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-indigo-500/20 border-0 overflow-hidden">
          <div className="bg-gradient-to-br from-indigo-500 to-violet-500 p-6 text-white">
            <div className="flex items-center gap-3 mb-3">
              <Folder className="h-10 w-10" />
              <div>
                <h3 className="text-lg font-semibold">{cls.class_name}</h3>
                <span className="text-xs opacity-80">{cls.class_code}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 p-2.5 bg-white/20 rounded-lg">
              <Users className="h-4 w-4" />
              <span className="font-medium text-sm">{studentCount} {studentCount === 1 ? 'Student' : 'Students'}</span>
            </div>
            <p className="text-xs opacity-80 mt-2">Level {cls.level} &bull; Capacity: {cls.capacity}</p>
          </div>
        </Card>
      );
    })}
    {students.some((student) => !student.class_id) && (<Card onClick={() => onClassClick({ class_id: -1, id: -1, class_name: 'Unassigned', class_code: 'N/A', level: 0, capacity: 0 })} className="cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-rose-500/20 border-0 overflow-hidden"><div className="bg-gradient-to-br from-rose-500 to-pink-600 p-6 text-white"><div className="flex items-center gap-3 mb-3"><FolderOpen className="h-10 w-10" /><div><h3 className="text-lg font-semibold">Unassigned</h3><span className="text-xs opacity-80">No Class</span></div></div><div className="flex items-center gap-2 mt-4 p-2.5 bg-white/20 rounded-lg"><Users className="h-4 w-4" /><span className="font-medium text-sm">{students.filter((student) => !student.class_id).length} Students</span></div></div></Card>)}
  </div>
);
