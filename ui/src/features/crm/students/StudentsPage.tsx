// Page component for the students screen in the crm feature.

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { ViewModeToggle, type ViewMode } from '@/components/common/ViewModeToggle';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StudentsFilterPanel } from './components/StudentsFilterPanel';
import { StudentsFiltersBar } from './components/StudentsFiltersBar';
import { StudentsFormDialog } from './components/StudentsFormDialog';
import { StudentsHeader } from './components/StudentsHeader';
import { StudentsTableView } from './components/StudentsTableView';
import { useStudentsPage } from './hooks/useStudentsPage';

// Renders the students page screen.
const StudentsPage = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const s = useStudentsPage();
  const title = 'Students';
// Handles active count.
  const activeCount = [
    s.searchTerm,
    s.filterSchool,
    s.filterClassId,
    s.filterSubjectId,
    s.filterLevel,
    s.filterAddress,
    s.filterAge,
    s.filterGender,
    s.filterStatus,
  ].filter(Boolean).length;
  const schoolOptions = useMemo(() => {
    const values = new Set<string>();
    for (const student of s.state.items) {
      const school = String(student.school_name || '').trim();
      if (school) values.add(school);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [s.state.items]);
  const levelOptions = useMemo(() => {
    const values = new Set<number>();
    for (const cls of s.classes) {
      const level = Number(cls.level);
      if (Number.isFinite(level)) values.add(level);
    }
    return Array.from(values).sort((a, b) => a - b);
  }, [s.classes]);
  const addressOptions = useMemo(() => {
    const values = new Set<string>();
    for (const center of s.centerItems || []) {
      const address = String((center as any).address || '').trim();
      if (address) values.add(address);
    }
    for (const student of s.state.items) {
      const address = String(student.center_address || '').trim();
      if (address) values.add(address);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [s.centerItems, s.state.items]);
  const total = Number(s.state.meta?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / s.limit));
  const start = total === 0 ? 0 : (s.page - 1) * s.limit + 1;
  const end = Math.min(total, s.page * s.limit);

  return (
    <div className="p-6">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StudentsHeader title={title} />
        <div className="flex items-center gap-2">
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
          <Button onClick={() => s.handleOpenModal()} className="bg-gradient-to-br from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 px-6 py-3 rounded-lg font-semibold">
            <Plus className="w-5 h-5 mr-2" /> Add Student
          </Button>
        </div>
      </div>
      {s.state.error && <Alert variant="destructive" className="mb-6"><AlertDescription>{s.state.error}</AlertDescription></Alert>}
      <StudentsFiltersBar searchTerm={s.searchTerm} onSearchChange={s.setSearchTerm} onClearSearch={() => s.setSearchTerm('')} showFilters={s.showFilters} onToggleFilters={() => s.setShowFilters(!s.showFilters)} hasActiveFilters={s.hasActiveFilters} activeCount={activeCount} onClearAll={s.clearFilters} />
      <StudentsFilterPanel
        open={s.showFilters}
        gender={s.filterGender}
        status={s.filterStatus}
        school={s.filterSchool}
        classId={s.filterClassId}
        subjectId={s.filterSubjectId}
        level={s.filterLevel}
        address={s.filterAddress}
        age={s.filterAge}
        onGender={s.setFilterGender}
        onStatus={s.setFilterStatus}
        onSchool={s.setFilterSchool}
        onClassId={s.setFilterClassId}
        onSubjectId={s.setFilterSubjectId}
        onLevel={s.setFilterLevel}
        onAddress={s.setFilterAddress}
        onAge={s.setFilterAge}
        genderOptions={s.genderOptions}
        statusOptions={s.statusOptions}
        schoolOptions={schoolOptions}
        classOptions={s.classOptions}
        subjectOptions={s.subjectOptions}
        levelOptions={levelOptions}
        addressOptions={addressOptions}
      />
      <StudentsTableView
        students={s.displayedStudents}
        loading={s.state.loading}
        hasActiveFilters={s.hasActiveFilters}
        onView={(id) => navigate(`/student/${id}`)}
        onEdit={s.handleOpenModal}
        onDelete={s.handleDelete}
        statusClass={s.getStatusVariant}
        onCoinsUpdated={s.actions.fetchAll}
        viewMode={viewMode}
      />
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {start}-{end} of {total} students
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(s.limit)} onValueChange={(value) => s.setLimit(Number(value))}>
            <SelectTrigger className="h-9 w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((value) => <SelectItem key={value} value={String(value)}>{value} / page</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => s.setPage(Math.max(1, s.page - 1))} disabled={s.page <= 1 || s.state.loading}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Prev
          </Button>
          <span className="min-w-[90px] text-center text-sm font-medium">Page {s.page} / {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => s.setPage(Math.min(totalPages, s.page + 1))} disabled={s.page >= totalPages || s.state.loading}>
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
      <StudentsFormDialog open={s.isModalOpen} editing={Boolean(s.editingId)} formData={s.formData} setFormData={s.setFormData} centerOptions={s.centerOptions} classOptions={s.classOptions} teacherOptions={s.teacherOptions} genderOptions={s.genderOptions} statusOptions={s.statusOptions} onClose={s.handleCloseModal} onSubmit={s.handleSubmit} loading={s.state.loading} showCenterField={s.isOwner} error={s.state.error} />
    </div>
  );
};

export default StudentsPage;
