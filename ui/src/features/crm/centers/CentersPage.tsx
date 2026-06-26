// Page component for the centers screen in the crm feature.

import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Building2,
  GraduationCap,
  Loader2,
  Plus,
  Search,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { formatMoney } from '@/utils/helpers';
import { centerAPI } from '@/shared/api/api';
import { useCentersPage } from './hooks/useCentersPage';
import { PaginationBar, defaultPageSizeOptions, paginateItems } from '@/components/common/PaginationBar';
import {
  buildCenterSummaries,
  CenterRow,
  type CenterMetrics,
  emptyMetrics,
  getCenterId,
  HeroSignal,
  InsightCard,
  MetricTile,
} from './components/CentersVisuals';

// Renders the centers page screen.
const CentersPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [metrics, setMetrics] = useState<CenterMetrics>(emptyMetrics);
  const [metricsLoading, setMetricsLoading] = useState(true);
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
  } = useCentersPage();

  useEffect(() => {
    let alive = true;
    const loadMetrics = async () => {
      setMetricsLoading(true);
      try {
        const response = await centerAPI.getSummaries().catch(() => ({ data: [] }));
        if (!alive) return;
        setMetrics({
          summaries: toRows(response).map((summary: any) => ({
            center_id: Number(summary?.center_id || 0),
            students: Number(summary?.students || 0),
            teachers: Number(summary?.teachers || 0),
            classes: Number(summary?.classes || 0),
            payments: Number(summary?.payments || 0),
            collected: Number(summary?.collected || 0),
          })),
        });
      } finally {
        if (alive) setMetricsLoading(false);
      }
    };
    loadMetrics();
    return () => {
      alive = false;
    };
  }, []);

  const activeCenter = state.items.find((center) => Number(center.center_id || center.id) === Number(activeCenterId));
  const activeCenterLabel = activeCenter
    ? `${activeCenter.center_name || 'Center'} (${activeCenter.center_code || activeCenter.center_id || activeCenter.id || 'n/a'})`
    : 'No active branch selected';
  const filteredCenters = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return state.items;

    return state.items.filter((center) =>
      [
        center.center_name,
        center.center_code,
        center.email,
        center.phone,
        center.address,
        center.city,
        center.principal_name,
      ]
        .filter((value) => value != null)
        .some((value) => String(value).toLowerCase().includes(search))
    );
  }, [searchTerm, state.items]);
  const paginatedCenters = useMemo(
    () => paginateItems(filteredCenters, page, pageSize),
    [filteredCenters, page, pageSize]
  );
  const centerSummaries = useMemo(() => buildCenterSummaries(state.items, metrics), [state.items, metrics]);
  const activeSummary = activeCenterId ? centerSummaries.get(Number(activeCenterId)) : undefined;
  const totalCollected = useMemo(
    () => metrics.summaries.reduce((sum, summary) => sum + Number(summary.collected || 0), 0),
    [metrics.summaries]
  );
  const totalStudents = useMemo(
    () => metrics.summaries.reduce((sum, summary) => sum + Number(summary.students || 0), 0),
    [metrics.summaries]
  );
  const totalTeachers = useMemo(
    () => metrics.summaries.reduce((sum, summary) => sum + Number(summary.teachers || 0), 0),
    [metrics.summaries]
  );
  const totalClasses = useMemo(
    () => metrics.summaries.reduce((sum, summary) => sum + Number(summary.classes || 0), 0),
    [metrics.summaries]
  );
  const topCenter = useMemo(
    () => [...centerSummaries.values()].sort((a, b) => b.collected - a.collected)[0],
    [centerSummaries]
  );
  const totalCapacity = state.items.length;

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-5">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 p-5 text-white">
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-white/10 px-2.5 py-1 text-xs font-black text-white/80">Markazlar</span>
                <span className="rounded bg-cyan-400/15 px-2.5 py-1 text-xs font-black text-cyan-100">{state.items.length} centers</span>
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight">Centers Management</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold text-white/65">
                Switch active branch, compare center performance, and manage branch details from one focused workspace.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <HeroSignal Icon={GraduationCap} label="Students" value={totalStudents.toLocaleString()} />
                <HeroSignal Icon={Users} label="Teachers" value={totalTeachers.toLocaleString()} />
                <HeroSignal Icon={Wallet} label="Collected" value={formatMoney(totalCollected)} />
              </div>
            </div>
            <div className="absolute -right-24 -top-24 h-60 w-60 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="absolute -bottom-28 left-16 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" />
          </div>

          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-slate-500">Active Branch</p>
                <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{activeCenterLabel}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {activeSummary ? `${activeSummary.students} students, ${activeSummary.teachers} teachers, ${formatMoney(activeSummary.collected)} collected` : 'Pick a branch to start working.'}
                </p>
              </div>
              <Button onClick={() => handleOpenModal()} className="bg-slate-950 text-white hover:bg-slate-800">
                <Plus className="mr-2 h-4 w-4" />
                Add Center
              </Button>
            </div>

            <div className="mt-4">
              <Label htmlFor="active-center-select" className="text-xs font-black uppercase text-slate-500">Switch branch</Label>
              <select
                id="active-center-select"
                className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold dark:border-white/10 dark:bg-slate-950"
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

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <InsightCard label="Top by revenue" value={topCenter?.center.center_name || 'No data'} detail={topCenter ? formatMoney(topCenter.collected) : '0'} />
              <InsightCard label="Branches ready" value={`${totalCapacity}`} detail={metricsLoading ? 'Refreshing metrics...' : 'Available centers'} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <MetricTile Icon={Building2} label="Centers" value={state.items.length.toLocaleString()} tone="from-blue-600 to-cyan-600" />
        <MetricTile Icon={GraduationCap} label="Students" value={totalStudents.toLocaleString()} tone="from-emerald-600 to-teal-600" />
        <MetricTile Icon={BookOpen} label="Groups" value={totalClasses.toLocaleString()} tone="from-violet-600 to-fuchsia-600" />
        <MetricTile Icon={Wallet} label="Revenue" value={formatMoney(totalCollected)} tone="from-amber-500 to-orange-600" />
      </div>

      {state.error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04] md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search centers by name, code, city, phone..."
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
        <span className="whitespace-nowrap rounded bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-white/70">
          Showing {paginatedCenters.start}-{paginatedCenters.end} of {filteredCenters.length}
        </span>
      </div>

      {state.loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-3">
          {paginatedCenters.items.map((center) => (
            <CenterRow
              key={getCenterId(center)}
              center={center}
              summary={centerSummaries.get(getCenterId(center))}
              active={Number(activeCenterId) === getCenterId(center)}
              onActivate={() => handleActivateCenter(getCenterId(center))}
              onEdit={() => handleOpenModal(center)}
              onDelete={() => handleDelete(getCenterId(center))}
            />
          ))}
          {paginatedCenters.items.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white py-10 text-center text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-white/[0.04]">
              No centers found.
            </div>
          )}
        </div>
      )}

      {!state.loading && filteredCenters.length > 0 && (
        <PaginationBar
          total={filteredCenters.length}
          currentPage={paginatedCenters.currentPage}
          totalPages={paginatedCenters.totalPages}
          start={paginatedCenters.start}
          end={paginatedCenters.end}
          pageSize={pageSize}
          pageSizeOptions={defaultPageSizeOptions}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setPage(1);
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

const toRows = (response: any) => (Array.isArray(response) ? response : response?.data || []);

export default CentersPage;
