// React hooks for the owner feature.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useAppDispatch, useAppSelector } from '../../crm/hooks';
import { getStoredActiveCenterId, setStoredActiveCenterId } from '../../../shared/auth/authStorage';
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
import type { OwnerManagerColumnDef, OwnerManagerFormData, OwnerManagerTabType } from '../types';
import { buildOwnerStudentStatistics, createInitialFormState, getOwnerManagerRowId, normalizePermissions } from '../utils';
import { ownerManagerApi } from '../api';

// Builds columns.
const buildColumns = (activeTab: OwnerManagerTabType, centerLookup: Map<number, string>): OwnerManagerColumnDef[] => {
// Handles name value.
  const nameValue = (item: any) => [item.first_name, item.last_name].filter(Boolean).join(' ') || '-';

  switch (activeTab) {
    case 'centers':
      return [
        { key: 'center_name', label: 'Center' },
        { key: 'center_code', label: 'Code' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'city', label: 'City' },
        { key: 'principal_name', label: 'Principal' },
      ];
    case 'owners':
      return [
        { key: 'username', label: 'Username' },
        { key: 'email', label: 'Email' },
        { key: 'name', label: 'Name', render: (item) => nameValue(item) },
        { key: 'status', label: 'Status' },
      ];
    case 'superusers':
      return [
        {
          key: 'branch_id',
          label: 'Branch',
          render: (item) => centerLookup.get(Number(item.branch_id ?? item.center_id)) || `Center ${item.branch_id || item.center_id || '-'}`,
        },
        { key: 'username', label: 'Username' },
        { key: 'email', label: 'Email' },
        { key: 'name', label: 'Name', render: (item) => nameValue(item) },
        { key: 'role', label: 'Role' },
        {
          key: 'permissions',
          label: 'Permissions',
          render: (item) =>
            Array.isArray(item.permissions) && item.permissions.length > 0
              ? `${item.permissions.length} allowed`
              : '-',
        },
        { key: 'status', label: 'Status' },
      ];
    case 'teachers':
      return [
        {
          key: 'center_id',
          label: 'Center',
          render: (item) => centerLookup.get(Number(item.center_id)) || `Center ${item.center_id || '-'}`,
        },
        { key: 'employee_id', label: 'Employee ID' },
        { key: 'name', label: 'Name', render: (item) => nameValue(item) },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'status', label: 'Status' },
      ];
    case 'students':
      return [
        {
          key: 'center_id',
          label: 'Center',
          render: (item) => centerLookup.get(Number(item.center_id)) || `Center ${item.center_id || '-'}`,
        },
        { key: 'enrollment_number', label: 'Enrollment' },
        { key: 'name', label: 'Name', render: (item) => nameValue(item) },
        { key: 'school_name', label: 'School', render: (item) => item.school_name || '-' },
        { key: 'school_class', label: 'School Class', render: (item) => item.school_class || '-' },
        { key: 'teacher_id', label: 'Teacher', render: (item) => (item.teacher_id ? `#${item.teacher_id}` : '-') },
        { key: 'class_id', label: 'Class', render: (item) => (item.class_id ? `#${item.class_id}` : '-') },
        { key: 'status', label: 'Status' },
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
  });

  const needsCenterScope = activeTab === 'superusers' || activeTab === 'teachers' || activeTab === 'students';

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
  const columns = useMemo(() => buildColumns(activeTab, centerLookup), [activeTab, centerLookup]);
  const activeCenterLabel =
    activeTab === 'statistics'
      ? 'All centers'
      : activeCenterId
        ? centerLookup.get(Number(activeCenterId)) || `Center ${activeCenterId}`
        : 'None selected';
  const isScopedAndMissingCenter = needsCenterScope && !activeCenterId;
  const scopedMessage = isScopedAndMissingCenter
    ? 'Select an active branch first to load and manage this section.'
    : activeTab === 'statistics'
      ? 'Showing combined data from every center.'
      : `Working inside ${activeCenterLabel}.`;
// Memoizes the selected permissions derived value.
  const selectedPermissions = useMemo(() => normalizePermissions(formData.permissions), [formData.permissions]);
  const dataCount = data.length;
  const centerCount = centerOptions.length;
  const statistics = useMemo(() => buildOwnerStudentStatistics(data, centerLookup), [centerLookup, data]);

// Memoizes the fetch data callback.
  const fetchData = useCallback(async () => {
    dispatch(setOwnerManagerLoading(true));
    dispatch(setOwnerManagerData([]));
    try {
      if (needsCenterScope && !activeCenterId) {
        return;
      }

      if (activeTab === 'statistics') {
        const [studentsRes, teachersRes, classesRes, paymentsRes] = await Promise.all([
          ownerManagerApi.students.getAllAcrossCenters(),
          ownerManagerApi.teachers.getAllAcrossCenters(),
          ownerManagerApi.classes.getAllAcrossCenters(),
          ownerManagerApi.payments.getAllAcrossCenters(),
        ]);

        const students = Array.isArray(studentsRes) ? studentsRes : studentsRes.data || [];
        const teachers = Array.isArray(teachersRes) ? teachersRes : teachersRes.data || [];
        const classes = Array.isArray(classesRes) ? classesRes : classesRes.data || [];
        const payments = Array.isArray(paymentsRes) ? paymentsRes : paymentsRes.data || [];

        setStatisticsCollections({ students, teachers, classes, payments });
        dispatch(setOwnerManagerData(students));
        return;
      }

      let response: any = { data: [] };
      switch (activeTab) {
        case 'centers':
          response = await ownerManagerApi.centers.getAll();
          break;
        case 'owners':
          response = await ownerManagerApi.owners.getAll();
          break;
        case 'superusers':
          response = await ownerManagerApi.superusers.getAll();
          break;
        case 'teachers':
          response = await ownerManagerApi.teachers.getAll();
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
      });
    } finally {
      dispatch(setOwnerManagerLoading(false));
    }
  }, [activeCenterId, activeTab, dispatch, needsCenterScope]);

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
    } catch (err) {
      const errorMessage = handleApiError(err);
      showToast.error(errorMessage);
    } finally {
      dispatch(setOwnerManagerLoading(false));
    }
  }, [activeTab, dispatch, editingId, fetchData, formData]);

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
    } catch (err) {
      const errorMessage = handleApiError(err);
      showToast.error(errorMessage);
    } finally {
      dispatch(setOwnerManagerLoading(false));
    }
  }, [activeTab, dispatch, fetchData]);

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
    scopedMessage,
    needsCenterScope,
    isScopedAndMissingCenter,
    statisticsCollections,
    statistics,
    selectedPermissions,
    formData,
    handleInputChange,
    handleOpenCreate,
    handleCloseForm,
    handleSubmit,
    handleDelete,
    handleEdit,
    handleResetPassword,
    handlePermissionToggle,
    handleTabChange,
  };
};
