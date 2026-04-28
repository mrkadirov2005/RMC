// Source file for the OwnerManager.tsx area in the owner feature.

import { memo } from 'react';
import { useOwnerManager } from './hooks/useOwnerManager';
import { OwnerManagerHeader } from './components/OwnerManagerHeader';
import { OwnerManagerTable } from './components/OwnerManagerTable';
import { OwnerManagerDialog } from './components/OwnerManagerDialog';
import { OwnerManagerStatistics } from './components/OwnerManagerStatistics';

// Renders the owner manager module.
const OwnerManager = memo(() => {
  const vm = useOwnerManager();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <OwnerManagerHeader
          currentMeta={vm.currentMeta}
          activeTab={vm.activeTab}
          dataCount={vm.dataCount}
          centerCount={vm.centerCount}
          activeCenterLabel={vm.activeCenterLabel}
          scopedMessage={vm.scopedMessage}
          needsCenterScope={vm.needsCenterScope}
          isScopedAndMissingCenter={vm.isScopedAndMissingCenter}
          onAdd={vm.handleOpenCreate}
          onTabChange={vm.handleTabChange}
          loading={vm.loading}
        />

        {vm.activeTab === 'statistics' ? (
          <OwnerManagerStatistics
            summary={vm.statistics}
            collections={vm.statisticsCollections}
            loading={vm.loading}
          />
        ) : (
          <OwnerManagerTable
            activeTab={vm.activeTab}
            columns={vm.columns}
            data={vm.data}
            loading={vm.loading}
            showForm={vm.showForm}
            isScopedAndMissingCenter={vm.isScopedAndMissingCenter}
            onEdit={vm.handleEdit}
            onDelete={vm.handleDelete}
            onResetPassword={vm.handleResetPassword}
          />
        )}

        {vm.activeTab !== 'statistics' && (
          <OwnerManagerDialog
            activeTab={vm.activeTab}
            currentMeta={vm.currentMeta}
            showForm={vm.showForm}
            editingId={vm.editingId}
            loading={vm.loading}
            centerOptions={vm.centerOptions}
            formData={vm.formData}
            selectedPermissions={vm.selectedPermissions}
            onInputChange={vm.handleInputChange}
            onPermissionToggle={vm.handlePermissionToggle}
            onSubmit={vm.handleSubmit}
            onClose={vm.handleCloseForm}
          />
        )}
      </div>
    </div>
  );
});

OwnerManager.displayName = 'OwnerManager';

export default OwnerManager;
