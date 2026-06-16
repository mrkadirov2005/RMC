const repository = require('../repositories/telegram_registration.repository');

const listRegistrations = (centerId?: number, status?: string) => repository.list(centerId, status);

const convertRegistration = (id: number, centerId?: number, assignData?: { class_id?: number; teacher_id?: number }) => repository.convertToStudent(id, centerId, assignData);

const rejectRegistration = (id: number, centerId?: number) => repository.remove(id, centerId);

module.exports = { listRegistrations, convertRegistration, rejectRegistration };

export {};
