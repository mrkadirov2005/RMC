// Barrel exports for this module.

import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../slices/authSlice';
import paymentAccessReducer from '../slices/paymentAccessSlice';
import serviceStatusReducer from '../slices/serviceStatusSlice';
import teachersReducer from '../slices/teachersSlice';
import studentsReducer from '../slices/studentsSlice';
import classesReducer from '../slices/classesSlice';
import subjectsReducer from '../slices/subjectsSlice';
import paymentsReducer from '../slices/paymentsSlice';
import gradesReducer from '../slices/gradesSlice';
import attendanceReducer from '../slices/attendanceSlice';
import assignmentsReducer from '../slices/assignmentsSlice';
import debtsReducer from '../slices/debtsSlice';
import centersReducer from '../slices/centersSlice';
import testsReducer from '../slices/testsSlice';
import roomsReducer from '../slices/roomsSlice';
import studentDashboardReducer from '../slices/studentDashboardSlice';
import pagesUiReducer from '../slices/pagesUiSlice';

export const store = configureStore({
  reducer: {
    // ── Auth & system ─────────────────────────────────────────────────────────
    auth: authReducer,
    paymentAccess: paymentAccessReducer,
    serviceStatus: serviceStatusReducer,

    // ── Domain data ───────────────────────────────────────────────────────────
    teachers: teachersReducer,
    students: studentsReducer,
    classes: classesReducer,
    subjects: subjectsReducer,
    payments: paymentsReducer,
    grades: gradesReducer,
    attendance: attendanceReducer,
    assignments: assignmentsReducer,
    debts: debtsReducer,
    centers: centersReducer,
    tests: testsReducer,
    rooms: roomsReducer,
    studentDashboard: studentDashboardReducer,
    pagesUi: pagesUiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
