// View component for the students screen in the crm feature.

import { useEffect, useState } from 'react';
import { Coins, Folder, Info, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  onBulkDelete?: (ids: number[]) => Promise<void> | void;
  onUsernameUpdate?: (student: Student, username: string) => Promise<void> | void;
  onCoinsUpdated?: () => void;
  viewMode?: ViewMode;
}

const UsernameField = ({
  student,
  onUsernameUpdate,
}: {
  student: Student;
  onUsernameUpdate?: (student: Student, username: string) => Promise<void> | void;
}) => {
  const [value, setValue] = useState(student.username || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(student.username || '');
  }, [student.username]);

  const save = async () => {
    const next = value.trim();
    const current = String(student.username || '').trim();
    if (!onUsernameUpdate || next === current || saving) return;

    setSaving(true);
    try {
      await onUsernameUpdate(student, next);
    } catch {
      setValue(current);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[220px]">
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          }
          if (event.key === 'Escape') {
            setValue(student.username || '');
            event.currentTarget.blur();
          }
        }}
        disabled={saving}
        placeholder="username"
        className="h-8 bg-white/80 text-sm dark:bg-background"
      />
      {saving && <p className="mt-1 text-xs text-muted-foreground">Saving...</p>}
    </div>
  );
};

// Renders the students table view view.
export const StudentsTableView = ({
  students,
  loading,
  hasActiveFilters,
  onView,
  onEdit,
  onDelete,
  onBulkDelete,
  onUsernameUpdate,
  onCoinsUpdated,
  viewMode = 'list',
}: Props) => {
  const [coinDialogOpen, setCoinDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const getStudentId = (student: Student) => Number(student.student_id || student.id || 0);
  const visibleIds = students.map(getStudentId).filter((id) => id > 0);
  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.has(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;

  const toggleStudent = (id: number, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAllVisible = (checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of visibleIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };
  const deleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || !onBulkDelete) return;
    await onBulkDelete(ids);
    setSelectedIds(new Set());
  };

// Opens coins.
  const openCoins = (student: Student) => {
    setSelectedStudent(student);
    setCoinDialogOpen(true);
  };

  const renderActions = (student: Student) => (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-muted"
            aria-label="Open student actions"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => openCoins(student)} className="gap-2">
            <Coins className="h-4 w-4 text-amber-600" />
            Coins
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onView(student.student_id || student.id || 0)} className="gap-2">
            <Info className="h-4 w-4 text-cyan-600" />
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit(student)} className="gap-2">
            <Pencil className="h-4 w-4 text-blue-500" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(student.student_id || student.id || 0)}
            className="gap-2 text-red-600 focus:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm shadow-sm dark:border-border dark:bg-card">
            <span className="font-medium">{selectedIds.size} selected</span>
            <div className="flex items-center gap-2">
              {onBulkDelete && (
                <Button type="button" variant="outline" size="sm" onClick={deleteSelected}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            </div>
          </div>
        )}
        {loading ? (
          <Card className="border-sky-100 bg-white shadow-sm dark:border-border dark:bg-card"><CardContent className="py-12 text-center">Loading...</CardContent></Card>
        ) : students.length === 0 ? (
          <Card className="border-sky-100 bg-white shadow-sm dark:border-border dark:bg-card"><CardContent className="py-12 text-center text-muted-foreground">{emptyText}</CardContent></Card>
        ) : (
          <div className={viewMode === 'compact' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'}>
            {students.map((student, index) => (
              <Card
                key={student.student_id || student.id}
                className={cn(
                  'relative overflow-hidden border-slate-200/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-border dark:bg-card dark:hover:translate-y-0',
                  viewMode === 'cards' && 'border-border/60'
                )}
              >
                <div className="absolute right-3 top-3 z-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(getStudentId(student))}
                    onChange={(event) => toggleStudent(getStudentId(student), event.target.checked)}
                    className="h-4 w-4"
                    aria-label={`Select ${student.first_name} ${student.last_name}`}
                  />
                </div>
                {viewMode === 'cards' && (
                  <div className={cn(
                    'p-5 text-white',
                    index % 4 === 0 && 'bg-gradient-to-br from-indigo-500 to-sky-500',
                    index % 4 === 1 && 'bg-gradient-to-br from-emerald-500 to-teal-500',
                    index % 4 === 2 && 'bg-gradient-to-br from-amber-500 to-orange-500',
                    index % 4 === 3 && 'bg-gradient-to-br from-cyan-500 to-fuchsia-500'
                  )}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-lg">{student.first_name} {student.last_name}</h3>
                      </div>
                    </div>
                  </div>
                )}
                <CardContent className={viewMode === 'compact' ? 'p-3' : 'p-5 space-y-4'}>
                  {viewMode === 'compact' ? (
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-100 to-emerald-100 text-sky-700 dark:bg-muted dark:bg-none dark:text-primary">
                        <Folder className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{student.first_name} {student.last_name}</p>
                        <div className="mt-2">
                          <UsernameField student={student} onUsernameUpdate={onUsernameUpdate} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="font-semibold text-lg text-slate-950 dark:text-card-foreground">
                        {student.first_name} {student.last_name}
                      </h3>
                      <div className="mt-3">
                        <UsernameField student={student} onUsernameUpdate={onUsernameUpdate} />
                      </div>
                    </div>
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
    <Card className="overflow-hidden border-slate-200/80 bg-white shadow-[0_18px_50px_-38px_rgba(15,23,42,0.6)] dark:border-border dark:bg-card dark:shadow-sm">
      <div className="h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 dark:hidden" />
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between border-b bg-sky-50/70 px-4 py-2 text-sm dark:bg-muted/50">
          <span className="font-medium">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2">
            {onBulkDelete && (
              <Button type="button" variant="outline" size="sm" onClick={deleteSelected}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}
      <Table>
        <TableHeader className="bg-slate-50/90 dark:bg-transparent">
          <TableRow>
            <TableHead className="w-10">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                ref={(input) => {
                  if (input) input.indeterminate = selectedVisibleCount > 0 && !allVisibleSelected;
                }}
                onChange={(event) => toggleAllVisible(event.target.checked)}
                aria-label="Select all visible students"
                className="h-4 w-4"
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Username</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-12">
                Loading...
              </TableCell>
            </TableRow>
          ) : students.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                {emptyText}
              </TableCell>
            </TableRow>
          ) : (
            students.map((student) => (
              <TableRow key={student.student_id || student.id} className="hover:bg-sky-50/60 dark:hover:bg-muted/50">
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(getStudentId(student))}
                    onChange={(event) => toggleStudent(getStudentId(student), event.target.checked)}
                    aria-label={`Select ${student.first_name} ${student.last_name}`}
                    className="h-4 w-4"
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <button
                    type="button"
                    className="text-left font-semibold text-slate-950 hover:text-sky-700 dark:text-card-foreground dark:hover:text-primary"
                    onClick={() => onView(student.student_id || student.id || 0)}
                  >
                    {student.first_name} {student.last_name}
                  </button>
                </TableCell>
                <TableCell>
                  <UsernameField student={student} onUsernameUpdate={onUsernameUpdate} />
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
