import { configureStore } from '@reduxjs/toolkit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { api, toast, handleApiError } = vi.hoisted(() => {
  const endpoint = () => ({ getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() });
  return {
    api: {
      assignmentAPI: endpoint(),
      attendanceAPI: endpoint(),
      centerAPI: endpoint(),
      classAPI: endpoint(),
      debtAPI: endpoint(),
      gradeAPI: endpoint(),
      paymentAPI: endpoint(),
      subjectAPI: endpoint(),
    },
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
    handleApiError: vi.fn((error: any) => error?.response?.data?.message ?? ''),
  };
});

vi.mock('../../shared/api/api', () => api);
vi.mock('../../utils/toast', () => ({ showToast: toast, handleApiError }));

import assignmentsReducer, * as assignments from '../assignmentsSlice';
import attendanceReducer, * as attendance from '../attendanceSlice';
import centersReducer, * as centers from '../centersSlice';
import classesReducer, * as classes from '../classesSlice';
import debtsReducer, * as debts from '../debtsSlice';
import gradesReducer, * as grades from '../gradesSlice';
import paymentsReducer, * as payments from '../paymentsSlice';
import subjectsReducer, * as subjects from '../subjectsSlice';

type SliceCase = {
  name: string;
  key: string;
  reducer: any;
  module: any;
  api: { getAll: any; create: any; update: any; delete: any };
  row: Record<string, unknown>;
  entity: string;
  deleteArg?: unknown;
};

const cases: SliceCase[] = [
  { name: 'assignments', key: 'assignments', reducer: assignmentsReducer, module: assignments, api: api.assignmentAPI, row: { assignment_id: 1, assignment_title: 'Homework' }, entity: 'Assignment' },
  { name: 'attendance', key: 'attendance', reducer: attendanceReducer, module: attendance, api: api.attendanceAPI, row: { attendance_id: 1, status: 'Present' }, entity: 'Attendance' },
  { name: 'centers', key: 'centers', reducer: centersReducer, module: centers, api: api.centerAPI, row: { center_id: 1, center_name: 'North' }, entity: 'Center' },
  { name: 'classes', key: 'classes', reducer: classesReducer, module: classes, api: api.classAPI, row: { class_id: 1, class_name: 'A1' }, entity: 'Class', deleteArg: { id: 1 } },
  { name: 'debts', key: 'debts', reducer: debtsReducer, module: debts, api: api.debtAPI, row: { debt_id: 1, debt_amount: 100 }, entity: 'Debt' },
  { name: 'grades', key: 'grades', reducer: gradesReducer, module: grades, api: api.gradeAPI, row: { grade_id: 1, marks_obtained: 80 }, entity: 'Grade' },
  { name: 'payments', key: 'payments', reducer: paymentsReducer, module: paymentsReducerModule(), api: api.paymentAPI, row: { payment_id: 1, amount: 100 }, entity: 'Payment' },
  { name: 'subjects', key: 'subjects', reducer: subjectsReducer, module: subjects, api: api.subjectAPI, row: { subject_id: 1, subject_name: 'Maths' }, entity: 'Subject' },
];

function paymentsReducerModule() {
  return payments;
}

const capitalized = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

const thunkNames = (name: string, singular: string) => {
  const suffix = capitalized(name);
  return {
    fetch: `fetch${suffix}`,
    fetchForce: `fetch${suffix}Force`,
    create: `create${singular}`,
    update: `update${singular}`,
    remove: `delete${singular}`,
    clearError: `clear${suffix}Error`,
    invalidate: `invalidate${suffix}`,
    select: `select${suffix}`,
    selectLoading: `select${suffix}Loading`,
    selectError: `select${suffix}Error`,
  };
};

const makeStore = (testCase: SliceCase) =>
  configureStore({ reducer: { [testCase.key]: testCase.reducer } });

const failure = (message: string) => Object.assign(new Error('request failed'), {
  response: { data: { message } },
});

describe.each(cases)('$name slice', (testCase) => {
  const names = thunkNames(testCase.name, testCase.entity);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('starts empty and not loading', () => {
    const store = makeStore(testCase);

    const state = store.getState()[testCase.key];
    expect(state.items).toEqual([]);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.lastFetched).toBeNull();
  });

  it('loads the collection and records when it was fetched', async () => {
    const store = makeStore(testCase);
    testCase.api.getAll.mockResolvedValue({ data: [testCase.row] });

    await store.dispatch(testCase.module[names.fetch]());

    const state = store.getState()[testCase.key];
    expect(state.items).toHaveLength(1);
    expect(state.loading).toBe(false);
    expect(state.lastFetched).toEqual(expect.any(Number));
  });

  it('accepts a bare array response as well as one wrapped in data', async () => {
    const store = makeStore(testCase);
    testCase.api.getAll.mockResolvedValue([testCase.row]);

    await store.dispatch(testCase.module[names.fetch]());

    expect(store.getState()[testCase.key].items).toHaveLength(1);
  });

  it('treats a response that is not a list as empty', async () => {
    const store = makeStore(testCase);
    testCase.api.getAll.mockResolvedValue({ data: { unexpected: true } });

    await store.dispatch(testCase.module[names.fetch]());

    expect(store.getState()[testCase.key].items).toEqual([]);
  });

  it('serves a second read from cache without calling the API again', async () => {
    const store = makeStore(testCase);
    testCase.api.getAll.mockResolvedValue({ data: [testCase.row] });

    await store.dispatch(testCase.module[names.fetch]());
    await store.dispatch(testCase.module[names.fetch]());

    expect(testCase.api.getAll).toHaveBeenCalledTimes(1);
    expect(store.getState()[testCase.key].items).toHaveLength(1);
  });

  it('re-reads once the cache has been invalidated', async () => {
    const store = makeStore(testCase);
    testCase.api.getAll.mockResolvedValue({ data: [testCase.row] });

    await store.dispatch(testCase.module[names.fetch]());
    store.dispatch(testCase.module[names.invalidate]());
    await store.dispatch(testCase.module[names.fetch]());

    expect(testCase.api.getAll).toHaveBeenCalledTimes(2);
  });

  it('ignores the cache on a forced read', async () => {
    const store = makeStore(testCase);
    testCase.api.getAll.mockResolvedValue({ data: [testCase.row] });

    await store.dispatch(testCase.module[names.fetch]());
    await store.dispatch(testCase.module[names.fetchForce]());

    expect(testCase.api.getAll).toHaveBeenCalledTimes(2);
  });

  it('records the server message when the read fails', async () => {
    const store = makeStore(testCase);
    testCase.api.getAll.mockRejectedValue(failure('Server said no'));

    await store.dispatch(testCase.module[names.fetch]());

    const state = store.getState()[testCase.key];
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Server said no');
  });

  it('falls back to a generic message when the failure carries none', async () => {
    const store = makeStore(testCase);
    testCase.api.getAll.mockRejectedValue(new Error('network'));

    await store.dispatch(testCase.module[names.fetch]());

    expect(store.getState()[testCase.key].error).toEqual(expect.any(String));
  });

  it('clears a recorded error on request', async () => {
    const store = makeStore(testCase);
    testCase.api.getAll.mockRejectedValue(failure('Server said no'));

    await store.dispatch(testCase.module[names.fetch]());
    store.dispatch(testCase.module[names.clearError]());

    expect(store.getState()[testCase.key].error).toBeNull();
  });

  it('re-reads the collection after a create', async () => {
    const store = makeStore(testCase);
    testCase.api.create.mockResolvedValue({});
    testCase.api.getAll.mockResolvedValue({ data: [testCase.row] });

    await store.dispatch(testCase.module[names.create](testCase.row));

    expect(testCase.api.create).toHaveBeenCalledWith(testCase.row);
    expect(testCase.api.getAll).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalled();
  });

  it('re-reads the collection after an update', async () => {
    const store = makeStore(testCase);
    testCase.api.update.mockResolvedValue({});
    testCase.api.getAll.mockResolvedValue({ data: [] });

    await store.dispatch(testCase.module[names.update]({ id: 1, data: testCase.row }));

    expect(testCase.api.update).toHaveBeenCalledWith(1, testCase.row);
    expect(testCase.api.getAll).toHaveBeenCalled();
  });

  it('re-reads the collection after a delete', async () => {
    const store = makeStore(testCase);
    testCase.api.delete.mockResolvedValue({});
    testCase.api.getAll.mockResolvedValue({ data: [] });

    await store.dispatch(testCase.module[names.remove]((testCase.deleteArg ?? 1) as never));

    expect(testCase.api.delete).toHaveBeenCalled();
    expect(testCase.api.getAll).toHaveBeenCalled();
  });

  it.each(['create', 'update', 'remove'] as const)('surfaces a %s failure as a toast and an error', async (action) => {
    const store = makeStore(testCase);
    const method = action === 'remove' ? 'delete' : action;
    testCase.api[method].mockRejectedValue(failure('Write refused'));

    const argument = action === 'update' ? { id: 1, data: testCase.row } : action === 'create' ? testCase.row : (testCase.deleteArg ?? 1);
    await store.dispatch(testCase.module[names[action]](argument as never));

    const state = store.getState()[testCase.key];
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Write refused');
    expect(toast.error).toHaveBeenCalledWith('Write refused');
  });

  it('exposes the collection, the loading flag and the error through its selectors', async () => {
    const store = makeStore(testCase);
    testCase.api.getAll.mockResolvedValue({ data: [testCase.row] });

    await store.dispatch(testCase.module[names.fetch]());
    const state = store.getState();

    expect(testCase.module[names.select](state)).toHaveLength(1);
    expect(testCase.module[names.selectLoading](state)).toBe(false);
    expect(testCase.module[names.selectError](state)).toBeNull();
  });
});
