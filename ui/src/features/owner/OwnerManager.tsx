// Source file for the OwnerManager.tsx area in the owner feature.

import { memo } from 'react';
import { useOwnerManager } from './hooks/useOwnerManager';
import { OwnerManagerContentHeader } from './components/OwnerManagerContentHeader';
import { OwnerManagerTable } from './components/OwnerManagerTable';
import { OwnerManagerDialog } from './components/OwnerManagerDialog';
import { OwnerOverviewPanel } from './components/OwnerOverviewPanel';
import { OwnerWelcomeHero } from './components/OwnerWelcomeHero';

// Renders the owner manager module.
const OwnerManager = memo(() => {
  const vm = useOwnerManager();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/70 to-fuchsia-50/60 text-foreground dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6 lg:px-8">
        <OwnerWelcomeHero />

        <OwnerManagerContentHeader
          currentMeta={vm.currentMeta}
          activeTab={vm.activeTab}
          dataCount={vm.dataCount}
          activeCenterLabel={vm.activeCenterLabel}
          scopedMessage={vm.scopedMessage}
          needsCenterScope={vm.needsCenterScope}
          isScopedAndMissingCenter={vm.isScopedAndMissingCenter}
          onAdd={vm.handleOpenCreate}
          onTabChange={vm.handleTabChange}
          loading={vm.loading}
        />

        <OwnerOverviewPanel
          collections={vm.overviewCollections}
          summary={vm.overviewSummary}
          activeCenterLabel={vm.overviewCenterLabel}
          loading={vm.overviewLoading}
        />

        <OwnerManagerTable
          activeTab={vm.activeTab}
          columns={vm.columns}
          data={vm.data}
          loading={vm.loading}
          showForm={vm.showForm}
          isScopedAndMissingCenter={vm.isScopedAndMissingCenter}
          onEdit={vm.handleEdit}
          onDelete={vm.handleDelete}
          onHardDelete={vm.handleHardDelete}
          onResetPassword={vm.handleResetPassword}
          canHardDelete={vm.canHardDelete}
        />

        {vm.activeTab !== 'statistics' && vm.activeTab !== 'finance' && (
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
