jest.mock('../../repositories/telegram_registration.repository', () => ({ list: jest.fn(), convertToStudent: jest.fn(), remove: jest.fn() }));
const repository = require('../../repositories/telegram_registration.repository');
const service = require('../telegram_registration.service');
describe('telegram registration service', () => {
  test('scopes list, conversion, and rejection to center', () => {
    service.listRegistrations(2, 'pending'); service.convertRegistration(7, 2, { class_id: 3, teacher_id: 4 }); service.rejectRegistration(7, 2);
    expect(repository.list).toHaveBeenCalledWith(2, 'pending');
    expect(repository.convertToStudent).toHaveBeenCalledWith(7, 2, { class_id: 3, teacher_id: 4 });
    expect(repository.remove).toHaveBeenCalledWith(7, 2);
  });
});
