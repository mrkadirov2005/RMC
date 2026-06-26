// Source file for the api.ts area in the owner feature.

import { classAPI, centerAPI, ownerAPI, paymentAPI, superuserAPI, studentAPI, teacherAPI } from '../../shared/api/api';

export const ownerManagerApi = {
  centers: centerAPI,
  centerSummaries: {
    getAllAcrossCenters: () => centerAPI.getSummaries({ skipCenterScope: true }),
  },
  owners: ownerAPI,
  superusers: superuserAPI,
  teachers: {
    ...teacherAPI,
    getAllAcrossCenters: (params?: Record<string, unknown>) => teacherAPI.getAll(params, { skipCenterScope: true }),
  },
  classes: {
    ...classAPI,
    getAllAcrossCenters: (params?: Record<string, unknown>) => classAPI.getAll(params, { skipCenterScope: true }),
  },
  payments: {
    ...paymentAPI,
    getAllAcrossCenters: (params?: Record<string, unknown>) => paymentAPI.getAll(params, { skipCenterScope: true }),
  },
  students: {
    ...studentAPI,
    getAllAcrossCenters: (params?: Record<string, unknown>) => studentAPI.getAll(params, { skipCenterScope: true }),
    getDeletedAcrossCenters: () => studentAPI.getDeleted({ skipCenterScope: true }),
  },
};
