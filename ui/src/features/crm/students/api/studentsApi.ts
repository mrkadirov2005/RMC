import { classAPI, dataAPI, studentAPI } from '@/shared/api/api';

export const studentsApi = {
  importCsv: (csv: string) => dataAPI.importEntity('students', csv),
  pushToSheets: () => dataAPI.pushEntityToSheets('students'),
  pullFromSheets: () => dataAPI.pullEntityFromSheets('students'),
  setPassword: (id: number, username: string, password: string) => studentAPI.setPassword(id, { username, password }),
  deleteStudent: (id: number, reasonId: number) => studentAPI.delete(id, reasonId),
  transferStudent: (id: number, classId: number, reasonId: number) => studentAPI.transfer(id, classId, reasonId),
  getActionReasons: (type: 'transfer' | 'delete') => studentAPI.getActionReasons(type),
  createActionReason: (type: 'transfer' | 'delete', name: string) => studentAPI.createActionReason(type, name),
  updateGroupTeacher: (classId: number, teacherId: number) => classAPI.update(classId, { teacher_id: teacherId }),
  deleteGroup: (classId: number) => classAPI.delete(classId),
};
