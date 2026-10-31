const repo = require('./homework.repository');
const { validateContent, maxScore, forStudent, autoScore } = require('./taskContent');
const studentService = require('../students/services/student.service');
const notificationRepo = require('../mobile/repositories/mobileNotification.repository');

const SKILLS = ['vocabulary', 'grammar', 'reading', 'listening', 'writing', 'speaking', 'other'];
// @MOB-056 Coins for a fully correct homework; a partial score gets a share. 0 turns coins off.
const MAX_COINS = Number(process.env.HOMEWORK_MAX_COINS ?? 5);

type Actor = { userType: string; id: number; name: string | null; centerId: number | null; isGlobal: boolean };

const canUseCenter = (actor: Actor, centerId: number | null) =>
  actor.isGlobal || centerId == null || Number(centerId) === Number(actor.centerId);

// ---------------- Bank (@MOB-052) ----------------
const bank = async (actor: Actor) => {
  const { levels, books, units, lessons } = await repo.bank(actor.isGlobal ? actor.centerId : actor.centerId ?? -1);
  const byParent = (rows: any[], key: string) => (id: number) => rows.filter((r) => Number(r[key]) === Number(id));
  const lessonsOf = byParent(lessons, 'unit_id');
  const unitsOf = byParent(units, 'book_id');
  const booksOf = byParent(books, 'level_id');
  return {
    levels: levels.map((level: any) => ({
      ...level,
      books: booksOf(level.level_id).map((book: any) => ({
        ...book,
        units: unitsOf(book.book_id).map((unit: any) => ({ ...unit, lessons: lessonsOf(unit.unit_id) })),
      })),
    })),
  };
};

const PARENT_KIND: Record<string, string | null> = { level: null, book: 'level', unit: 'book', lesson: 'unit' };

// Only admins and the owner shape the bank; a level made by the owner without a center is shared.
const createNode = async (actor: Actor, kind: string, parentId: number | null, title: string, sortOrder = 0) => {
  if (!(kind in PARENT_KIND)) return { error: 'invalid_kind' as const };
  if (actor.userType !== 'superuser') return { error: 'forbidden' as const };
  const parentKind = PARENT_KIND[kind];
  if (parentKind) {
    const parent = await repo.nodeCenter(parentKind, Number(parentId));
    if (!parent) return { error: 'parent_not_found' as const };
    if (!canUseCenter(actor, parent.center_id)) return { error: 'forbidden' as const };
    return { node: await repo.createNode(kind, Number(parentId), title, sortOrder) };
  }
  return { node: await repo.createNode(kind, actor.centerId ?? null, title, sortOrder) };
};

// ---------------- Tasks (@MOB-051) ----------------
const checkTask = (body: any) => {
  const errors: string[] = [];
  if (typeof body?.title !== 'string' || !body.title.trim() || body.title.length > 200) errors.push('title is required');
  if (!SKILLS.includes(body?.skill)) errors.push(`skill must be one of ${SKILLS.join(', ')}`);
  errors.push(...validateContent(body?.content));
  return errors;
};

const listTasks = async (actor: Actor, lessonId: number) => {
  const lesson = await repo.nodeCenter('lesson', lessonId);
  if (!lesson || !canUseCenter(actor, lesson.center_id)) return null;
  return repo.listTasks(lessonId);
};

const createTask = async (actor: Actor, body: any) => {
  const errors = checkTask(body);
  if (errors.length) return { error: 'invalid' as const, details: errors };
  const lesson = await repo.nodeCenter('lesson', Number(body.lesson_id));
  if (!lesson) return { error: 'not_found' as const };
  if (!canUseCenter(actor, lesson.center_id)) return { error: 'forbidden' as const };
  const task = await repo.createTask({
    lesson_id: Number(body.lesson_id),
    title: body.title.trim(),
    skill: body.skill,
    instructions: body.instructions ?? null,
    content: body.content,
    max_score: maxScore(body.content),
    created_by_name: actor.name,
  });
  return { task };
};

const updateTask = async (actor: Actor, taskId: number, body: any) => {
  const errors = checkTask(body);
  if (errors.length) return { error: 'invalid' as const, details: errors };
  const existing = await repo.getTask(taskId);
  if (!existing) return { error: 'not_found' as const };
  if (!canUseCenter(actor, existing.center_id)) return { error: 'forbidden' as const };
  const task = await repo.updateTask(taskId, { title: body.title.trim(), skill: body.skill, instructions: body.instructions ?? null, content: body.content, max_score: maxScore(body.content) });
  return { task };
};

// @MOB-052 Approving is for admins and the owner (the Academic Director role), not teachers.
const approveTask = async (actor: Actor, taskId: number) => {
  if (actor.userType !== 'superuser') return { error: 'forbidden' as const };
  const existing = await repo.getTask(taskId);
  if (!existing) return { error: 'not_found' as const };
  if (!canUseCenter(actor, existing.center_id)) return { error: 'forbidden' as const };
  return { task: await repo.approveTask(taskId, actor.name) };
};

// ---------------- Assignments (@MOB-053) ----------------
const canUseClass = (actor: Actor, cls: any) => {
  if (!cls) return false;
  if (actor.userType === 'teacher') return Number(cls.teacher_id) === Number(actor.id);
  return actor.isGlobal || Number(cls.center_id) === Number(actor.centerId);
};

const createAssignment = async (actor: Actor, body: any) => {
  const task = await repo.getTask(Number(body?.task_id));
  if (!task) return { error: 'task_not_found' as const };
  if (task.status !== 'approved') return { error: 'not_approved' as const };
  const cls = await repo.classInfo(Number(body?.class_id));
  if (!canUseClass(actor, cls)) return { error: 'forbidden' as const };
  if (!canUseCenter({ ...actor, centerId: cls.center_id }, task.center_id)) return { error: 'forbidden' as const };
  const dueAt = body?.due_at ? new Date(body.due_at) : null;
  if (dueAt && Number.isNaN(dueAt.getTime())) return { error: 'invalid_due' as const };
  const assignment = await repo.createAssignment({
    task_id: task.task_id,
    center_id: cls.center_id,
    class_id: cls.class_id,
    due_at: dueAt,
    open_after_lesson: Boolean(body?.open_after_lesson),
    created_by_type: actor.userType,
    created_by_id: actor.id,
    created_by_name: actor.name,
  });
  return { assignment };
};

const listAssignments = (actor: Actor, classId: number | null) =>
  repo.listAssignments(actor.isGlobal ? null : actor.centerId, classId, actor.userType === 'teacher' ? actor.id : null);

const findOwnAssignment = async (actor: Actor, assignmentId: number) => {
  const assignment = await repo.getAssignment(assignmentId);
  if (!assignment || !canUseClass(actor, { teacher_id: assignment.teacher_id, center_id: assignment.center_id })) return null;
  return assignment;
};

const deleteAssignment = async (actor: Actor, assignmentId: number) => {
  if (!(await findOwnAssignment(actor, assignmentId))) return false;
  return Boolean(await repo.deleteAssignment(assignmentId));
};

const submissions = async (actor: Actor, assignmentId: number) => {
  if (!(await findOwnAssignment(actor, assignmentId))) return null;
  return repo.submissionsFor(assignmentId);
};

// ---------------- Students (@MOB-054) ----------------
const statusOf = (row: any) => {
  if (row.submission_status === 'reviewed') return 'reviewed';
  if (row.submission_status === 'submitted') return 'submitted';
  if (row.due_at && new Date(row.due_at).getTime() < Date.now()) return 'overdue';
  return row.submission_status === 'in_progress' ? 'in_progress' : 'new';
};

const num = (value: any) => (value == null ? null : Number(value));

// The student's main (login) record id, so every group record shares one submission.
const mainIdOf = async (studentId: number) => {
  const groups = await studentService.listLinkedGroups(studentId);
  const main = (groups || []).find((g: any) => g.is_main);
  return Number(main?.student_id ?? studentId);
};

const listForStudent = async (studentId: number) => {
  const mainId = await mainIdOf(studentId);
  const rows = await repo.studentAssignments(mainId);
  const items = rows.map((row: any) => ({
    assignment_id: row.assignment_id,
    title: row.title,
    skill: row.skill,
    class_name: row.class_name,
    due_at: row.due_at,
    max_score: num(row.max_score),
    score: num(row.score),
    status: statusOf(row),
  }));
  const pending = items.filter((i: any) => i.status === 'new' || i.status === 'in_progress' || i.status === 'overdue').length;
  return { items, pending };
};

const detailForStudent = async (studentId: number, assignmentId: number) => {
  const mainId = await mainIdOf(studentId);
  const row = await repo.studentAssignment(assignmentId, mainId);
  if (!row) return null;
  const done = row.submission_status === 'submitted' || row.submission_status === 'reviewed';
  const result = done ? autoScore(row.content, row.answers || {}) : null;
  return {
    assignment_id: row.assignment_id,
    title: row.title,
    skill: row.skill,
    instructions: row.instructions,
    class_name: row.class_name,
    due_at: row.due_at,
    max_score: num(row.max_score),
    status: statusOf(row),
    task: forStudent(row.content),
    answers: row.answers || {},
    score: num(row.score),
    feedback: row.feedback ?? null,
    // After submitting, the student sees which questions were right (not the keys).
    per_question: result ? result.perQuestion : null,
  };
};

const saveAnswers = async (studentId: number, assignmentId: number, answers: any) => {
  const mainId = await mainIdOf(studentId);
  if (!(await repo.studentAssignment(assignmentId, mainId))) return { error: 'not_found' as const };
  const saved = await repo.saveAnswers(assignmentId, mainId, answers);
  if (!saved) return { error: 'already_submitted' as const };
  return { saved };
};

// @MOB-054 Submits once. Objective-only tasks are graded at once; tasks with written answers
// wait for the teacher with the automatic part already counted.
const submit = async (studentId: number, assignmentId: number, answers: any) => {
  const mainId = await mainIdOf(studentId);
  const row = await repo.studentAssignment(assignmentId, mainId);
  if (!row) return { error: 'not_found' as const };
  if (row.submission_status === 'submitted' || row.submission_status === 'reviewed') return { error: 'already_submitted' as const };
  const finalAnswers = answers ?? row.answers ?? {};
  const result = autoScore(row.content, finalAnswers);
  const status = result.needsReview ? 'submitted' : 'reviewed';
  const submission = await repo.submit(assignmentId, mainId, {
    answers: finalAnswers,
    status,
    auto_score: result.score,
    score: result.needsReview ? null : result.score,
    max_score: row.max_score,
  });
  if (!submission) return { error: 'already_submitted' as const };
  if (status === 'reviewed') await awardCoins(submission, mainId, row.title, null);
  return { submission: { ...submission, per_question: result.perQuestion } };
};

// ---------------- Review (@MOB-056) ----------------
const coinsFor = (score: number, max: number) => (MAX_COINS > 0 && max > 0 ? Math.round((MAX_COINS * Math.max(0, Math.min(score, max))) / max) : 0);

const awardCoins = async (submission: any, studentId: number, title: string, actor: Actor | null) => {
  const coins = coinsFor(Number(submission.score || 0), Number(submission.max_score || 0));
  await studentService.upsertSourceCoins(
    studentId,
    coins,
    `Uy vazifasi: ${title}`,
    'homework',
    Number(submission.submission_id),
    actor?.id ?? null,
    actor?.userType ?? null,
  );
  await repo.setCoinsAwarded(submission.submission_id, coins);
  return coins;
};

const review = async (actor: Actor, submissionId: number, body: any) => {
  const existing = await repo.getSubmission(submissionId);
  if (!existing || !canUseClass(actor, { teacher_id: existing.teacher_id, center_id: existing.center_id })) return { error: 'not_found' as const };
  if (existing.status === 'in_progress') return { error: 'not_submitted' as const };
  const score = Number(body?.score);
  const max = Number(existing.max_score || existing.task_max_score);
  if (!Number.isFinite(score) || score < 0 || score > max) return { error: 'invalid_score' as const, max };
  const feedback = typeof body?.feedback === 'string' ? body.feedback.trim().slice(0, 4000) || null : null;
  const reviewed = await repo.review(submissionId, { score, feedback, reviewed_by_name: actor.name });
  const coins = await awardCoins(reviewed, Number(existing.student_id), existing.title, actor);
  const parents = await notificationRepo.parentsOf([Number(existing.student_id)]);
  const body2 = `${existing.title}: ${score}/${max}${feedback ? ` — ${feedback.slice(0, 120)}` : ''}`;
  const recipients = [
    { userType: 'student', userId: Number(existing.student_id), body: body2, url: `/homework/${existing.assignment_id}` },
    ...parents.map((id: number) => ({ userType: 'parent', userId: id, body: `${existing.first_name || ''}: ${body2}`, url: `/homework?child=${existing.student_id}` })),
  ];
  for (const r of recipients) {
    if (await notificationRepo.isCategoryEnabled(r.userType, r.userId, 'homework')) {
      await notificationRepo.enqueue({
        userType: r.userType,
        userId: r.userId,
        category: 'homework',
        title: 'Uy vazifasi baholandi',
        body: r.body,
        data: { url: r.url },
        dedupeKey: `homework-review:${submissionId}:${r.userType}:${r.userId}:${Date.now()}`,
      });
    }
  }
  return { submission: { ...reviewed, coins_awarded: coins } };
};

module.exports = {
  SKILLS,
  bank,
  createNode,
  listTasks,
  createTask,
  updateTask,
  approveTask,
  createAssignment,
  listAssignments,
  deleteAssignment,
  submissions,
  listForStudent,
  detailForStudent,
  saveAnswers,
  submit,
  review,
  coinsFor,
};

export {};
