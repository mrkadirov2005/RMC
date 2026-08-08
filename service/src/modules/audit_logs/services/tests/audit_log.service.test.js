jest.mock('../../repositories/audit_log.repository', () => ({ findFiltered: jest.fn() }));
const repository = require('../../repositories/audit_log.repository');
const service = require('../audit_log.service');

describe('audit log service', () => {
  test('normalizes filters, pagination, and center scope', () => {
    service.listLogs({ entity_type: 'student', entity_id: '7', user_type: 'teacher', user_id: '4', limit: '20', offset: '40' }, 2);
    expect(repository.findFiltered).toHaveBeenCalledWith({ entityType: 'student', entityId: 7, userType: 'teacher', userId: 4, centerId: 2 }, 20, 40);
  });
});
