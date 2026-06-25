const discountRepository = require('../repositories/discount.repository');
const { studentInCenter } = require('../../../shared/tenantDb');

const list = (query: { student_id?: string; center_id?: string; active?: string }, centerId?: number) => {
  const params: any[] = [];
  const conditions: string[] = [];
  const scopedCenterId = centerId ?? (query.center_id ? Number(query.center_id) : undefined);
  if (query.student_id) {
    params.push(query.student_id);
    conditions.push(`student_id = $${params.length}`);
  }
  if (scopedCenterId) {
    params.push(scopedCenterId);
    conditions.push(`center_id = $${params.length}`);
  }
  if (query.active !== undefined) {
    params.push(query.active === 'true');
    conditions.push(`active = $${params.length}`);
  }
  return discountRepository.findAllFiltered(conditions, params);
};

const getById = (id: number, centerId?: number) => discountRepository.findById(id, centerId);

const calculateDiscount = (originalAmount: number, valueType: string, value: number) => {
  const amount = Number(originalAmount || 0);
  const numericValue = Number(value || 0);
  const discountAmount =
    valueType === 'percent'
      ? Math.min(amount, Math.max(0, (amount * Math.min(numericValue, 100)) / 100))
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
  const calculated =
    original_price != null ? calculateDiscount(Number(original_price), valueType, Number(value || 0)) : null;
  return discountRepository
    .insert([
      student_id,
      scopedCenterId,
      valueType,
      kind,
      value,
      original_price ?? null,
      final_price ?? calculated?.finalAmount ?? null,
      reason || null,
      payment_period || null,
      start_date || null,
      end_date || null,
      active ?? true,
    ])
    .then((row: any) => ({ row }));
};

const update = (id: number, body: any, centerId?: number) => {
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
  return discountRepository.update(
    id,
    [
      value_type || discount_type,
      discount_kind,
      value,
      original_price,
      final_price,
      reason,
      payment_period,
      start_date,
      end_date,
      active,
    ],
    centerId
  );
};

const remove = (id: number, centerId?: number) => discountRepository.remove(id, centerId);

module.exports = { list, getById, getActiveSerialByStudent, calculateDiscount, create, update, remove };

export {};
