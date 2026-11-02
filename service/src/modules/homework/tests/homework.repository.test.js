const mockQuery = jest.fn();
jest.mock('../../../db/pool', () => ({ query: (...args) => mockQuery(...args) }));

const repo = require('../homework.repository');

const rows = (r) => Promise.resolve({ rows: r });

describe('homework repository', () => {
  beforeEach(() => mockQuery.mockReset());

  // @MOB-052
  it('loads the bank level by level', async () => {
    mockQuery
      .mockReturnValueOnce(rows([{ level_id: 1 }]))
      .mockReturnValueOnce(rows([{ book_id: 2 }]))
      .mockReturnValueOnce(rows([{ unit_id: 3 }]))
      .mockReturnValueOnce(rows([{ lesson_id: 4 }]));
    await expect(repo.bank(2)).resolves.toEqual({ levels: [{ level_id: 1 }], books: [{ book_id: 2 }], units: [{ unit_id: 3 }], lessons: [{ lesson_id: 4 }] });
    expect(mockQuery.mock.calls.map((c) => c[1][0])).toEqual([2, [1], [2], [3]]);
  });

  it('finds the center of a bank node, or null', async () => {
    mockQuery.mockReturnValueOnce(rows([{ center_id: '2' }])).mockReturnValueOnce(rows([{ center_id: null }])).mockReturnValueOnce(rows([]));
    await expect(repo.nodeCenter('lesson', 4)).resolves.toEqual({ center_id: 2 });
    await expect(repo.nodeCenter('book', 2)).resolves.toEqual({ center_id: null });
    await expect(repo.nodeCenter('unit', 9)).resolves.toBeNull();
  });

  it('stores task content as JSON and returns single rows or null', async () => {
    mockQuery.mockReturnValue(rows([{ id: 1 }]));
    await repo.createTask({ lesson_id: 4, title: 't', skill: 'grammar', content: { questions: [] }, max_score: 1 });
    expect(mockQuery.mock.calls[0][1][4]).toBe('{"questions":[]}');
    await repo.updateTask(1, { title: 't', skill: 'grammar', content: { questions: [] }, max_score: 1 });
    await repo.createNode('level', 2, 'B1', 0);
    await repo.approveTask(1, 'a');
    await repo.createAssignment({ task_id: 1, center_id: 2, class_id: 3, created_by_type: 'superuser', created_by_id: 1 });
    await repo.saveAnswers(1, 7, undefined);
    expect(mockQuery.mock.calls.at(-1)[1][2]).toBe('{}');
    await repo.submit(1, 7, { status: 'submitted', auto_score: 1, score: null, max_score: 3 });
    await repo.review(1, { score: 2 });
    mockQuery.mockReturnValue(rows([]));
    await expect(repo.getTask(1)).resolves.toBeNull();
    await expect(repo.classInfo(3)).resolves.toBeNull();
    await expect(repo.getAssignment(3)).resolves.toBeNull();
    await expect(repo.deleteAssignment(3)).resolves.toBeNull();
    await expect(repo.studentAssignment(1, 7)).resolves.toBeNull();
    await expect(repo.getSubmission(1)).resolves.toBeNull();
  });

  // @MOB-054
  it('only shows homework of the student groups that is open', async () => {
    mockQuery.mockReturnValue(rows([]));
    await repo.studentAssignments(7);
    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toContain('main_student_id = $1');
    expect(sql).toContain('NOT a.open_after_lesson OR EXISTS');
    await repo.studentAssignment(1, 7);
    expect(mockQuery.mock.calls[1][0]).toContain('main_student_id = $2');
  });

  it('lists tasks, assignments and submissions', async () => {
    mockQuery.mockReturnValue(rows([]));
    await repo.listTasks(4);
    await repo.listAssignments(2, null, 5);
    expect(mockQuery.mock.calls[1][1]).toEqual([2, null, 5]);
    await repo.submissionsFor(9);
    await repo.setCoinsAwarded(1, 3);
    expect(mockQuery).toHaveBeenCalledTimes(4);
  });
});
