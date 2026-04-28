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

const create = async (body: any, centerId?: number) => {
  const { student_id, center_id, discount_type, value, reason, start_date, end_date, active } = body;
  const scopedCenterId = centerId ?? center_id;
  if (!(await studentInCenter(Number(student_id), Number(scopedCenterId)))) {
    return { error: 'invalid_center' as const };
  }
  return discountRepository
    .insert([
      student_id,
      scopedCenterId,
      discount_type,
      value,
      reason || null,
      start_date || null,
      end_date || null,
      active ?? true,
    ])
    .then((row: any) => ({ row }));
};

const update = (id: number, body: any, centerId?: number) => {
  const { discount_type, value, reason, start_date, end_date, active } = body;
  return discountRepository.update(id, [discount_type, value, reason, start_date, end_date, active], centerId);
};

const remove = (id: number, centerId?: number) => discountRepository.remove(id, centerId);

module.exports = { list, getById, create, update, remove };

export {};
