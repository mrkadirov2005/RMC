jest.mock('../homework.repository', () => ({
  bank: jest.fn(),
  createNode: jest.fn(),
  nodeCenter: jest.fn(),
  listTasks: jest.fn(),
  getTask: jest.fn(),
  createTask: jest.fn(),
  updateTask: jest.fn(),
  approveTask: jest.fn(),
  classInfo: jest.fn(),
  createAssignment: jest.fn(),
  listAssignments: jest.fn(),
  getAssignment: jest.fn(),
  deleteAssignment: jest.fn(),
  studentAssignments: jest.fn(),
  studentAssignment: jest.fn(),
  saveAnswers: jest.fn(),
  submit: jest.fn(),
  submissionsFor: jest.fn(),
  getSubmission: jest.fn(),
  review: jest.fn(),
  setCoinsAwarded: jest.fn(),
}));
jest.mock('../../students/services/student.service', () => ({ listLinkedGroups: jest.fn(), upsertSourceCoins: jest.fn() }));
jest.mock('../../mobile/repositories/mobileNotification.repository', () => ({ parentsOf: jest.fn(), isCategoryEnabled: jest.fn(), enqueue: jest.fn() }));

const repo = require('../homework.repository');
const studentService = require('../../students/services/student.service');
const notificationRepo = require('../../mobile/repositories/mobileNotification.repository');
const service = require('../homework.service');

const admin = { userType: 'superuser', id: 1, name: 'admin1', centerId: 2, isGlobal: false };
const owner = { userType: 'superuser', id: 9, name: 'owner', centerId: null, isGlobal: true };
const teacher = { userType: 'teacher', id: 5, name: 'temur', centerId: 2, isGlobal: false };
const content = { questions: [{ id: 'q1', type: 'choice', prompt: 'p', options: ['a', 'b'], answer: 1 }, { id: 'q2', type: 'text', prompt: 'w', points: 2 }] };
const objective = { questions: [content.questions[0]] };

describe('homework service', () => {
  beforeEach(() => {
    studentService.listLinkedGroups.mockResolvedValue([{ student_id: 7, is_main: true }, { student_id: 8, is_main: false }]);
    notificationRepo.parentsOf.mockResolvedValue([11]);
    notificationRepo.isCategoryEnabled.mockResolvedValue(true);
  });

  // @MOB-052
  it('builds the bank tree', async () => {
    repo.bank.mockResolvedValue({
      levels: [{ level_id: 1 }],
      books: [{ book_id: 2, level_id: 1 }],
      units: [{ unit_id: 3, book_id: 2 }],
      lessons: [{ lesson_id: 4, unit_id: 3 }],
    });
    const tree = await service.bank(admin);
    expect(tree.levels[0].books[0].units[0].lessons[0].lesson_id).toBe(4);
    expect(repo.bank).toHaveBeenCalledWith(2);
    await service.bank(owner);
    expect(repo.bank).toHaveBeenLastCalledWith(null);
  });

  it('lets only admins add bank sections, inside their own center', async () => {
    await expect(service.createNode(teacher, 'level', null, 'B1')).resolves.toEqual({ error: 'forbidden' });
    await expect(service.createNode(admin, 'chapter', null, 'x')).resolves.toEqual({ error: 'invalid_kind' });
    repo.createNode.mockResolvedValue({ id: 1 });
    await expect(service.createNode(admin, 'level', null, 'B1')).resolves.toEqual({ node: { id: 1 } });
    expect(repo.createNode).toHaveBeenCalledWith('level', 2, 'B1', 0);

    repo.nodeCenter.mockResolvedValueOnce(null);
    await expect(service.createNode(admin, 'book', 1, 'x')).resolves.toEqual({ error: 'parent_not_found' });
    repo.nodeCenter.mockResolvedValueOnce({ center_id: 3 });
    await expect(service.createNode(admin, 'book', 1, 'x')).resolves.toEqual({ error: 'forbidden' });
    repo.nodeCenter.mockResolvedValueOnce({ center_id: null });
    await expect(service.createNode(admin, 'book', 1, 'x')).resolves.toEqual({ node: { id: 1 } });
  });

  // @MOB-051
  it('validates tasks, computes max score and resets approval on edit', async () => {
    await expect(service.createTask(admin, { title: '', skill: 'cooking', content: {} })).resolves.toMatchObject({ error: 'invalid' });
    repo.nodeCenter.mockResolvedValueOnce(null);
    await expect(service.createTask(admin, { lesson_id: 4, title: 'T', skill: 'grammar', content })).resolves.toEqual({ error: 'not_found' });
    repo.nodeCenter.mockResolvedValueOnce({ center_id: 2 });
    repo.createTask.mockResolvedValue({ task_id: 1 });
    await service.createTask(teacher, { lesson_id: 4, title: ' T ', skill: 'grammar', content });
    expect(repo.createTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'T', max_score: 3, created_by_name: 'temur' }));

    repo.getTask.mockResolvedValueOnce(null);
    await expect(service.updateTask(admin, 1, { title: 'T', skill: 'grammar', content })).resolves.toEqual({ error: 'not_found' });
    repo.getTask.mockResolvedValueOnce({ task_id: 1, center_id: 3 });
    await expect(service.updateTask(admin, 1, { title: 'T', skill: 'grammar', content })).resolves.toEqual({ error: 'forbidden' });
    repo.getTask.mockResolvedValueOnce({ task_id: 1, center_id: 2 });
    repo.updateTask.mockResolvedValue({ task_id: 1, status: 'draft' });
    await expect(service.updateTask(admin, 1, { title: 'T', skill: 'grammar', content })).resolves.toEqual({ task: { task_id: 1, status: 'draft' } });
    await expect(service.updateTask(admin, 1, { title: 'T', skill: 'x', content })).resolves.toMatchObject({ error: 'invalid' });

    repo.nodeCenter.mockResolvedValueOnce({ center_id: 3 });
    await expect(service.listTasks(admin, 4)).resolves.toBeNull();
    repo.nodeCenter.mockResolvedValueOnce({ center_id: 2 });
    repo.listTasks.mockResolvedValue([]);
    await expect(service.listTasks(admin, 4)).resolves.toEqual([]);
  });

  // @MOB-052
  it('only admins approve tasks', async () => {
    await expect(service.approveTask(teacher, 1)).resolves.toEqual({ error: 'forbidden' });
    repo.getTask.mockResolvedValueOnce(null);
    await expect(service.approveTask(admin, 1)).resolves.toEqual({ error: 'not_found' });
    repo.getTask.mockResolvedValueOnce({ task_id: 1, center_id: null });
    repo.approveTask.mockResolvedValue({ status: 'approved' });
    await expect(service.approveTask(admin, 1)).resolves.toEqual({ task: { status: 'approved' } });
    expect(repo.approveTask).toHaveBeenCalledWith(1, 'admin1');
  });

  // @MOB-053
  it('assigns approved tasks to groups the user may teach', async () => {
    repo.getTask.mockResolvedValueOnce(null);
    await expect(service.createAssignment(admin, { task_id: 1, class_id: 3 })).resolves.toEqual({ error: 'task_not_found' });
    repo.getTask.mockResolvedValue({ task_id: 1, status: 'draft', center_id: null });
    await expect(service.createAssignment(admin, { task_id: 1, class_id: 3 })).resolves.toEqual({ error: 'not_approved' });

    repo.getTask.mockResolvedValue({ task_id: 1, status: 'approved', center_id: null });
    repo.classInfo.mockResolvedValue({ class_id: 3, center_id: 2, teacher_id: 6 });
    await expect(service.createAssignment(teacher, { task_id: 1, class_id: 3 })).resolves.toEqual({ error: 'forbidden' });
    await expect(service.createAssignment(admin, { task_id: 1, class_id: 3, due_at: 'not a date' })).resolves.toEqual({ error: 'invalid_due' });

    repo.createAssignment.mockResolvedValue({ assignment_id: 9 });
    await expect(service.createAssignment(admin, { task_id: 1, class_id: 3, open_after_lesson: 1 })).resolves.toEqual({ assignment: { assignment_id: 9 } });
    expect(repo.createAssignment).toHaveBeenCalledWith(expect.objectContaining({ center_id: 2, class_id: 3, open_after_lesson: true, created_by_type: 'superuser' }));

    repo.getTask.mockResolvedValue({ task_id: 1, status: 'approved', center_id: 5 });
    await expect(service.createAssignment(admin, { task_id: 1, class_id: 3 })).resolves.toEqual({ error: 'forbidden' });
  });

  it('teachers see and manage only their own groups', async () => {
    repo.listAssignments.mockResolvedValue([]);
    await service.listAssignments(teacher, 3);
    expect(repo.listAssignments).toHaveBeenLastCalledWith(2, 3, 5);
    await service.listAssignments(owner, null);
    expect(repo.listAssignments).toHaveBeenLastCalledWith(null, null, null);

    repo.getAssignment.mockResolvedValue({ assignment_id: 9, teacher_id: 6, center_id: 2 });
    await expect(service.deleteAssignment(teacher, 9)).resolves.toBe(false);
    await expect(service.submissions(teacher, 9)).resolves.toBeNull();
    repo.deleteAssignment.mockResolvedValue({ assignment_id: 9 });
    await expect(service.deleteAssignment(admin, 9)).resolves.toBe(true);
    repo.submissionsFor.mockResolvedValue([{ submission_id: 1 }]);
    await expect(service.submissions(admin, 9)).resolves.toEqual([{ submission_id: 1 }]);
  });

  // @MOB-054
  it('lists homework by the main record with a status per item', async () => {
    repo.studentAssignments.mockResolvedValue([
      { assignment_id: 1, submission_status: null, due_at: '2099-01-01' },
      { assignment_id: 2, submission_status: 'in_progress' },
      { assignment_id: 3, submission_status: null, due_at: '2000-01-01' },
      { assignment_id: 4, submission_status: 'submitted' },
      { assignment_id: 5, submission_status: 'reviewed', score: '4.5', max_score: '5' },
    ]);
    const result = await service.listForStudent(8);
    expect(repo.studentAssignments).toHaveBeenCalledWith(7);
    expect(result.items.map((i) => i.status)).toEqual(['new', 'in_progress', 'overdue', 'submitted', 'reviewed']);
    expect(result.items[4]).toMatchObject({ score: 4.5, max_score: 5 });
    expect(result.pending).toBe(3);
  });

  it('shows a task without keys, and which answers were right after submitting', async () => {
    studentService.listLinkedGroups.mockResolvedValueOnce([]);
    repo.studentAssignment.mockResolvedValueOnce(null);
    await expect(service.detailForStudent(7, 1)).resolves.toBeNull();
    expect(repo.studentAssignment).toHaveBeenLastCalledWith(1, 7);

    repo.studentAssignment.mockResolvedValueOnce({ assignment_id: 1, content, answers: null, submission_status: null, max_score: '3' });
    const open = await service.detailForStudent(7, 1);
    expect(open).toMatchObject({ status: 'new', answers: {}, per_question: null, max_score: 3 });
    expect(JSON.stringify(open.task)).not.toContain('"answer"');

    repo.studentAssignment.mockResolvedValueOnce({ assignment_id: 1, content, answers: { q1: 1 }, submission_status: 'submitted' });
    expect((await service.detailForStudent(7, 1)).per_question).toEqual({ q1: 1, q2: null });
  });

  it('autosaves only open, unsubmitted homework', async () => {
    repo.studentAssignment.mockResolvedValueOnce(null);
    await expect(service.saveAnswers(7, 1, {})).resolves.toEqual({ error: 'not_found' });
    repo.studentAssignment.mockResolvedValue({ assignment_id: 1 });
    repo.saveAnswers.mockResolvedValueOnce(null);
    await expect(service.saveAnswers(7, 1, {})).resolves.toEqual({ error: 'already_submitted' });
    repo.saveAnswers.mockResolvedValueOnce({ submission_id: 3 });
    await expect(service.saveAnswers(7, 1, { q1: 0 })).resolves.toEqual({ saved: { submission_id: 3 } });
  });

  it('submits once: written answers wait for review, objective-only tasks are graded with coins', async () => {
    repo.studentAssignment.mockResolvedValueOnce(null);
    await expect(service.submit(7, 1, {})).resolves.toEqual({ error: 'not_found' });
    repo.studentAssignment.mockResolvedValueOnce({ submission_status: 'reviewed' });
    await expect(service.submit(7, 1, {})).resolves.toEqual({ error: 'already_submitted' });

    repo.studentAssignment.mockResolvedValueOnce({ content, answers: { q1: 1 }, max_score: '3', title: 'T' });
    repo.submit.mockResolvedValueOnce({ submission_id: 5, status: 'submitted' });
    await service.submit(7, 1, null);
    expect(repo.submit).toHaveBeenLastCalledWith(1, 7, { answers: { q1: 1 }, status: 'submitted', auto_score: 1, score: null, max_score: '3' });
    expect(studentService.upsertSourceCoins).not.toHaveBeenCalled();

    repo.studentAssignment.mockResolvedValueOnce({ content: objective, answers: {}, max_score: '1', title: 'T' });
    repo.submit.mockResolvedValueOnce({ submission_id: 6, status: 'reviewed', score: '1', max_score: '1' });
    await service.submit(7, 1, { q1: 1 });
    expect(studentService.upsertSourceCoins).toHaveBeenCalledWith(7, 5, 'Uy vazifasi: T', 'homework', 6, null, null);
    expect(repo.setCoinsAwarded).toHaveBeenCalledWith(6, 5);

    repo.studentAssignment.mockResolvedValueOnce({ content: objective, answers: {}, max_score: '1' });
    repo.submit.mockResolvedValueOnce(null);
    await expect(service.submit(7, 1, {})).resolves.toEqual({ error: 'already_submitted' });
  });

  // @MOB-056
  it('coins scale with the score', () => {
    expect(service.coinsFor(5, 10)).toBe(3);
    expect(service.coinsFor(12, 10)).toBe(5);
    expect(service.coinsFor(1, 0)).toBe(0);
  });

  it('reviews within range, awards coins and notifies student and parents', async () => {
    repo.getSubmission.mockResolvedValueOnce(null);
    await expect(service.review(admin, 1, { score: 1 })).resolves.toEqual({ error: 'not_found' });
    repo.getSubmission.mockResolvedValueOnce({ status: 'in_progress', teacher_id: 6, center_id: 2 });
    await expect(service.review(admin, 1, { score: 1 })).resolves.toEqual({ error: 'not_submitted' });

    const sub = { submission_id: 1, assignment_id: 9, student_id: 7, status: 'submitted', teacher_id: 5, center_id: 2, max_score: '3', title: 'T', first_name: 'Aziza' };
    repo.getSubmission.mockResolvedValue(sub);
    await expect(service.review(teacher, 1, { score: 4 })).resolves.toEqual({ error: 'invalid_score', max: 3 });

    repo.review.mockResolvedValue({ submission_id: 1, score: 3, max_score: '3' });
    notificationRepo.isCategoryEnabled.mockImplementation(async (type) => type === 'student');
    const result = await service.review(teacher, 1, { score: 3, feedback: ' Zo‘r ' });
    expect(repo.review).toHaveBeenCalledWith(1, { score: 3, feedback: 'Zo‘r', reviewed_by_name: 'temur' });
    expect(result.submission.coins_awarded).toBe(5);
    expect(notificationRepo.enqueue).toHaveBeenCalledTimes(1);
    expect(notificationRepo.enqueue).toHaveBeenCalledWith(expect.objectContaining({ userType: 'student', category: 'homework', body: 'T: 3/3 — Zo‘r' }));
  });
});
