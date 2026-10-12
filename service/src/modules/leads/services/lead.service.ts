const leadRepository = require('../repositories/lead.repository');

const STAGES = ['waiting_group', 'new_group'];
const OUTCOMES = ['enrolled', 'lost'];

const text = (value: unknown, max: number) => {
  const cleaned = String(value ?? '').trim();
  return cleaned ? cleaned.slice(0, max) : null;
};
const isDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

const centerToday = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

/** A lead's fields, validated: a stage, a name and a phone are required; the call-back day is optional. */
const fieldsOf = (body: any) => {
  const stage = String(body?.stage || '');
  const fullName = text(body?.full_name, 255);
  const phone = text(body?.phone, 50);
  if (!STAGES.includes(stage)) return { error: 'invalid_stage' as const };
  if (!fullName || !phone) return { error: 'name_phone_required' as const };
  const callBack = body?.call_back_on ? String(body.call_back_on) : null;
  if (callBack && !isDate(callBack)) return { error: 'invalid_date' as const };
  return {
    stage,
    fullName,
    phone,
    parentPhone: text(body?.parent_phone, 50),
    subject: text(body?.subject, 255),
    level: text(body?.level, 50),
    preferredTime: text(body?.preferred_time, 255),
    note: text(body?.note, 2000),
    callBackOn: callBack,
  };
};

const list = async (stage: string, centerId?: number, now?: Date) => {
  if (!STAGES.includes(stage)) return { error: 'invalid_stage' as const };
  const today = centerToday(now);
  const rows = await leadRepository.findOpen(stage, centerId);
  return rows.map((row: any) => ({ ...row, call_back_due: Boolean(row.call_back_on && row.call_back_on <= today) }));
};

const dueCount = (centerId?: number, now?: Date) => leadRepository.countDue(centerToday(now), centerId);

const create = async (body: any, centerId: number, createdByName: string | null) => {
  const fields: any = fieldsOf(body);
  if (fields.error) return fields;
  return { row: await leadRepository.insert({ ...fields, centerId, createdByName }) };
};

const update = async (leadId: number, body: any, centerId?: number) => {
  const fields: any = fieldsOf(body);
  if (fields.error) return fields;
  const row = await leadRepository.update(leadId, fields, centerId);
  return row ? { row } : { error: 'not_found' as const };
};

const close = async (leadId: number, body: any, centerId?: number) => {
  const outcome = String(body?.outcome || '');
  if (!OUTCOMES.includes(outcome)) return { error: 'invalid_outcome' as const };
  return (await leadRepository.close(leadId, outcome, text(body?.note, 2000), centerId)) ? { ok: true } : { error: 'not_found' as const };
};

module.exports = { list, dueCount, create, update, close, centerToday };
export {};
