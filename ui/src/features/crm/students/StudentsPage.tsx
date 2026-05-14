// Page component for the students screen in the crm feature.

import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { ViewModeToggle, type ViewMode } from '@/components/common/ViewModeToggle';
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
  const s = useStudentsPage();
  const title = s.selectedClass ? `${s.selectedClass.class_name} - Students` : 'Students by Class';
// Handles active count.
  const activeCount = (s.filterGender ? 1 : 0) + (s.filterStatus ? 1 : 0);

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StudentsHeader title={title} onBack={s.selectedClass ? s.handleBackToClasses : undefined} onAdd={s.handleOpenModal} />
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
      </div>
      {s.state.error && <Alert variant="destructive" className="mb-6"><AlertDescription>{s.state.error}</AlertDescription></Alert>}
      {!s.selectedClass ? (
        <StudentsClassCards classes={s.classes} students={s.state.items} onClassClick={s.handleClassClick} viewMode={viewMode} />
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
