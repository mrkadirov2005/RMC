const homeworkService = require('./homework.service');
const { getScopedCenterId } = require('../../shared/tenant');

const ERRORS: Record<string, [number, string]> = {
  invalid_kind: [400, "Bo'lim turi noto'g'ri"],
  parent_not_found: [404, "Yuqori bo'lim topilmadi"],
  forbidden: [403, "Bu amalni bajarishga ruxsatingiz yo'q."],
  not_found: [404, 'Topilmadi'],
  task_not_found: [404, 'Vazifa topilmadi'],
  not_approved: [400, 'Faqat tasdiqlangan vazifani berish mumkin'],
  invalid_due: [400, "Muddat noto'g'ri"],
  invalid: [400, "Vazifa ma'lumotlari noto'g'ri"],
  already_submitted: [409, 'Vazifa allaqachon topshirilgan'],
  not_submitted: [400, 'Vazifa hali topshirilmagan'],
  invalid_score: [400, "Ball noto'g'ri"],
};

const fail = (res: any, error: any, message: string) => {
  console.error('Homework error:', error);
  res.status(500).json({ error: message });
};

const sendResult = (res: any, result: any, key: string, status = 200) => {
  if (result?.error) {
    const [code, message] = ERRORS[result.error] || [400, 'Xatolik'];
    return res.status(code).json({ error: message, code: String(result.error).toUpperCase(), details: result.details, max: result.max });
  }
  return res.status(status).json(result[key]);
};

const idOf = (value: any) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// The signed-in admin, owner or teacher, with the center they work in.
const actorOf = (req: any) => {
  const { centerId, isGlobal } = getScopedCenterId(req);
  return {
    userType: req.user.userType,
    id: Number(req.user.id),
    name: req.user.username || req.user.email || null,
    centerId: centerId ?? req.user.center_id ?? null,
    isGlobal: Boolean(isGlobal),
  };
};

const handle = (message: string, run: (req: any, res: any) => Promise<any>) => async (req: any, res: any) => {
  try {
    await run(req, res);
  } catch (error: any) {
    fail(res, error, message);
  }
};

// ---------------- Web panel (@MOB-052 @MOB-053 @MOB-163 @MOB-165) ----------------
const bank = handle("Bankni yuklab bo'lmadi", async (req, res) => res.json(await homeworkService.bank(actorOf(req))));

const createNode = handle("Bo'limni saqlab bo'lmadi", async (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (!title || title.length > 200) return res.status(400).json({ error: 'Nomi kerak' });
  const result = await homeworkService.createNode(actorOf(req), req.params.kind, idOf(req.body?.parent_id), title, Number(req.body?.sort_order) || 0);
  sendResult(res, result, 'node', 201);
});

const listTasks = handle("Vazifalarni yuklab bo'lmadi", async (req, res) => {
  const lessonId = idOf(req.params.lessonId);
  if (!lessonId) return res.status(400).json({ error: "Dars noto'g'ri" });
  const tasks = await homeworkService.listTasks(actorOf(req), lessonId);
  if (!tasks) return res.status(404).json({ error: 'Dars topilmadi' });
  res.json({ items: tasks });
});

const createTask = handle("Vazifani saqlab bo'lmadi", async (req, res) =>
  sendResult(res, await homeworkService.createTask(actorOf(req), req.body), 'task', 201),
);

const updateTask = handle("Vazifani saqlab bo'lmadi", async (req, res) => {
  const id = idOf(req.params.id);
  if (!id) return res.status(400).json({ error: "Vazifa noto'g'ri" });
  sendResult(res, await homeworkService.updateTask(actorOf(req), id, req.body), 'task');
});

const approveTask = handle("Vazifani tasdiqlab bo'lmadi", async (req, res) => {
  const id = idOf(req.params.id);
  if (!id) return res.status(400).json({ error: "Vazifa noto'g'ri" });
  sendResult(res, await homeworkService.approveTask(actorOf(req), id), 'task');
});

const listAssignments = handle("Berilgan vazifalarni yuklab bo'lmadi", async (req, res) =>
  res.json({ items: await homeworkService.listAssignments(actorOf(req), idOf(req.query?.class_id)) }),
);

const createAssignment = handle("Vazifani berib bo'lmadi", async (req, res) =>
  sendResult(res, await homeworkService.createAssignment(actorOf(req), req.body), 'assignment', 201),
);

const deleteAssignment = handle("O'chirib bo'lmadi", async (req, res) => {
  const id = idOf(req.params.id);
  if (!id || !(await homeworkService.deleteAssignment(actorOf(req), id))) return res.status(404).json({ error: 'Topilmadi' });
  res.json({ message: "O'chirildi" });
});

const submissions = handle("Javoblarni yuklab bo'lmadi", async (req, res) => {
  const id = idOf(req.params.id);
  const rows = id ? await homeworkService.submissions(actorOf(req), id) : null;
  if (!rows) return res.status(404).json({ error: 'Topilmadi' });
  res.json({ items: rows });
});

const review = handle("Baholab bo'lmadi", async (req, res) => {
  const id = idOf(req.params.id);
  if (!id) return res.status(400).json({ error: "Javob noto'g'ri" });
  sendResult(res, await homeworkService.review(actorOf(req), id, req.body), 'submission');
});

// ---------------- Mobile (@MOB-054 @MOB-140) ----------------
// Students act on themselves; a parent reads a linked child (req.child, set by requireLinkedChild).
const learnerId = (req: any) => Number(req.child ? req.child.student_id : req.user.id);

const myHomework = handle("Uy vazifalarini yuklab bo'lmadi", async (req, res) => res.json(await homeworkService.listForStudent(learnerId(req))));

const homeworkDetail = handle("Uy vazifasini yuklab bo'lmadi", async (req, res) => {
  const id = idOf(req.params.assignmentId);
  const detail = id ? await homeworkService.detailForStudent(learnerId(req), id) : null;
  if (!detail) return res.status(404).json({ error: 'Uy vazifasi topilmadi' });
  res.json(detail);
});

const saveAnswers = handle("Javoblarni saqlab bo'lmadi", async (req, res) => {
  const id = idOf(req.params.assignmentId);
  const answers = req.body?.answers;
  if (!id || !answers || typeof answers !== 'object' || Array.isArray(answers) || JSON.stringify(answers).length > 100_000) {
    return res.status(400).json({ error: "Javoblar noto'g'ri" });
  }
  sendResult(res, await homeworkService.saveAnswers(Number(req.user.id), id, answers), 'saved');
});

const submit = handle("Topshirib bo'lmadi", async (req, res) => {
  const id = idOf(req.params.assignmentId);
  const answers = req.body?.answers;
  if (!id || (answers != null && (typeof answers !== 'object' || Array.isArray(answers) || JSON.stringify(answers).length > 100_000))) {
    return res.status(400).json({ error: "Javoblar noto'g'ri" });
  }
  sendResult(res, await homeworkService.submit(Number(req.user.id), id, answers ?? null), 'submission');
});

module.exports = {
  bank,
  createNode,
  listTasks,
  createTask,
  updateTask,
  approveTask,
  listAssignments,
  createAssignment,
  deleteAssignment,
  submissions,
  review,
  myHomework,
  homeworkDetail,
  saveAnswers,
  submit,
};

export {};
