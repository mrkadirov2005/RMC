const request = require('supertest');
const express = require('express');

const mockControllers = {
  getAllSubjects: jest.fn((_req, res) => res.json([])),
  getSubjectById: jest.fn((_req, res) => res.json({ route: 'id' })),
  getSubjectsByClass: jest.fn((req, res) => res.json({ route: 'class', classId: req.params.classId })),
  createSubject: jest.fn(),
  updateSubject: jest.fn(),
  deleteSubject: jest.fn(),
};

jest.mock('../../modules/subjects/controllers/subject.controller', () => mockControllers);
jest.mock('../../middleware/auth', () => ({ requireAuth: (_req, _res, next) => next() }));

const subjectRoutes = require('../subjectRoutes');

describe('subject routes', () => {
  it('routes /class/:classId to the class-subject handler before /:id', async () => {
    const app = express();
    app.use('/subjects', subjectRoutes);

    const response = await request(app).get('/subjects/class/42').expect(200);

    expect(response.body).toEqual({ route: 'class', classId: '42' });
    expect(mockControllers.getSubjectsByClass).toHaveBeenCalledTimes(1);
    expect(mockControllers.getSubjectById).not.toHaveBeenCalled();
  });
});
