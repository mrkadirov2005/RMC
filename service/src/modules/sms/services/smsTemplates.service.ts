// The owner's own SMS wording. A template is plain text with placeholders in braces, e.g.
// "Hurmatli ota-ona! {ism} uchun {oy} to'lovi kutilmoqda: {qoldiq}." The active template of a type
// is used for every send of that type; with none active the built-in text is used.
const smsTemplatesRepository = require('../repositories/smsTemplates.repository');

const TEMPLATE_KINDS = ['payment_success', 'payment_waiting', 'attendance'] as const;
type TemplateKind = typeof TEMPLATE_KINDS[number];

const MAX_NAME = 120;
const MAX_BODY = 1000;

const COMMON = ['ism', 'guruh', 'markaz'];
const PAYMENT = ['oy', 'tolangan', 'qoldiq', 'kutilgan'];

/** Placeholders each type can use: {ism} student, {guruh} group, {markaz} center, and the type's own figures. */
const PLACEHOLDERS: Record<TemplateKind, string[]> = {
  payment_success: [...COMMON, ...PAYMENT],
  payment_waiting: [...COMMON, ...PAYMENT],
  attendance: [...COMMON, 'soni', 'sanalar'],
};

// Close to the built-in texts, as a starting point for a new template.
const EXAMPLES: Record<TemplateKind, string> = {
  payment_success: "Hurmatli ota-ona! {ism} ({guruh}) uchun {oy} to'lovi qabul qilindi: {tolangan}. Qoldiq: {qoldiq}. Rahmat!\n{markaz}",
  payment_waiting: "Hurmatli ota-ona! {ism} ({guruh}) uchun {oy} to'lovi kutilmoqda: {qoldiq}. Iltimos, to'lovni o'z vaqtida qiling.\n{markaz}",
  attendance: "Hurmatli ota-ona! Farzandingiz {ism} {guruh} guruhidagi oxirgi {soni} ta darsga kelmadi ({sanalar}). Iltimos, sababini markazga xabar bering.\n{markaz}",
};

const PLACEHOLDER = /\{([a-z_]+)\}/g;

const isTemplateKind = (kind: unknown): kind is TemplateKind => TEMPLATE_KINDS.includes(kind as TemplateKind);

/** Fills the placeholders; one without a value becomes empty. */
const renderTemplate = (body: string, values: Record<string, string | number | null | undefined>) =>
  body.replace(PLACEHOLDER, (_match, key) => String(values[key] ?? ''));

const badRequest = (message: string) => Object.assign(new Error(message), { statusCode: 400 });

/** Checks a template and returns it trimmed, or throws a 400 that says what is wrong. */
const validateTemplate = (kind: unknown, nameInput: unknown, bodyInput: unknown) => {
  if (!isTemplateKind(kind)) throw badRequest("SMS turi noto'g'ri.");
  const name = String(nameInput ?? '').trim();
  const body = String(bodyInput ?? '').trim();
  if (!name) throw badRequest('Shablon nomini kiriting.');
  if (name.length > MAX_NAME) throw badRequest(`Shablon nomi ${MAX_NAME} belgidan oshmasin.`);
  if (!body) throw badRequest('Shablon matnini kiriting.');
  if (body.length > MAX_BODY) throw badRequest(`Shablon matni ${MAX_BODY} belgidan oshmasin.`);
  const unknown = Array.from(new Set(Array.from(body.matchAll(PLACEHOLDER), (match) => match[1])))
    .filter((key) => !PLACEHOLDERS[kind].includes(key));
  if (unknown.length) throw badRequest(`Bu turda ishlatib bo'lmaydigan o'rinlar: ${unknown.map((key) => `{${key}}`).join(', ')}.`);
  return { kind, name, body };
};

const notFound = () => Object.assign(new Error('Shablon topilmadi.'), { statusCode: 404 });

const listTemplates = async () => ({
  templates: await smsTemplatesRepository.findAll(),
  kinds: TEMPLATE_KINDS.map((kind) => ({ kind, placeholders: PLACEHOLDERS[kind], example: EXAMPLES[kind] })),
});

const createTemplate = async (input: any) => smsTemplatesRepository.create(validateTemplate(input?.kind, input?.name, input?.body));

const updateTemplate = async (id: number, input: any) => {
  const existing = (await smsTemplatesRepository.findAll()).find((row: any) => Number(row.template_id) === id);
  if (!existing) throw notFound();
  const { name, body } = validateTemplate(existing.kind, input?.name, input?.body);
  return smsTemplatesRepository.update(id, { name, body });
};

const deleteTemplate = async (id: number) => {
  if (!(await smsTemplatesRepository.remove(id))) throw notFound();
};

const setTemplateActive = async (id: number, active: boolean) => {
  const row = await smsTemplatesRepository.setActive(id, active);
  if (!row) throw notFound();
  return row;
};

/** The active template's text per type, for the senders. A failure falls back to the built-in texts. */
const activeBodies = async (): Promise<Record<string, string>> => {
  try {
    return await smsTemplatesRepository.findActiveBodies();
  } catch (error) {
    console.error('[sms] could not load templates, using the built-in texts:', error);
    return {};
  }
};

module.exports = {
  TEMPLATE_KINDS,
  PLACEHOLDERS,
  EXAMPLES,
  renderTemplate,
  validateTemplate,
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  setTemplateActive,
  activeBodies,
};

export {};
