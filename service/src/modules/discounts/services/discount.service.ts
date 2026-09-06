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
      end_date || null,
      active ?? true,
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
    ],
    centerId,
    queryable
  );
};

const remove = (id: number, centerId?: number) => discountRepository.remove(id, centerId);

module.exports = { list, getById, getActiveSerialByStudent, getActiveByStudent, calculateDiscount, create, update, remove };

export {};
