// Source file for the students area in the crm feature.

import { Folder, FolderOpen, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { ViewMode } from '@/components/common/ViewModeToggle';
import type { Class, Student } from '../types';

// Handles to id.
const toId = (value: unknown) => {
  const normalized = Number(value);
  return Number.isNaN(normalized) ? null : normalized;
};

interface Props {
  classes: Class[];
  students: Student[];
  onClassClick: (cls: Class) => void;
  viewMode?: ViewMode;
}

// Renders the students class cards module.
export const StudentsClassCards = ({ classes, students, onClassClick, viewMode = 'list' }: Props) => {
  const getStudentCount = (cls: Class, variant: 'default' | 'unassigned' = 'default') => {
    const classId = cls.class_id || cls.id || 0;
    return variant === 'unassigned'
      ? students.filter((student) => !student.class_id).length
      : students.filter((student) => toId(student.class_id) === toId(classId)).length;
  };

  const unassignedClass = { class_id: -1, id: -1, class_name: 'Unassigned', class_code: 'N/A', level: 0, capacity: 0 };

  if (viewMode === 'list') {
    const hasUnassigned = students.some((student) => !student.class_id);

    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Class</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead className="text-right">Students</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes.map((cls) => {
              const classId = cls.class_id || cls.id || 0;
              return (
                <TableRow key={classId} className="cursor-pointer" onClick={() => onClassClick(cls)}>
                  <TableCell className="font-medium">{cls.class_name}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{cls.class_code}</TableCell>
                  <TableCell>Level {cls.level}</TableCell>
                  <TableCell>{cls.capacity}</TableCell>
                  <TableCell className="text-right">{getStudentCount(cls)}</TableCell>
                </TableRow>
              );
            })}
            {hasUnassigned && (
              <TableRow className="cursor-pointer" onClick={() => onClassClick(unassignedClass)}>
                <TableCell className="font-medium">Unassigned</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">N/A</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="text-right">{getStudentCount(unassignedClass, 'unassigned')}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    );
  }

  const wrapperClass =
    viewMode === 'compact'
        ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'
        : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5';

  const renderClassItem = (cls: Class, variant: 'default' | 'unassigned' = 'default') => {
    const classId = cls.class_id || cls.id || 0;
    const studentCount = getStudentCount(cls, variant);
    const Icon = variant === 'unassigned' ? FolderOpen : Folder;
    const accent = variant === 'unassigned' ? 'from-rose-500 to-pink-600' : 'from-indigo-500 to-violet-500';

    if (viewMode !== 'cards') {
      return (
        <Card key={classId} onClick={() => onClassClick(cls)} className="owner-tertiary-card cursor-pointer transition-shadow hover:shadow-md">
          <CardContent className="flex items-center gap-3 p-3">
            <Icon className="h-8 w-8 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold">{cls.class_name}</h3>
              <p className="truncate text-sm text-muted-foreground">{cls.class_code} &bull; Level {cls.level}</p>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              <span>{studentCount}</span>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card key={classId} onClick={() => onClassClick(cls)} className="owner-tertiary-card cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-indigo-500/20 border-0 overflow-hidden">
        <div className={cn('owner-primary-card bg-gradient-to-br p-6 text-white', accent)}>
          <div className="flex items-center gap-3 mb-3">
            <Icon className="h-10 w-10" />
            <div>
              <h3 className="text-lg font-semibold">{cls.class_name}</h3>
              <span className="text-xs opacity-80">{variant === 'unassigned' ? 'No Class' : cls.class_code}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 p-2.5 bg-white/20 rounded-lg">
            <Users className="h-4 w-4" />
            <span className="font-medium text-sm">{studentCount} {studentCount === 1 ? 'Student' : 'Students'}</span>
          </div>
          {variant !== 'unassigned' && <p className="text-xs opacity-80 mt-2">Level {cls.level} &bull; Capacity: {cls.capacity}</p>}
        </div>
      </Card>
    );
  };

  return (
    <div className={wrapperClass}>
      {classes.map((cls) => renderClassItem(cls))}
      {students.some((student) => !student.class_id) && renderClassItem(unassignedClass, 'unassigned')}
    </div>
  );
};
