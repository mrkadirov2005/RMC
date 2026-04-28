// Source file for the api.ts area in the owner feature.

import { classAPI, centerAPI, ownerAPI, paymentAPI, superuserAPI, studentAPI, teacherAPI } from '../../shared/api/api';

export const ownerManagerApi = {
  centers: centerAPI,
  owners: ownerAPI,
  superusers: superuserAPI,
  teachers: {
    ...teacherAPI,
    getAllAcrossCenters: () => teacherAPI.getAll(undefined, { skipCenterScope: true }),
  },
  classes: {
    ...classAPI,
    getAllAcrossCenters: () => classAPI.getAll(undefined, { skipCenterScope: true }),
  },
  payments: {
    ...paymentAPI,
    getAllAcrossCenters: () => paymentAPI.getAll(undefined, { skipCenterScope: true }),
  },
  students: {
    ...studentAPI,
    getAllAcrossCenters: () => studentAPI.getAll(undefined, { skipCenterScope: true }),
  },
};
