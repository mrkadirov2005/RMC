jest.mock('../../repositories/center.repository', () => ({
  findAll: jest.fn(), findById: jest.fn(), getSummaries: jest.fn(), insert: jest.fn(), update: jest.fn(), remove: jest.fn(),
}));

const repository = require('../../repositories/center.repository');
const service = require('../center.service');

describe('center service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('limits admin list, detail, summary, update, and delete to the authenticated center', () => {
    const admin = { userType: 'superuser', role: 'admin', center_id: 7 };
    service.listCenters(admin); service.getCenter(7, admin); service.getCenterSummaries(admin);
    service.updateCenter(7, { center_name: 'A' }, admin); service.deleteCenter(7, admin);
    expect(repository.findAll).toHaveBeenCalledWith(7);
    expect(repository.findById).toHaveBeenCalledWith(7, 7);
    expect(repository.getSummaries).toHaveBeenCalledWith(7);
    expect(repository.update.mock.calls[0][2]).toBe(7);
    expect(repository.remove).toHaveBeenCalledWith(7, 7);
  });

  test('keeps owner center reads global', () => {
    const owner = { userType: 'superuser', role: 'owner' };
    service.listCenters(owner); service.getCenter(8, owner);
    expect(repository.findAll).toHaveBeenCalledWith(undefined);
    expect(repository.findById).toHaveBeenCalledWith(8, undefined);
  });

  test('inserts only supported center fields in stable order', () => {
    service.createCenter({ center_name: 'A', center_code: 'A1', email: 'a@x', phone: '1', address: 'Road', city: 'Tashkent', principal_name: 'P', injected: true });
    expect(repository.insert).toHaveBeenCalledWith(['A', 'A1', 'a@x', '1', 'Road', 'Tashkent', 'P']);
  });
});
