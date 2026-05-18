// View component for the students screen in the crm feature.

import { useState } from 'react';
import { Coins, Folder, Info, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { StudentCoinsDialog } from '@/shared/components/StudentCoinsDialog';
import type { ViewMode } from '@/components/common/ViewModeToggle';
import type { Student } from '../types';

interface Props {
  students: Student[];
  loading: boolean;
  hasActiveFilters: boolean;
  onView: (id: number) => void;
  onEdit: (student: Student) => void;
  onDelete: (id: number) => void;
  statusClass: (status: string) => string;
  onCoinsUpdated?: () => void;
  viewMode?: ViewMode;
}

// Renders the students table view view.
export const StudentsTableView = ({
  students,
  loading,
  hasActiveFilters,
  onView,
  onEdit,
  onDelete,
  statusClass,
  onCoinsUpdated,
  viewMode = 'list',
}: Props) => {
  const [coinDialogOpen, setCoinDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

// Opens coins.
  const openCoins = (student: Student) => {
    setSelectedStudent(student);
    setCoinDialogOpen(true);
  };

  const renderActions = (student: Student) => (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-amber-600"
        onClick={() => openCoins(student)}
      >
        <Coins className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-cyan-600"
        onClick={() => onView(student.student_id || student.id || 0)}
      >
        <Info className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-blue-500"
        onClick={() => onEdit(student)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-red-500"
        onClick={() => onDelete(student.student_id || student.id || 0)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  const emptyText = hasActiveFilters ? 'No students match your search criteria' : 'No students found in this class';

  const dialog = (
    <StudentCoinsDialog
      open={coinDialogOpen}
      onOpenChange={setCoinDialogOpen}
      studentId={selectedStudent?.student_id || selectedStudent?.id}
      studentName={selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name}` : undefined}
      currentCoins={selectedStudent?.coins}
      onSaved={onCoinsUpdated}
    />
  );

  if (viewMode !== 'list') {
    return (
      <>
        {loading ? (
          <Card><CardContent className="py-12 text-center">Loading...</CardContent></Card>
        ) : students.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">{emptyText}</CardContent></Card>
        ) : (
          <div className={viewMode === 'compact' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'}>
            {students.map((student) => (
              <Card
                key={student.student_id || student.id}
                className={cn(
                  'transition-all hover:shadow-md',
                  viewMode === 'cards' && 'overflow-hidden border-border/60'
                )}
              >
                {viewMode === 'cards' && (
                  <div className="bg-gradient-to-br from-indigo-500 to-violet-500 p-5 text-white">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-lg">{student.first_name} {student.last_name}</h3>
                        <p className="text-xs text-white/80">{student.enrollment_number}</p>
                      </div>
                      <Badge variant="outline" className={cn('border-white/40 bg-white/15 text-white', statusClass(student.status))}>
                        {student.status}
                      </Badge>
                    </div>
                  </div>
                )}
                <CardContent className={viewMode === 'compact' ? 'p-3' : 'p-5 space-y-4'}>
                  {viewMode === 'compact' ? (
                    <div className="flex items-center gap-3">
                      <Folder className="h-8 w-8 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{student.first_name} {student.last_name}</p>
                        <p className="truncate text-xs text-muted-foreground">{student.email || student.phone}</p>
                      </div>
                      <Badge variant="outline" className={cn('text-xs', statusClass(student.status))}>
                        {student.status}
                      </Badge>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-2 text-sm">
                        <div className="flex justify-between gap-3"><span className="text-muted-foreground">Email</span><span className="truncate">{student.email}</span></div>
                        <div className="flex justify-between gap-3"><span className="text-muted-foreground">Phone</span><span>{student.phone}</span></div>
                        <div className="flex justify-between gap-3"><span className="text-muted-foreground">Coins</span><span className="font-semibold">{Number(student.coins || 0).toLocaleString()}</span></div>
                      </div>
                    </>
                  )}
                  <div className={viewMode === 'compact' ? 'mt-3 flex justify-end border-t pt-2' : 'border-t pt-3'}>
                    {renderActions(student)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {dialog}
      </>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Enrollment #</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>School</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Date of Birth</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Coins</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-12">
                Loading...
              </TableCell>
            </TableRow>
          ) : students.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                {emptyText}
              </TableCell>
            </TableRow>
          ) : (
            students.map((student) => (
              <TableRow key={student.student_id || student.id}>
                <TableCell className="font-mono text-sm">{student.enrollment_number}</TableCell>
                <TableCell className="font-medium">
                  {student.first_name} {student.last_name}
                </TableCell>
                <TableCell className="text-muted-foreground">{student.email}</TableCell>
                <TableCell className="text-muted-foreground">{student.phone}</TableCell>
                <TableCell className="text-muted-foreground">{student.school_name || '-'}</TableCell>
                <TableCell className="text-muted-foreground">{student.class_name || student.school_class || '-'}</TableCell>
                <TableCell className="text-muted-foreground">
                  {student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell>{student.gender}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn('text-xs font-semibold border', statusClass(student.status))}>
                    {student.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-semibold">
                  {Number(student.coins || 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {renderActions(student)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {dialog}
    </Card>
  );
};
