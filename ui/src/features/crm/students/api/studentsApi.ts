import { classAPI, dataAPI, studentAPI } from '@/shared/api/api';

export const studentsApi = {
  importCsv: (csv: string) => dataAPI.importEntity('students', csv),
  pushToSheets: () => dataAPI.pushEntityToSheets('students'),
  pullFromSheets: () => dataAPI.pullEntityFromSheets('students'),
  setPassword: (id: number, username: string, password: string) => studentAPI.setPassword(id, { username, password }),
  deleteStudent: (id: number) => studentAPI.delete(id),
  transferStudent: (id: number, classId: number) => studentAPI.transfer(id, classId),
  updateGroupTeacher: (classId: number, teacherId: number) => classAPI.update(classId, { teacher_id: teacherId }),
  deleteGroup: (classId: number) => classAPI.delete(classId),
};
