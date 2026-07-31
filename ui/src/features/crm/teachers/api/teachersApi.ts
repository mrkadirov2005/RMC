import { dataAPI, teacherAPI } from '@/shared/api/api';

export const teachersApi = {
  importCsv: (csv: string) => dataAPI.importEntity('teachers', csv),
  deleteTeacher: (id: number) => teacherAPI.delete(id),
};
