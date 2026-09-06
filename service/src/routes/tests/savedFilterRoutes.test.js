require('reflect-metadata');
const request = require('supertest');
const express = require('express');

const mockControllers = {
  getMyFilters: jest.fn((_req, res) => res.json([])),
  createFilter: jest.fn((_req, res) => res.status(201).json({ route: 'create' })),
  updateFilter: jest.fn((req, res) => res.json({ route: 'update', id: req.params.id })),
  deleteFilter: jest.fn((req, res) => res.json({ route: 'delete', id: req.params.id })),
};

jest.mock('../../modules/saved_filters', () => mockControllers);

const savedFilterRoutes = require('../savedFilterRoutes');

// RMC-051: PUT/DELETE now run validateParams(IdParamDto) before reaching the controller, so a
// non-numeric id is rejected with 400 rather than the old silent 404 from `Number(req.params.id)`
// (which turns a bad id into NaN and never matches any row).
describe('saved filter routes id-param validation (RMC-051)', () => {
  const app = express();
  app.use(express.json());
  app.use('/saved-filters', savedFilterRoutes);

  beforeEach(() => jest.clearAllMocks());

  it('rejects a non-numeric id on PUT with 400 before reaching the controller', async () => {
    const response = await request(app).put('/saved-filters/abc').send({ name: 'x' }).expect(400);

    expect(response.body.error).toBe('Validation failed');
    expect(response.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'id' })])
    );
    expect(mockControllers.updateFilter).not.toHaveBeenCalled();
  });

  it('rejects a non-numeric id on DELETE with 400 before reaching the controller', async () => {
    const response = await request(app).delete('/saved-filters/abc').expect(400);

    expect(response.body.error).toBe('Validation failed');
    expect(mockControllers.deleteFilter).not.toHaveBeenCalled();
  });

  it('rejects a zero/negative id on PUT with 400', async () => {
    await request(app).put('/saved-filters/0').send({ name: 'x' }).expect(400);
    expect(mockControllers.updateFilter).not.toHaveBeenCalled();
  });

  it('allows a valid numeric id through to the controller on PUT and DELETE', async () => {
    await request(app).put('/saved-filters/5').send({ name: 'x' }).expect(200);
    expect(mockControllers.updateFilter).toHaveBeenCalledTimes(1);

    await request(app).delete('/saved-filters/5').expect(200);
    expect(mockControllers.deleteFilter).toHaveBeenCalledTimes(1);
  });
});
