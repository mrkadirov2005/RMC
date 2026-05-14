// Page component for the teachers screen in the crm feature.

import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, Mail, Phone, GraduationCap, User, X, Loader2, Search } from 'lucide-react';
import { useTeachersPage } from './hooks/useTeachersPage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ViewModeToggle, type ViewMode } from '@/components/common/ViewModeToggle';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Renders the teachers page screen.
const TeachersPage = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const {
    navigate,
    state,
    isModalOpen,
    editingId,
    formData,
    setFormData,
    centerOptions,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleDelete,
    getStatusColor,
    getInitials,
    genderOptions,
    teacherStatusOptions,
    isOwner,
  } = useTeachersPage();
  const filteredTeachers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return state.items;

    return state.items.filter((teacher) =>
      [
        `${teacher.first_name || ''} ${teacher.last_name || ''}`,
        teacher.first_name,
        teacher.last_name,
        teacher.employee_id,
        teacher.specialization,
        teacher.qualification,
        teacher.email,
        teacher.phone,
        teacher.status,
      ]
        .filter((value) => value != null)
        .some((value) => String(value).toLowerCase().includes(search))
    );
  }, [searchTerm, state.items]);

  return (
    <div className="p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <h1 className="text-3xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
          Teachers Management
        </h1>
        <div className="flex items-center gap-2">
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
          <Button
            onClick={() => handleOpenModal()}
            className="bg-gradient-to-br from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 px-6 py-3 rounded-lg font-semibold"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Teacher
          </Button>
        </div>
      </div>

      {state.error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="relative mb-6 max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search teachers by name, ID, subject, email, phone..."
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

      {state.loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        </div>
      ) : state.items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <User className="w-16 h-16 mx-auto opacity-30 mb-4" />
          <h3 className="text-lg font-semibold">No teachers found</h3>
          <p className="text-sm">Click &quot;Add Teacher&quot; to get started</p>
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <User className="w-16 h-16 mx-auto opacity-30 mb-4" />
          <h3 className="text-lg font-semibold">No teachers match your search</h3>
          <p className="text-sm">Try a different name, ID, email, or specialization</p>
        </div>
      ) : viewMode === 'list' ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers.map((teacher) => (
                <TableRow key={teacher.teacher_id || teacher.id}>
                  <TableCell className="font-medium">{teacher.first_name} {teacher.last_name}</TableCell>
                  <TableCell className="font-mono text-sm">{teacher.employee_id}</TableCell>
                  <TableCell>{teacher.specialization}</TableCell>
                  <TableCell className="text-muted-foreground">{teacher.email}</TableCell>
                  <TableCell className="text-muted-foreground">{teacher.phone}</TableCell>
                  <TableCell>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold border', getStatusColor(teacher.status))}>
                      {teacher.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-cyan-600" onClick={() => navigate(`/teacher/${teacher.teacher_id || teacher.id}`)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-700" onClick={() => handleOpenModal(teacher)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => handleDelete(teacher.teacher_id || teacher.id || 0)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : viewMode === 'compact' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredTeachers.map((teacher) => (
            <Card key={teacher.teacher_id || teacher.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate(`/teacher/${teacher.teacher_id || teacher.id}`)}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
                    {getInitials(teacher.first_name, teacher.last_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{teacher.first_name} {teacher.last_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{teacher.specialization}</p>
                  </div>
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold border', getStatusColor(teacher.status))}>
                    {teacher.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredTeachers.map((teacher) => (
            <Card
              key={teacher.teacher_id || teacher.id}
              className="h-full flex flex-col rounded-2xl transition-all duration-300 border border-border/10 hover:-translate-y-2 hover:shadow-xl hover:shadow-indigo-500/15"
            >
              <div className="bg-gradient-to-br from-indigo-500 to-violet-500 p-6 flex flex-col items-center relative rounded-t-2xl">
                <div className="w-20 h-20 rounded-full bg-white/20 border-[3px] border-white/40 flex items-center justify-center text-white text-xl font-bold mb-2">
                  {getInitials(teacher.first_name, teacher.last_name)}
                </div>
                <h3 className="text-white font-semibold text-lg text-center">
                  {teacher.first_name} {teacher.last_name}
                </h3>
                <span className="text-white/80 text-xs font-medium">{teacher.employee_id}</span>
                <span
                  className={cn(
                    'absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-semibold border',
                    getStatusColor(teacher.status)
                  )}
                >
                  {teacher.status}
                </span>
              </div>

              <CardContent className="flex-grow p-5">
                <div className="flex items-center gap-2 mb-3">
                  <GraduationCap className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-semibold">{teacher.specialization}</span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground truncate">{teacher.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{teacher.phone}</span>
                </div>
                <div className="mt-4">
                  <Badge variant="outline" className="text-[0.7rem]">
                    {teacher.qualification}
                  </Badge>
                </div>
              </CardContent>

              <div className="flex justify-between items-center p-4 border-t border-border/10 bg-muted/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/teacher/${teacher.teacher_id || teacher.id}`)}
                  className="text-sm"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-blue-500 hover:text-blue-700"
                    onClick={() => handleOpenModal(teacher)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700"
                    onClick={() => handleDelete(teacher.teacher_id || teacher.id || 0)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-2xl rounded-2xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="bg-gradient-to-br from-indigo-500 to-violet-500 px-6 py-4">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-white font-semibold text-lg">
                {editingId ? 'Edit Teacher' : 'Add New Teacher'}
              </DialogTitle>
              <button onClick={handleCloseModal} className="text-white hover:text-white/80 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input id="first_name" required value={formData.first_name || ''} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input id="last_name" required value={formData.last_name || ''} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employee_id">Employee ID</Label>
                  <Input id="employee_id" required value={formData.employee_id || ''} onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" required value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input id="date_of_birth" type="date" required value={formData.date_of_birth || ''} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qualification">Qualification</Label>
                  <Input id="qualification" required value={formData.qualification || ''} onChange={(e) => setFormData({ ...formData, qualification: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input id="specialization" required value={formData.specialization || ''} onChange={(e) => setFormData({ ...formData, specialization: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={formData.gender || 'Male'} onValueChange={(val) => setFormData({ ...formData, gender: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{genderOptions.map((opt) => <SelectItem key={opt.id} value={String(opt.value)}>{opt.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status || 'Active'} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{teacherStatusOptions.map((opt) => <SelectItem key={opt.id} value={String(opt.value)}>{opt.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {isOwner && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="center">Center</Label>
                    <Select value={String(formData.center_id || '')} onValueChange={(val) => setFormData({ ...formData, center_id: Number(val) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{centerOptions.map((opt) => <SelectItem key={opt.id} value={String(opt.value)}>{opt.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                {!editingId && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input id="username" required value={formData.username || ''} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" type="password" required value={formData.password || ''} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                    </div>
                  </>
                )}
              </div>
            </div>
            <DialogFooter className="px-6 py-4">
              <Button type="button" variant="outline" onClick={handleCloseModal} className="rounded-lg">
                Cancel
              </Button>
              <Button type="submit" disabled={state.loading} className="bg-gradient-to-br from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 rounded-lg px-8">
                {state.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeachersPage;
