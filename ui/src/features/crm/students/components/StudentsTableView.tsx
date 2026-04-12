import { useState } from 'react';
import { Coins, Info, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { StudentCoinsDialog } from '@/shared/components/StudentCoinsDialog';
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
}

export const StudentsTableView = ({
  students,
  loading,
  hasActiveFilters,
  onView,
  onEdit,
  onDelete,
  statusClass,
  onCoinsUpdated,
}: Props) => {
  const [coinDialogOpen, setCoinDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const openCoins = (student: Student) => {
    setSelectedStudent(student);
    setCoinDialogOpen(true);
  };

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Enrollment #</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
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
              <TableCell colSpan={9} className="text-center py-12">
                Loading...
              </TableCell>
            </TableRow>
          ) : students.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                {hasActiveFilters ? 'No students match your search criteria' : 'No students found in this class'}
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
                <TableCell className="text-muted-foreground">
                  {new Date(student.date_of_birth).toLocaleDateString()}
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
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <StudentCoinsDialog
        open={coinDialogOpen}
        onOpenChange={setCoinDialogOpen}
        studentId={selectedStudent?.student_id || selectedStudent?.id}
        studentName={selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name}` : undefined}
        currentCoins={selectedStudent?.coins}
        onSaved={onCoinsUpdated}
      />
    </Card>
  );
};

