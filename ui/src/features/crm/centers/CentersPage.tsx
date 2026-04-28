// Page component for the centers screen in the crm feature.

import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { CRUDTable } from '../../../shared/components/CRUDComponents';
import { useCentersPage } from './hooks/useCentersPage';

// Renders the centers page screen.
const CentersPage = () => {
  const {
    state,
    isModalOpen,
    editingId,
    formData,
    setFormData,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleDelete,
    activeCenterId,
    handleActivateCenter,
    columns,
  } = useCentersPage();

  const activeCenter = state.items.find((center) => Number(center.center_id || center.id) === Number(activeCenterId));
  const activeCenterLabel = activeCenter
    ? `${activeCenter.center_name || 'Center'} (${activeCenter.center_code || activeCenter.center_id || activeCenter.id || 'n/a'})`
    : 'No active branch selected';

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Centers Management</h1>
          <p className="text-muted-foreground mt-1">Create a new branch, activate it, and start working inside it right away.</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Center
        </Button>
      </div>

      <Card className="border border-border/60 bg-card shadow-sm">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Branch</p>
              <h2 className="text-xl font-semibold mt-1">{activeCenterLabel}</h2>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <p className="text-sm text-muted-foreground">{state.items.length} centers available</p>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Label htmlFor="active-center-select" className="sr-only">Switch branch</Label>
                <select
                  id="active-center-select"
                  className="h-10 w-full md:w-[260px] rounded-md border border-input bg-background px-3 text-sm"
                  value={activeCenterId ?? ''}
                  onChange={(e) => handleActivateCenter(Number(e.target.value))}
                >
                  <option value="" disabled>Select branch</option>
                  {state.items.map((center) => {
                    const centerId = Number(center.center_id || center.id);
                    return (
                      <option key={centerId} value={centerId}>
                        {center.center_name || center.center_code || `Center ${centerId}`}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {state.error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {state.loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <CRUDTable
          title=""
          data={state.items}
          columns={columns}
          onAdd={() => handleOpenModal()}
          onEdit={handleOpenModal}
          onDelete={handleDelete}
          extraActions={(center) => {
            const centerId = Number(center.center_id || center.id);
            const isActive = Number(activeCenterId) === centerId;
            return (
              <Button
                variant={isActive ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => handleActivateCenter(centerId)}
                className={isActive ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : ''}
              >
                {isActive ? 'Active' : 'Use Branch'}
              </Button>
            );
          }}
        />
      )}

      {/* Form Dialog */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Center' : 'Add New Center'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="center_name">Center Name *</Label>
              <Input
                id="center_name"
                required
                value={formData.center_name || ''}
                onChange={(e) => setFormData({ ...formData, center_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="center_code">Center Code *</Label>
              <Input
                id="center_code"
                required
                value={formData.center_code || ''}
                onChange={(e) => setFormData({ ...formData, center_code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                required
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                required
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                required
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="principal_name">Principal Name *</Label>
              <Input
                id="principal_name"
                required
                value={formData.principal_name || ''}
                onChange={(e) => setFormData({ ...formData, principal_name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={state.loading}>
              {state.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CentersPage;
