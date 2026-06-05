// Page component for the subjects screen in the crm feature.

import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Search, X, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SelectField } from '../students/components/SelectField';
import { useSubjectsPage } from './hooks/useSubjectsPage';

// Renders the subjects page screen.
const SubjectsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const {
    state,
    isModalOpen,
    editingId,
    formData,
    setFormData,
    classOptions,
    teacherOptions,
    isLoadingOptions,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleDelete,
    handleImportSubjects,
    handleExportSubjects,
    isImporting,
  } = useSubjectsPage();
  const filteredSubjects = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return state.items;

    return state.items.filter((subject) =>
      [
        subject.subject_code,
        subject.subject_name,
        subject.class_id,
        subject.teacher_id,
        subject.total_marks,
        subject.passing_marks,
      ]
        .filter((value) => value != null)
        .some((value) => String(value).toLowerCase().includes(search))
    );
  }, [searchTerm, state.items]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Subjects Management</h1>
        <div className="flex items-center gap-2">
          <input
            id="subjects-csv-import"
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              handleImportSubjects(event.target.files?.[0]);
              event.currentTarget.value = '';
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('subjects-csv-import')?.click()}
            disabled={isImporting}
          >
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {isImporting ? 'Importing...' : 'Import CSV'}
          </Button>
          <Button type="button" variant="outline" onClick={handleExportSubjects}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="mr-2 h-4 w-4" /> Add Subject
          </Button>
        </div>
      </div>

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search subjects by name, code, class, teacher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            onClick={() => setSearchTerm('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Subjects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.loading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredSubjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'No subjects match your search' : 'No subjects found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubjects.map((subject) => (
                    <TableRow key={subject.subject_id || subject.id}>
                      <TableCell className="font-medium">{subject.subject_name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenModal(subject)} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(subject.subject_id || subject.id || 0)} className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subject Name *</Label>
                <Input type="text" required value={formData.subject_name || ''} onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Subject Code *</Label>
                <Input type="text" required value={formData.subject_code || ''} onChange={(e) => setFormData({ ...formData, subject_code: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Class"
                name="class_id"
                value={formData.class_id || ''}
                onChange={(value) => setFormData({ ...formData, class_id: Number(value) })}
                options={classOptions}
                isLoading={isLoadingOptions}
                required
                placeholder="Select a class"
              />
              <SelectField
                label="Teacher"
                name="teacher_id"
                value={formData.teacher_id || ''}
                onChange={(value) => setFormData({ ...formData, teacher_id: value ? Number(value) : undefined })}
                options={teacherOptions}
                isLoading={isLoadingOptions}
                placeholder="Select a teacher (optional)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Marks *</Label>
                <Input type="number" required value={formData.total_marks || 100} onChange={(e) => setFormData({ ...formData, total_marks: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Passing Marks *</Label>
                <Input type="number" required value={formData.passing_marks || 40} onChange={(e) => setFormData({ ...formData, passing_marks: Number(e.target.value) })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
              <Button type="submit" disabled={state.loading}>{state.loading ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubjectsPage;
