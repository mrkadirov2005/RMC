const discountRepository = require('../repositories/discount.repository');
const { studentInCenter } = require('../../../shared/tenantDb');

const list = (query: { student_id?: string; center_id?: string; active?: string; discount_kind?: string }, centerId?: number) => {
  const scopedCenterId = centerId ?? (query.center_id ? Number(query.center_id) : undefined);
  return discountRepository.findAllFiltered({
    studentId: query.student_id ? Number(query.student_id) : undefined,
    centerId: scopedCenterId,
    active: query.active === undefined ? undefined : query.active === 'true',
    discountKind: query.discount_kind,
  });
};

const getById = (id: number, centerId?: number) => discountRepository.findById(id, centerId);

/** Why a permanent discount was given; the referrer's name is kept only for "relative". */
const REASON_CATEGORIES = ['poverty', 'relative', 'charity', 'other'];
const reasonFields = (body: any) => {
  if (body.reason_category === undefined && body.referrer_name === undefined) return { category: undefined, referrer: undefined };
  const category = REASON_CATEGORIES.includes(body.reason_category) ? body.reason_category : null;
  const referrer = category === 'relative' ? String(body.referrer_name || '').trim().slice(0, 200) : '';
  // '' (not null) so an update clears an old name: the repository keeps the old value for null.
  return { category: category ?? '', referrer };
};

const clampPercentValue = (value: number) => Math.min(100, Math.max(0, Number(value || 0)));

const calculateDiscount = (originalAmount: number, valueType: string, value: number) => {
  const amount = Number(originalAmount || 0);
  const numericValue = Number(value || 0);
  const discountAmount =
    valueType === 'percent'
      ? Math.min(amount, Math.max(0, (amount * clampPercentValue(numericValue)) / 100))
      : Math.min(amount, Math.max(0, numericValue));
  const finalAmount = Math.max(0, amount - discountAmount);
  return {
    originalAmount: amount,
    discountAmount,
    finalAmount,
  };
};

const getActiveSerialByStudent = (studentId: number, centerId?: number) =>
  discountRepository.findActiveSerialByStudent(studentId, centerId);

const getActiveByStudent = (studentId: number, centerId?: number, discountKind?: string) =>
  discountRepository.findActiveByStudent(studentId, centerId, discountKind);

// A one-month discount lasts one month from the day it was given: Oct 9 -> Nov 9, Jan 31 -> Feb 28
const monthlyEndDate = (from?: string | null) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(from || ''));
  const now = new Date();
  const year = match ? Number(match[1]) : now.getFullYear();
  const month = match ? Number(match[2]) : now.getMonth() + 1;
  const day = match ? Number(match[3]) : now.getDate();
  const next = new Date(year, month, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
};

const create = async (body: any, centerId?: number) => {
  const {
    student_id,
    center_id,
    discount_type,
    discount_kind,
    value_type,
    value,
    original_price,
    final_price,
    reason,
    payment_period,
    start_date,
    end_date,
    active,
  } = body;
  const scopedCenterId = centerId ?? center_id;
  if (!(await studentInCenter(Number(student_id), Number(scopedCenterId)))) {
    return { error: 'invalid_center' as const };
  }
  const valueType = value_type || discount_type || 'fixed';
  const kind = discount_kind || 'serial_discount';
  const storedValue = valueType === 'percent' ? clampPercentValue(Number(value || 0)) : value;
  const calculated =
    original_price != null ? calculateDiscount(Number(original_price), valueType, Number(storedValue || 0)) : null;
  return discountRepository
    .insert([
      student_id,
      scopedCenterId,
      valueType,
      kind,
      storedValue,
      original_price ?? null,
      final_price ?? calculated?.finalAmount ?? null,
      reason || null,
      payment_period || null,
      start_date || null,
      end_date || (kind === 'monthly_discount' ? monthlyEndDate(start_date) : null),
      active ?? true,
      reasonFields(body).category || null,
      reasonFields(body).referrer || null,
    ])
    .then((row: any) => ({ row }));
};

const update = async (id: number, body: any, centerId?: number, queryable?: any) => {
  const {
    discount_type,
    discount_kind,
    value_type,
    value,
    original_price,
    final_price,
    reason,
    payment_period,
    start_date,
    end_date,
    active,
  } = body;

  let storedValue = value;
  if (value !== undefined && value !== null) {
    const effectiveType = value_type || discount_type || (await discountRepository.findById(id, centerId))?.discount_type;
    if (effectiveType === 'percent') {
      storedValue = clampPercentValue(Number(value));
    }
  }

  return discountRepository.update(
    id,
    [
      value_type || discount_type,
      discount_kind,
      storedValue,
      original_price,
      final_price,
      reason,
      payment_period,
      start_date,
      end_date,
      active,
      reasonFields(body).category,
      reasonFields(body).referrer,
    ],
    centerId,
    queryable
  );
};

const remove = (id: number, centerId?: number) => discountRepository.remove(id, centerId);

module.exports = { list, getById, getActiveSerialByStudent, getActiveByStudent, calculateDiscount, monthlyEndDate, create, update, remove };

export {};
