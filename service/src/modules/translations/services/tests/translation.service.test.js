jest.mock('../../repositories/translation.repository', () => ({ findAll: jest.fn(), findById: jest.fn(), upsert: jest.fn(), bulkUpsert: jest.fn(), remove: jest.fn() }));
const repository = require('../../repositories/translation.repository');
const service = require('../translation.service');

describe('translation service', () => {
  beforeEach(() => jest.clearAllMocks());
  test('forwards public reads and delete by stable id', () => {
    service.listTranslations(); service.getTranslation('hello'); service.deleteTranslation('hello');
    expect(repository.findAll).toHaveBeenCalled(); expect(repository.findById).toHaveBeenCalledWith('hello'); expect(repository.remove).toHaveBeenCalledWith('hello');
  });
  test('trims IDs and localized text during upsert', () => {
    service.saveTranslation(' hello ', { english: ' Hi ', uzbek: ' Salom ' });
    expect(repository.upsert).toHaveBeenCalledWith('hello', 'Hi', 'Salom');
  });
  test('rejects missing IDs before persistence', () => {
    expect(() => service.saveTranslations([{ english: 'Hi' }])).toThrow('Translation id is required');
    expect(repository.bulkUpsert).not.toHaveBeenCalled();
  });
  test('normalizes every bulk row transaction payload', () => {
    service.saveTranslations([{ id: ' a ', english: ' A ' }, { id: 'b', uzbek: ' B ' }]);
    expect(repository.bulkUpsert).toHaveBeenCalledWith([
      { id: 'a', english: 'A', uzbek: '' }, { id: 'b', english: '', uzbek: 'B' },
    ]);
  });
});
