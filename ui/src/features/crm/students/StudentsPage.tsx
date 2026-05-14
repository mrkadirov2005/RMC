// Page component for the students screen in the crm feature.

import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { ViewModeToggle, type ViewMode } from '@/components/common/ViewModeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StudentsClassCards } from './components/StudentsClassCards';
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
  const [classSearchTerm, setClassSearchTerm] = useState('');
  const s = useStudentsPage();
  const title = s.selectedClass ? `${s.selectedClass.class_name} - Students` : 'Students by Class';
// Handles active count.
  const activeCount = (s.filterGender ? 1 : 0) + (s.filterStatus ? 1 : 0);
  const filteredClasses = useMemo(() => {
    const search = classSearchTerm.trim().toLowerCase();
    if (!search) return s.classes;

    return s.classes.filter((cls) => {
      const classId = Number(cls.class_id || cls.id);
      const classStudents = s.state.items.filter((student) => Number(student.class_id) === classId);
      const searchableValues = [
        cls.class_name,
        cls.class_code,
        cls.level,
        (cls as any).section,
        (cls as any).room_number,
        ...classStudents.flatMap((student) => [
          `${student.first_name || ''} ${student.last_name || ''}`,
          student.email,
          student.phone,
          student.enrollment_number,
          student.parent_name,
        ]),
      ];

      return searchableValues
        .filter((value) => value != null)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  }, [classSearchTerm, s.classes, s.state.items]);

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StudentsHeader title={title} onBack={s.selectedClass ? s.handleBackToClasses : undefined} onAdd={s.handleOpenModal} />
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
      </div>
      {s.state.error && <Alert variant="destructive" className="mb-6"><AlertDescription>{s.state.error}</AlertDescription></Alert>}
      {!s.selectedClass ? (
        <>
          <div className="relative mb-4 max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search classes or students by name, phone, email..."
              value={classSearchTerm}
              onChange={(e) => setClassSearchTerm(e.target.value)}
              className="pl-10 pr-10"
            />
            {classSearchTerm && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                onClick={() => setClassSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {filteredClasses.length === 0 ? (
            <Alert className="mb-4">
              <AlertDescription>No classes or students match your search.</AlertDescription>
            </Alert>
          ) : (
            <StudentsClassCards classes={filteredClasses} students={s.state.items} onClassClick={s.handleClassClick} viewMode={viewMode} />
          )}
        </>
      ) : (
        <>
          <StudentsFiltersBar searchTerm={s.searchTerm} onSearchChange={s.setSearchTerm} onClearSearch={() => s.setSearchTerm('')} showFilters={s.showFilters} onToggleFilters={() => s.setShowFilters(!s.showFilters)} hasActiveFilters={s.hasActiveFilters} activeCount={activeCount} onClearAll={s.clearFilters} />
          <StudentsFilterPanel open={s.showFilters} gender={s.filterGender} status={s.filterStatus} onGender={s.setFilterGender} onStatus={s.setFilterStatus} genderOptions={s.genderOptions} statusOptions={s.statusOptions} />
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
        </>
      )}
      <StudentsFormDialog open={s.isModalOpen} editing={Boolean(s.editingId)} formData={s.formData} setFormData={s.setFormData} centerOptions={s.centerOptions} classOptions={s.classOptions} teacherOptions={s.teacherOptions} genderOptions={s.genderOptions} statusOptions={s.statusOptions} onClose={s.handleCloseModal} onSubmit={s.handleSubmit} loading={s.state.loading} showCenterField={s.isOwner} error={s.state.error} />
    </div>
  );
};

export default StudentsPage;
