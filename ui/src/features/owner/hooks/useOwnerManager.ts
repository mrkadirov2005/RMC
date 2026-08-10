// React hooks for the owner feature.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useAppDispatch, useAppSelector } from '../../crm/hooks';
import { getStoredActiveCenterId, getStoredAuth, setStoredActiveCenterId } from '../../../shared/auth/authStorage';
import { createStudentIdentity } from '../../../shared/studentIdentity';
import { generateTempPassword } from '../../../utils/password';
import { showToast, handleApiError } from '../../../utils/toast';
import {
  setOwnerManagerActiveCenterId,
  setOwnerManagerCenterOptions,
  setOwnerManagerData,
  setOwnerManagerEditingId,
  setOwnerManagerLoading,
  setOwnerManagerShowForm,
  setOwnerManagerTab,
} from '../../../slices/pagesUiSlice';
import { selectOwnerManagerUi } from '../selectors';
import { OWNER_MANAGER_TAB_META } from '../constants';
import type { OwnerManagerColumnDef, OwnerManagerFormData, OwnerManagerTabType, OwnerOverviewCollections } from '../types';
import { buildOwnerStudentStatistics, createInitialFormState, getOwnerManagerRowId, normalizePermissions, summarizeOwnerAttendance } from '../utils';
import { ownerManagerApi } from '../api';

// Builds columns.
const buildColumns = (activeTab: OwnerManagerTabType): OwnerManagerColumnDef[] => {
// Handles name value.
  const nameValue = (item: any) => [item.first_name, item.last_name].filter(Boolean).join(' ') || '-';

  switch (activeTab) {
    case 'centers':
      return [
        { key: 'center_name', label: 'Center' },
      ];
    case 'owners':
      return [
        { key: 'name', label: 'Name', render: (item) => nameValue(item) },
      ];
    case 'superusers':
      return [
        { key: 'name', label: 'Name', render: (item) => nameValue(item) },
      ];
    case 'teachers':
      return [
        { key: 'name', label: 'Name', render: (item) => nameValue(item) },
      ];
    case 'students':
      return [
        { key: 'name', label: 'Name', render: (item) => nameValue(item) },
      ];
    default:
      return [];
  }
};

// Provides owner manager.
export const useOwnerManager = () => {
  const dispatch = useAppDispatch();
  const ownerManagerUi = useAppSelector(selectOwnerManagerUi);
  const {
    activeTab,
    showForm,
    editingId,
    loading,
    data,
    centerOptions,
    activeCenterId,
  } = ownerManagerUi;
  const [formData, setFormData] = useState<OwnerManagerFormData>({});
  const [statisticsCollections, setStatisticsCollections] = useState({
    students: [] as any[],
    teachers: [] as any[],
    classes: [] as any[],
    payments: [] as any[],
    discounts: [] as any[],
    deletedStudents: [] as any[],
  });
  const [overviewCollections, setOverviewCollections] = useState<OwnerOverviewCollections>({
    centers: [],
    owners: [],
    superusers: [],
    students: [],
    teachers: [],
    classes: [],
    payments: [],
    discounts: [],
    deletedStudents: [],
  });
  const [overviewSummary, setOverviewSummary] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalPayments: 0,
    currentMonthPayments: 0,
    previousMonthPayments: 0,
    paidStudentsThisMonth: 0,
    todayPayments: 0,
    yesterdayPayments: 0,
    paidStudentsToday: 0,
    paidStudentsYesterday: 0,
    attendancePresent: 0,
    attendanceAbsent: 0,
    collected: 0,
  });
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [crossCounts, setCrossCounts] = useState({ students: 0, teachers: 0, classes: 0 });

  const needsCenterScope = activeTab === 'superusers' || activeTab === 'students';

// Memoizes the center lookup derived value.
  const centerLookup = useMemo(() => {
    const map = new Map<number, string>();
    centerOptions.forEach((center: any) => {
      const centerId = Number(center.center_id || center.id);
      if (!centerId) return;
      map.set(centerId, center.center_name || center.name || `Center ${centerId}`);
    });
    return map;
  }, [centerOptions]);

  const currentMeta = OWNER_MANAGER_TAB_META[activeTab];
// Memoizes the columns derived value.
  const columns = useMemo(() => buildColumns(activeTab), [activeTab]);
  const activeCenterLabel =
    activeTab === 'statistics' || activeTab === 'finance' || activeTab === 'teachers'
      ? 'All centers'
      : activeCenterId
        ? centerLookup.get(Number(activeCenterId)) || `Center ${activeCenterId}`
        : 'None selected';
  const overviewCenterLabel = activeCenterId
    ? centerLookup.get(Number(activeCenterId)) || `Center ${activeCenterId}`
    : 'the selected center';
  const isScopedAndMissingCenter = needsCenterScope && !activeCenterId;
  const scopedMessage = isScopedAndMissingCenter
    ? 'Select an active branch first to load and manage this section.'
    : activeTab === 'statistics' || activeTab === 'finance' || activeTab === 'teachers'
      ? 'Showing combined data from every center.'
      : `Working inside ${activeCenterLabel}.`;
// Memoizes the selected permissions derived value.
  const selectedPermissions = useMemo(() => normalizePermissions(formData.permissions), [formData.permissions]);
  const dataCount = data.length;
  const centerCount = centerOptions.length;
  const statistics = useMemo(() => buildOwnerStudentStatistics(data, centerLookup), [centerLookup, data]);
  const canHardDelete = useMemo(() => {
    const user = getStoredAuth().user;
    return (
      String(user?.username || '').toLowerCase() === 'muzaffar' &&
      String(user?.role || '').toLowerCase() === 'owner'
    );
  }, []);

// Memoizes the fetch data callback.
  const fetchData = useCallback(async () => {
    dispatch(setOwnerManagerLoading(true));
    dispatch(setOwnerManagerData([]));
    try {
      if (needsCenterScope && !activeCenterId) {
        return;
      }

      if (activeTab === 'centers') {
        const [centersRes, summariesRes] = await Promise.all([
          ownerManagerApi.centers.getAll(),
          ownerManagerApi.centerSummaries.getAllAcrossCenters(),
        ]);
        const centers = Array.isArray(centersRes) ? centersRes : centersRes.data || [];
        const summaries = toRows(summariesRes);
        setCrossCounts({
          students: summaries.reduce((sum: number, row: any) => sum + Number(row.students || 0), 0),
          teachers: summaries.reduce((sum: number, row: any) => sum + Number(row.teachers || 0), 0),
          classes: summaries.reduce((sum: number, row: any) => sum + Number(row.classes || 0), 0),
        });
        dispatch(setOwnerManagerData(centers));
        return;
      }

      if (activeTab === 'statistics' || activeTab === 'finance') {
        const [studentsRes, teachersRes, classesRes, paymentsRes, deletedStudentsRes] = await Promise.all([
          ownerManagerApi.students.getAllAcrossCenters(),
          ownerManagerApi.teachers.getAllAcrossCenters(),
          ownerManagerApi.classes.getAllAcrossCenters(),
          ownerManagerApi.payments.getAllAcrossCenters(),
          canHardDelete ? ownerManagerApi.students.getDeletedAcrossCenters() : Promise.resolve({ data: [] }),
        ]);

        const students = Array.isArray(studentsRes) ? studentsRes : studentsRes.data || [];
        const teachers = Array.isArray(teachersRes) ? teachersRes : teachersRes.data || [];
        const classes = Array.isArray(classesRes) ? classesRes : classesRes.data || [];
        const payments = Array.isArray(paymentsRes) ? paymentsRes : paymentsRes.data || [];
        const deletedStudents = Array.isArray(deletedStudentsRes) ? deletedStudentsRes : deletedStudentsRes.data || [];

        setStatisticsCollections({ students, teachers, classes, payments, discounts: [], deletedStudents });
        dispatch(setOwnerManagerData(activeTab === 'finance' ? teachers : students));
        return;
      }

      if (activeTab === 'teachers') {
        const [teachersRes, studentsRes, classesRes, paymentsRes, deletedStudentsRes] = await Promise.all([
          ownerManagerApi.teachers.getAllAcrossCenters(),
          ownerManagerApi.students.getAllAcrossCenters(),
          ownerManagerApi.classes.getAllAcrossCenters(),
          ownerManagerApi.payments.getAllAcrossCenters(),
          canHardDelete ? ownerManagerApi.students.getDeletedAcrossCenters() : Promise.resolve({ data: [] }),
        ]);
        const teachers = Array.isArray(teachersRes) ? teachersRes : teachersRes.data || [];
        const students = Array.isArray(studentsRes) ? studentsRes : studentsRes.data || [];
        const classes = Array.isArray(classesRes) ? classesRes : classesRes.data || [];
        const payments = Array.isArray(paymentsRes) ? paymentsRes : paymentsRes.data || [];
        const deletedStudents = Array.isArray(deletedStudentsRes) ? deletedStudentsRes : deletedStudentsRes.data || [];
        setStatisticsCollections({ students, teachers, classes, payments, discounts: [], deletedStudents });
        dispatch(setOwnerManagerData(teachers));
        return;
      }

      let response: any = { data: [] };
      switch (activeTab) {
        case 'owners':
          response = await ownerManagerApi.owners.getAll();
          break;
        case 'superusers':
          response = await ownerManagerApi.superusers.getAll();
          break;
        case 'students':
          response = await ownerManagerApi.students.getAll();
          break;
        default:
          response = { data: [] };
      }

      const items = Array.isArray(response) ? response : response.data || [];
      dispatch(setOwnerManagerData(items));
    } catch (err) {
      const errorMessage = handleApiError(err);
      showToast.error(errorMessage);
      dispatch(setOwnerManagerData([]));
      setStatisticsCollections({
        students: [],
        teachers: [],
        classes: [],
        payments: [],
        discounts: [],
        deletedStudents: [],
      });
    } finally {
      dispatch(setOwnerManagerLoading(false));
    }
  }, [activeCenterId, activeTab, canHardDelete, dispatch, needsCenterScope]);

// Memoizes the overview data callback.
  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const [
        centersRes,
        ownersRes,
        superusersRes,
        summariesRes,
        deletedStudentsRes,
        attendanceRes,
      ] = await Promise.all([
        ownerManagerApi.centers.getAll().catch(() => ({ data: [] })),
        ownerManagerApi.owners.getAll().catch(() => ({ data: [] })),
        ownerManagerApi.superusers.getAll().catch(() => ({ data: [] })),
        ownerManagerApi.centerSummaries.getAllAcrossCenters().catch(() => ({ data: [] })),
        canHardDelete ? ownerManagerApi.students.getDeletedAcrossCenters().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        activeCenterId ? ownerManagerApi.attendance.getAllForCenter(Number(activeCenterId)).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);
      const summaries = toRows(summariesRes);
      const selectedSummary = summaries.find(
        (row: any) => Number(row.center_id || row.centerId) === Number(activeCenterId),
      );
      const attendanceRows = toRows(attendanceRes);
      const attendanceFallback = summarizeOwnerAttendance(attendanceRows);
      setOverviewSummary({
        totalStudents: Number(selectedSummary?.students || 0),
        totalTeachers: Number(selectedSummary?.teachers || 0),
        totalClasses: Number(selectedSummary?.classes || 0),
        totalPayments: Number(selectedSummary?.payments || 0),
        currentMonthPayments: Number(selectedSummary?.current_month_payments || 0),
        previousMonthPayments: Number(selectedSummary?.previous_month_payments || 0),
        paidStudentsThisMonth: Number(selectedSummary?.paid_students_this_month || 0),
        todayPayments: Number(selectedSummary?.today_payments || 0),
        yesterdayPayments: Number(selectedSummary?.yesterday_payments || 0),
        paidStudentsToday: Number(selectedSummary?.paid_students_today || 0),
        paidStudentsYesterday: Number(selectedSummary?.paid_students_yesterday || 0),
        attendancePresent: selectedSummary?.attendance_present == null
          ? attendanceFallback.present
          : Number(selectedSummary.attendance_present || 0),
        attendanceAbsent: selectedSummary?.attendance_absent == null
          ? attendanceFallback.absent
          : Number(selectedSummary.attendance_absent || 0),
        collected: Number(selectedSummary?.collected || 0),
      });

      setOverviewCollections({
        centers: toRows(centersRes).filter(
          (center: any) => Number(center.center_id || center.id) === Number(activeCenterId),
        ),
        owners: toRows(ownersRes),
        superusers: toRows(superusersRes).filter(
          (admin: any) => Number(admin.center_id || admin.centerId) === Number(activeCenterId),
        ),
        students: [],
        teachers: [],
        classes: [],
        payments: [],
        discounts: [],
        deletedStudents: toRows(deletedStudentsRes),
        attendance: attendanceRows,
      });
    } finally {
      setOverviewLoading(false);
    }
  }, [activeCenterId, canHardDelete]);

// Memoizes the load centers callback.
  const loadCenters = useCallback(async () => {
    try {
      const response = await ownerManagerApi.centers.getAll();
      const centers = Array.isArray(response) ? response : response.data || [];
      dispatch(setOwnerManagerCenterOptions(centers));

      const hasValidActiveCenter = activeCenterId
        ? centers.some((center: any) => Number(center.center_id || center.id) === Number(activeCenterId))
        : false;

      if (!hasValidActiveCenter && centers.length > 0) {
        const firstId = centers[0].center_id || centers[0].id;
        if (firstId) {
          dispatch(setOwnerManagerActiveCenterId(Number(firstId)));
        }
      }
    } catch {
      dispatch(setOwnerManagerCenterOptions([]));
    }
  }, [activeCenterId, dispatch]);

// Runs side effects for this component.
  useEffect(() => {
    if (activeCenterId == null) {
      dispatch(setOwnerManagerActiveCenterId(getStoredActiveCenterId()));
    }
  }, [activeCenterId, dispatch]);

// Runs side effects for this component.
  useEffect(() => {
// Handles sync active center.
    const syncActiveCenter = () => {
      dispatch(setOwnerManagerActiveCenterId(getStoredActiveCenterId()));
    };

    syncActiveCenter();
    window.addEventListener('active-center-changed', syncActiveCenter);
    return () => window.removeEventListener('active-center-changed', syncActiveCenter);
  }, [dispatch]);

// Runs side effects for this component.
  useEffect(() => {
    loadCenters();
  }, [loadCenters]);

// Runs side effects for overview cards.
  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

// Runs side effects for this component.
  useEffect(() => {
    fetchData();
    setFormData({});
    dispatch(setOwnerManagerEditingId(null));
    dispatch(setOwnerManagerShowForm(false));
  }, [activeTab, dispatch, fetchData]);

// Runs side effects for this component.
  useEffect(() => {
    if (activeCenterId != null) {
      setStoredActiveCenterId(activeCenterId);
    }
    if (needsCenterScope) {
      fetchData();
    }
  }, [activeCenterId, fetchData, needsCenterScope]);

// Memoizes the handle input change callback.
  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

// Memoizes the handle open create callback.
  const handleOpenCreate = useCallback(() => {
    setFormData(createInitialFormState(activeTab, activeCenterId));
    dispatch(setOwnerManagerEditingId(null));
    dispatch(setOwnerManagerShowForm(true));
  }, [activeCenterId, activeTab, dispatch]);

// Memoizes the handle close form callback.
  const handleCloseForm = useCallback(() => {
    dispatch(setOwnerManagerShowForm(false));
  }, [dispatch]);

// Memoizes the handle tab change callback.
  const handleTabChange = useCallback(
    (value: OwnerManagerTabType) => {
      dispatch(setOwnerManagerTab(value));
    },
    [dispatch]
  );

// Memoizes the handle submit callback.
  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    dispatch(setOwnerManagerLoading(true));

    try {
      const payload =
        activeTab === 'superusers'
          ? {
              ...formData,
              role: String(formData.role || 'admin').toLowerCase(),
              permissions: normalizePermissions(formData.permissions),
            }
          : activeTab === 'students' && !editingId
            ? {
                ...formData,
                ...createStudentIdentity(),
              }
          : formData;

      if (editingId) {
        switch (activeTab) {
          case 'centers':
            await ownerManagerApi.centers.update(editingId, payload);
            break;
          case 'owners':
            await ownerManagerApi.owners.update(editingId, payload);
            break;
          case 'superusers':
            await ownerManagerApi.superusers.update(editingId, payload);
            break;
          case 'teachers':
            await ownerManagerApi.teachers.update(editingId, payload);
            break;
          case 'students':
            await ownerManagerApi.students.update(editingId, payload);
            break;
        }
      } else {
        switch (activeTab) {
          case 'centers':
            await ownerManagerApi.centers.create(payload);
            break;
          case 'owners':
            await ownerManagerApi.owners.create(payload);
            break;
          case 'superusers':
            await ownerManagerApi.superusers.create(payload);
            break;
          case 'teachers':
            await ownerManagerApi.teachers.create(payload);
            break;
          case 'students':
            await ownerManagerApi.students.create(payload);
            break;
        }
      }

      setFormData({});
      dispatch(setOwnerManagerEditingId(null));
      dispatch(setOwnerManagerShowForm(false));

      await fetchData();
      await fetchOverview();
    } catch (err) {
      const errorMessage = handleApiError(err);
      showToast.error(errorMessage);
    } finally {
      dispatch(setOwnerManagerLoading(false));
    }
  }, [activeTab, dispatch, editingId, fetchData, fetchOverview, formData]);

// Memoizes the handle delete callback.
  const handleDelete = useCallback(async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;

    dispatch(setOwnerManagerLoading(true));
    try {
      switch (activeTab) {
        case 'centers':
          await ownerManagerApi.centers.delete(id);
          break;
        case 'owners':
          await ownerManagerApi.owners.delete(id);
          break;
        case 'superusers':
          await ownerManagerApi.superusers.delete(id);
          break;
        case 'teachers':
          await ownerManagerApi.teachers.delete(id);
          break;
        case 'students':
          await ownerManagerApi.students.delete(id);
          break;
      }
      showToast.success('Record deleted successfully.');
      await fetchData();
      await fetchOverview();
    } catch (err) {
      const errorMessage = handleApiError(err);
      showToast.error(errorMessage);
    } finally {
      dispatch(setOwnerManagerLoading(false));
    }
  }, [activeTab, dispatch, fetchData, fetchOverview]);

// Memoizes the handle hard delete callback.
  const handleHardDelete = useCallback(async (id: number) => {
    if (!canHardDelete) {
      showToast.error('Permanent delete is restricted to owner muzaffar.');
      return;
    }
    if (!window.confirm('Permanently delete this record? This cannot be undone.')) return;

    dispatch(setOwnerManagerLoading(true));
    try {
      switch (activeTab) {
        case 'teachers':
          await ownerManagerApi.teachers.delete(id);
          await ownerManagerApi.teachers.purge(id);
          break;
        case 'students':
          await ownerManagerApi.students.delete(id);
          await ownerManagerApi.students.purge(id);
          break;
        default:
          showToast.error('Permanent delete is not available in this section.');
          return;
      }
      showToast.success('Record permanently deleted.');
      await fetchData();
      await fetchOverview();
    } catch (err) {
      const errorMessage = handleApiError(err);
      showToast.error(errorMessage);
    } finally {
      dispatch(setOwnerManagerLoading(false));
    }
  }, [activeTab, canHardDelete, dispatch, fetchData, fetchOverview]);

// Memoizes the handle reset password callback.
  const handleResetPassword = useCallback(async (item: any) => {
    if (activeTab !== 'teachers' && activeTab !== 'students') return;

    const id = getOwnerManagerRowId(item);
    if (!id) {
      showToast.error('Missing record id.');
      return;
    }

    const suggestedUsername = item.username || '';
// Provides rname.
    const username = (suggestedUsername || window.prompt('Enter username for password reset', '') || '').trim();
    if (!username) {
      showToast.error('Username is required to reset the password.');
      return;
    }

    const tempPassword = generateTempPassword();
    dispatch(setOwnerManagerLoading(true));
    try {
      if (activeTab === 'teachers') {
        await ownerManagerApi.teachers.setPassword(Number(id), { username, password: tempPassword });
      } else {
        await ownerManagerApi.students.setPassword(Number(id), { username, password: tempPassword });
      }
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(tempPassword).catch(() => undefined);
      }
      window.alert(`Temporary password for ${username}:\n${tempPassword}`);
    } catch (err) {
      const errorMessage = handleApiError(err);
      showToast.error(errorMessage);
    } finally {
      dispatch(setOwnerManagerLoading(false));
    }
  }, [activeTab, dispatch]);

// Memoizes the handle edit callback.
  const handleEdit = useCallback((item: any) => {
    setFormData(
      activeTab === 'superusers'
        ? {
            ...item,
            branch_id: item.branch_id ?? item.center_id,
            role: String(item.role || 'admin').toLowerCase(),
            permissions: normalizePermissions(item.permissions),
          }
        : item
    );
    dispatch(setOwnerManagerEditingId(item.id || item.owner_id || item.superuser_id || item.center_id));
    dispatch(setOwnerManagerShowForm(true));
  }, [activeTab, dispatch]);

// Memoizes the handle permission toggle callback.
  const handlePermissionToggle = useCallback((permission: string, enabled: boolean) => {
    setFormData((prev) => {
      const current = normalizePermissions(prev.permissions);
      const nextPermissions = enabled
        ? Array.from(new Set([...current, permission]))
        : current.filter((item) => item !== permission);

      return {
        ...prev,
        permissions: nextPermissions,
      };
    });
  }, []);

  return {
    activeTab,
    showForm,
    editingId,
    loading,
    data,
    centerOptions,
    activeCenterId,
    currentMeta,
    columns,
    dataCount,
    centerCount,
    activeCenterLabel,
    overviewCenterLabel,
    scopedMessage,
    needsCenterScope,
    isScopedAndMissingCenter,
    statisticsCollections,
    overviewCollections,
    overviewSummary,
    overviewLoading,
    statistics,
    crossCounts,
    canHardDelete,
    selectedPermissions,
    formData,
    handleInputChange,
    handleOpenCreate,
    handleCloseForm,
    handleSubmit,
    handleDelete,
    handleHardDelete,
    handleEdit,
    handleResetPassword,
    handlePermissionToggle,
    handleTabChange,
  };
};

const toRows = (response: any) => (Array.isArray(response) ? response : response?.data || []);
