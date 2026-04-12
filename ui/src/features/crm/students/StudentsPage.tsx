import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { StudentsClassCards } from './components/StudentsClassCards';
import { StudentsFilterPanel } from './components/StudentsFilterPanel';
import { StudentsFiltersBar } from './components/StudentsFiltersBar';
import { StudentsFormDialog } from './components/StudentsFormDialog';
import { StudentsHeader } from './components/StudentsHeader';
import { StudentsTableView } from './components/StudentsTableView';
import { useStudentsPage } from './hooks/useStudentsPage';

const StudentsPage = () => {
  const navigate = useNavigate();
  const s = useStudentsPage();
  const title = s.selectedClass ? `${s.selectedClass.class_name} - Students` : 'Students by Class';
  const activeCount = (s.filterGender ? 1 : 0) + (s.filterStatus ? 1 : 0);

  return (
    <div className="p-6">
      <StudentsHeader title={title} onBack={s.selectedClass ? s.handleBackToClasses : undefined} onAdd={s.handleOpenModal} />
      {s.state.error && <Alert variant="destructive" className="mb-6"><AlertDescription>{s.state.error}</AlertDescription></Alert>}
      {!s.selectedClass ? (
        <StudentsClassCards classes={s.classes} students={s.state.items} onClassClick={s.handleClassClick} />
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
          />
        </>
      )}
      <StudentsFormDialog open={s.isModalOpen} editing={Boolean(s.editingId)} formData={s.formData} setFormData={s.setFormData} centerOptions={s.centerOptions} classOptions={s.classOptions} teacherOptions={s.teacherOptions} genderOptions={s.genderOptions} statusOptions={s.statusOptions} onClose={s.handleCloseModal} onSubmit={s.handleSubmit} loading={s.state.loading} showCenterField={s.isOwner} />
    </div>
  );
};

export default StudentsPage;
