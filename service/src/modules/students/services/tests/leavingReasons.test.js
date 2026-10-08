jest.mock('../../repositories/student.repository', () => ({ findActionReason: jest.fn(), remove: jest.fn() }));
const repository = require('../../repositories/student.repository');
const service = require('../student.service');

describe('leaving reasons', () => {
  beforeEach(() => jest.clearAllMocks());

  it('needs a note for reasons that ask for one, and saves it', async () => {
    repository.findActionReason.mockResolvedValue({ reason_id: 3, needs_note: true });
    expect(await service.deleteStudent(9, 3, 2, undefined, '  ')).toEqual({ error: 'note_required' });
    expect(repository.remove).not.toHaveBeenCalled();

    repository.remove.mockResolvedValue({ student_id: 9 });
    await service.deleteStudent(9, 3, 2, undefined, ' B2 oldi ');
    expect(repository.remove).toHaveBeenCalledWith(9, 3, 2, undefined, 'B2 oldi');
  });

  it('keeps an optional note, or none', async () => {
    repository.findActionReason.mockResolvedValue({ reason_id: 5, needs_note: false });
    repository.remove.mockResolvedValue({ student_id: 9 });
    await service.deleteStudent(9, 5, 2);
    expect(repository.remove).toHaveBeenCalledWith(9, 5, 2, undefined, null);
  });
});
