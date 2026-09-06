// RMC-070/RMC-005/RMC-037: debts create/update previously had no DTO validation at
// all, so negative debt_amount/amount_paid (and over-payment producing negative
// balances) were accepted. CreateDebtDto/UpdateDebtDto now enforce @IsNumber()/@Min(0)
// on both fields via validateBody(CreateDebtDto)/validateBody(UpdateDebtDto) on the
// debts routes.
require('reflect-metadata');
const { validateBody } = require('../../middleware/validation');
const { CreateDebtDto, UpdateDebtDto } = require('../debts.dto');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const runMiddleware = async (DtoClass, body) => {
  const req = { body };
  const res = createResponse();
  const next = jest.fn();
  await validateBody(DtoClass)(req, res, next);
  return { req, res, next };
};

describe('CreateDebtDto amount bounds (RMC-070)', () => {
  it('rejects a negative debt_amount', async () => {
    const { res, next } = await runMiddleware(CreateDebtDto, { student_id: 1, debt_amount: -100 });

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      details: expect.arrayContaining([expect.objectContaining({ field: 'debt_amount' })]),
    }));
  });

  it('rejects a negative amount_paid (which would otherwise let a debt be over-paid into a negative balance)', async () => {
    const { res, next } = await runMiddleware(CreateDebtDto, { student_id: 1, debt_amount: 100, amount_paid: -50 });

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      details: expect.arrayContaining([expect.objectContaining({ field: 'amount_paid' })]),
    }));
  });

  it('rejects a non-numeric (NaN) debt_amount', async () => {
    const { res, next } = await runMiddleware(CreateDebtDto, { student_id: 1, debt_amount: 'not-a-number' });

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('accepts a valid, non-negative create payload', async () => {
    const { req, res, next } = await runMiddleware(CreateDebtDto, { student_id: 1, center_id: 2, debt_amount: 1000, amount_paid: 250 });

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body.debt_amount).toBe(1000);
  });
});

describe('UpdateDebtDto amount bounds (RMC-070)', () => {
  it('rejects a negative debt_amount', async () => {
    const { res, next } = await runMiddleware(UpdateDebtDto, { debt_amount: -1 });

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects a negative amount_paid', async () => {
    const { res, next } = await runMiddleware(UpdateDebtDto, { amount_paid: -1 });

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects a non-numeric amount_paid', async () => {
    const { res, next } = await runMiddleware(UpdateDebtDto, { amount_paid: 'NaN' });

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('accepts a valid partial update payload', async () => {
    const { res, next } = await runMiddleware(UpdateDebtDto, { amount_paid: 500, remarks: 'Partial payment' });

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
