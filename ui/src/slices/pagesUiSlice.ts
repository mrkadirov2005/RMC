// Source file for pagesUiSlice.

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type PaymentsTabType = 'students' | 'classes' | 'teachers' | 'statistics';
export type GradesTabType = 'students' | 'classes' | 'teachers';
export type FolderType = 'teacher' | 'class' | 'student';
export type TestsTabType = 'all' | 'active' | 'inactive';
export type StudentTestsTabType = 'available' | 'in_progress' | 'completed';

export interface FolderSelection {
  type: FolderType;
  id: number;
  name: string;
}

interface AppUiState {
  centerReady: boolean;
}

interface PaymentsPageUiState {
  activeTab: PaymentsTabType;
  selectedFolder: FolderSelection | null;
  isModalOpen: boolean;
  editingId: number | null;
  searchTerm: string;
  filterStatus: string;
  filterMethod: string;
  showFilters: boolean;
}

interface GradesPageUiState {
  activeTab: GradesTabType;
  selectedFolder: FolderSelection | null;
  isModalOpen: boolean;
  editingId: number | null;
  searchTerm: string;
  filterTerm: string;
  filterGrade: string;
  showFilters: boolean;
}

interface TestsPageUiState {
  pageError: string | null;
  tabValue: TestsTabType;
  searchTerm: string;
  filterType: string;
  deleteDialogOpen: boolean;
  selectedTestId: number | null;
}

interface StudentTestsPageUiState {
  error: string | null;
  tabValue: StudentTestsTabType;
}

interface RoomsPageUiState {
  isModalOpen: boolean;
  editingId: number | null;
  submitting: boolean;
}

interface TeacherPortalUiState {
  tabValue: string;
}

type OwnerManagerTabType = 'centers' | 'owners' | 'superusers' | 'teachers' | 'students' | 'statistics';

interface OwnerManagerUiState {
  activeTab: OwnerManagerTabType;
  showForm: boolean;
  editingId: number | null;
  loading: boolean;
  data: any[];
  centerOptions: any[];
  activeCenterId: number | null;
}

interface PagesUiState {
  app: AppUiState;
  payments: PaymentsPageUiState;
  grades: GradesPageUiState;
  tests: TestsPageUiState;
  studentTests: StudentTestsPageUiState;
  rooms: RoomsPageUiState;
  teacherPortal: TeacherPortalUiState;
  ownerManager: OwnerManagerUiState;
}

const initialPaymentsState: PaymentsPageUiState = {
  activeTab: 'students',
  selectedFolder: null,
  isModalOpen: false,
  editingId: null,
  searchTerm: '',
  filterStatus: '',
  filterMethod: '',
  showFilters: false,
};

const initialGradesState: GradesPageUiState = {
  activeTab: 'students',
  selectedFolder: null,
  isModalOpen: false,
  editingId: null,
  searchTerm: '',
  filterTerm: '',
  filterGrade: '',
  showFilters: false,
};

const initialState: PagesUiState = {
  app: {
    centerReady: true,
  },
  payments: initialPaymentsState,
  grades: initialGradesState,
  tests: {
    pageError: null,
    tabValue: 'all',
    searchTerm: '',
    filterType: 'all',
    deleteDialogOpen: false,
    selectedTestId: null,
  },
  studentTests: {
    error: null,
    tabValue: 'available',
  },
  rooms: {
    isModalOpen: false,
    editingId: null,
    submitting: false,
  },
  teacherPortal: {
    tabValue: 'students',
  },
  ownerManager: {
    activeTab: 'centers',
    showForm: false,
    editingId: null,
    loading: false,
    data: [],
    centerOptions: [],
    activeCenterId: null,
  },
};

const pagesUiSlice = createSlice({
  name: 'pagesUi',
  initialState,
  reducers: {
    setAppCenterReady(state, action: PayloadAction<boolean>) {
      state.app.centerReady = action.payload;
    },

    setPaymentsActiveTab(state, action: PayloadAction<PaymentsTabType>) {
      state.payments.activeTab = action.payload;
    },
    setPaymentsSelectedFolder(state, action: PayloadAction<FolderSelection | null>) {
      state.payments.selectedFolder = action.payload;
    },
    setPaymentsModalOpen(state, action: PayloadAction<boolean>) {
      state.payments.isModalOpen = action.payload;
    },
    setPaymentsEditingId(state, action: PayloadAction<number | null>) {
      state.payments.editingId = action.payload;
    },
    setPaymentsSearchTerm(state, action: PayloadAction<string>) {
      state.payments.searchTerm = action.payload;
    },
    setPaymentsFilterStatus(state, action: PayloadAction<string>) {
      state.payments.filterStatus = action.payload;
    },
    setPaymentsFilterMethod(state, action: PayloadAction<string>) {
      state.payments.filterMethod = action.payload;
    },
    setPaymentsShowFilters(state, action: PayloadAction<boolean>) {
      state.payments.showFilters = action.payload;
    },
    clearPaymentsFilters(state) {
      state.payments.searchTerm = '';
      state.payments.filterStatus = '';
      state.payments.filterMethod = '';
    },
    resetPaymentsPageUi(state) {
      state.payments = initialPaymentsState;
    },

    setGradesActiveTab(state, action: PayloadAction<GradesTabType>) {
      state.grades.activeTab = action.payload;
    },
    setGradesSelectedFolder(state, action: PayloadAction<FolderSelection | null>) {
      state.grades.selectedFolder = action.payload;
    },
    setGradesModalOpen(state, action: PayloadAction<boolean>) {
      state.grades.isModalOpen = action.payload;
    },
    setGradesEditingId(state, action: PayloadAction<number | null>) {
      state.grades.editingId = action.payload;
    },
    setGradesSearchTerm(state, action: PayloadAction<string>) {
      state.grades.searchTerm = action.payload;
    },
    setGradesFilterTerm(state, action: PayloadAction<string>) {
      state.grades.filterTerm = action.payload;
    },
    setGradesFilterGrade(state, action: PayloadAction<string>) {
      state.grades.filterGrade = action.payload;
    },
    setGradesShowFilters(state, action: PayloadAction<boolean>) {
      state.grades.showFilters = action.payload;
    },
    clearGradesFilters(state) {
      state.grades.searchTerm = '';
      state.grades.filterTerm = '';
      state.grades.filterGrade = '';
    },
    resetGradesPageUi(state) {
      state.grades = initialGradesState;
    },

    setTestsPageError(state, action: PayloadAction<string | null>) {
      state.tests.pageError = action.payload;
    },
    clearTestsPageError(state) {
      state.tests.pageError = null;
    },
    setTestsPageTabValue(state, action: PayloadAction<TestsTabType>) {
      state.tests.tabValue = action.payload;
    },
    setTestsPageSearchTerm(state, action: PayloadAction<string>) {
      state.tests.searchTerm = action.payload;
    },
    setTestsPageFilterType(state, action: PayloadAction<string>) {
      state.tests.filterType = action.payload;
    },
    setTestsPageDeleteDialogOpen(state, action: PayloadAction<boolean>) {
      state.tests.deleteDialogOpen = action.payload;
    },
    setTestsPageSelectedTestId(state, action: PayloadAction<number | null>) {
      state.tests.selectedTestId = action.payload;
    },

    setStudentTestsPageError(state, action: PayloadAction<string | null>) {
      state.studentTests.error = action.payload;
    },
    clearStudentTestsPageError(state) {
      state.studentTests.error = null;
    },
    setStudentTestsPageTabValue(state, action: PayloadAction<StudentTestsTabType>) {
      state.studentTests.tabValue = action.payload;
    },

    setRoomsPageModalOpen(state, action: PayloadAction<boolean>) {
      state.rooms.isModalOpen = action.payload;
    },
    setRoomsPageEditingId(state, action: PayloadAction<number | null>) {
      state.rooms.editingId = action.payload;
    },
    setRoomsPageSubmitting(state, action: PayloadAction<boolean>) {
      state.rooms.submitting = action.payload;
    },

    setTeacherPortalTabValue(state, action: PayloadAction<string>) {
      state.teacherPortal.tabValue = action.payload;
    },

    setOwnerManagerTab(state, action: PayloadAction<OwnerManagerTabType>) {
      state.ownerManager.activeTab = action.payload;
    },
    setOwnerManagerShowForm(state, action: PayloadAction<boolean>) {
      state.ownerManager.showForm = action.payload;
    },
    setOwnerManagerEditingId(state, action: PayloadAction<number | null>) {
      state.ownerManager.editingId = action.payload;
    },
    setOwnerManagerLoading(state, action: PayloadAction<boolean>) {
      state.ownerManager.loading = action.payload;
    },
    setOwnerManagerData(state, action: PayloadAction<any[]>) {
      state.ownerManager.data = action.payload;
    },
    setOwnerManagerCenterOptions(state, action: PayloadAction<any[]>) {
      state.ownerManager.centerOptions = action.payload;
    },
    setOwnerManagerActiveCenterId(state, action: PayloadAction<number | null>) {
      state.ownerManager.activeCenterId = action.payload;
    },
  },
});

export const {
  setAppCenterReady,

  setPaymentsActiveTab,
  setPaymentsSelectedFolder,
  setPaymentsModalOpen,
  setPaymentsEditingId,
  setPaymentsSearchTerm,
  setPaymentsFilterStatus,
  setPaymentsFilterMethod,
  setPaymentsShowFilters,
  clearPaymentsFilters,
  resetPaymentsPageUi,

  setGradesActiveTab,
  setGradesSelectedFolder,
  setGradesModalOpen,
  setGradesEditingId,
  setGradesSearchTerm,
  setGradesFilterTerm,
  setGradesFilterGrade,
  setGradesShowFilters,
  clearGradesFilters,
  resetGradesPageUi,

  setTestsPageError,
  clearTestsPageError,
  setTestsPageTabValue,
  setTestsPageSearchTerm,
  setTestsPageFilterType,
  setTestsPageDeleteDialogOpen,
  setTestsPageSelectedTestId,

  setStudentTestsPageError,
  clearStudentTestsPageError,
  setStudentTestsPageTabValue,

  setRoomsPageModalOpen,
  setRoomsPageEditingId,
  setRoomsPageSubmitting,

  setTeacherPortalTabValue,

  setOwnerManagerTab,
  setOwnerManagerShowForm,
  setOwnerManagerEditingId,
  setOwnerManagerLoading,
  setOwnerManagerData,
  setOwnerManagerCenterOptions,
  setOwnerManagerActiveCenterId,
} = pagesUiSlice.actions;

export default pagesUiSlice.reducer;
