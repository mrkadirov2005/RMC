jest.mock('../../repositories/audit_log.repository', () => ({ findFiltered: jest.fn() }));
const repository = require('../../repositories/audit_log.repository');
const service = require('../audit_log.service');

describe('audit log service', () => {
  test('normalizes filters, pagination, and center scope', () => {
    service.listLogs({ entity_type: 'student', entity_id: '7', user_type: 'teacher', user_id: '4', limit: '20', offset: '40' }, 2);
    expect(repository.findFiltered).toHaveBeenCalledWith({ entityType: 'student', entityId: 7, userType: 'teacher', userId: 4, centerId: 2 }, 20, 40);
  });

  // RMC-047: an unbounded/excessive limit used to reach the database directly; it is now
  // capped at MAX_LIMIT (200) with DEFAULT_LIMIT (50) when omitted.
  test('defaults to a limit of 50 when no limit is requested', () => {
    service.listLogs({}, 2);
    const [, limit] = repository.findFiltered.mock.calls[0];
    expect(limit).toBe(50);
  });

  test('caps an excessively large requested limit at 200', () => {
    service.listLogs({ limit: '999999' }, 2);
    const [, limit] = repository.findFiltered.mock.calls[0];
    expect(limit).toBe(200);
  });

  test('caps a requested limit of exactly 200 unchanged', () => {
    service.listLogs({ limit: '200' }, 2);
    const [, limit] = repository.findFiltered.mock.calls[0];
    expect(limit).toBe(200);
  });

  test('floors a non-positive requested limit at 1 rather than passing 0/negative through', () => {
    service.listLogs({ limit: '-5' }, 2);
    const [, limit] = repository.findFiltered.mock.calls[0];
    expect(limit).toBe(1);
  });

  test('falls back to the default limit when the requested limit is not a finite number', () => {
    service.listLogs({ limit: 'not-a-number' }, 2);
    const [, limit] = repository.findFiltered.mock.calls[0];
    expect(limit).toBe(50);
  });
});
