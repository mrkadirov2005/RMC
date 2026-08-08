jest.mock('../../repositories/import_export.repository', () => ({
  selectAllStudents: jest.fn(), selectAllTeachers: jest.fn(), selectAllClasses: jest.fn(), selectAllPayments: jest.fn(),
  selectAllRooms: jest.fn(), selectAllAssignments: jest.fn(), selectAllSubjects: jest.fn(),
  insertStudent: jest.fn(), findOrCreateClassIdByNameOrCode: jest.fn(), findTeacherIdByEmployeeId: jest.fn(),
}));
jest.mock('../../../../shared/tenantDb', () => ({ studentInCenter: jest.fn() }));
jest.mock('../../../../shared/password', () => ({ hashPassword: jest.fn((value) => `hash:${value}`) }));
const repository = require('../../repositories/import_export.repository');
const service = require('../import_export.service');

describe('import/export service', () => {
  beforeEach(() => jest.clearAllMocks());
  test('rejects unsupported entity names across local and Sheets operations', async () => {
    await expect(service.exportEntity('unsafe')).resolves.toEqual({ error: 'unsupported' });
    await expect(service.importEntity('unsafe', 'a,b\n1,2')).resolves.toEqual({ error: 'unsupported' });
    await expect(service.pushEntityToSheets('unsafe')).resolves.toEqual({ error: 'unsupported' });
    await expect(service.pullEntityFromSheets('unsafe')).resolves.toEqual({ error: 'unsupported' });
  });
  test('exports stable CSV headers and correctly escapes quotes, commas, and newlines', async () => {
    repository.selectAllStudents.mockResolvedValue([{ student_id: 1, first_name: 'A, "B"', last_name: 'Line\nTwo' }]);
    const result = await service.exportEntity('students', 2);
    expect(repository.selectAllStudents).toHaveBeenCalledWith(2);
    expect(result.rows).toBe(1);
    expect(result.csv.split('\n')[0]).toContain('student_id,center_id,enrollment_number');
    expect(result.csv).toContain('"A, ""B"""');
    expect(result.csv).toContain('"Line\nTwo"');
  });
  test('rejects cross-center rows before insert', async () => {
    const csv = 'center_id,enrollment_number,first_name,last_name\n99,E1,A,B';
    await expect(service.importEntity('students', csv, 2)).resolves.toEqual({ error: 'invalid_center' });
    expect(repository.insertStudent).not.toHaveBeenCalled();
  });
  test('parses quoted CSV and hashes imported student passwords', async () => {
    repository.insertStudent.mockResolvedValue({ student_id: 1 });
    const csv = 'center_id,enrollment_number,first_name,last_name,password\n2,E1,"A, Junior",B,secret';
    await expect(service.importEntity('students', csv, 2)).resolves.toEqual({ created: 1, entity: 'students' });
    const params = repository.insertStudent.mock.calls[0][0];
    expect(params[0]).toBe(2); expect(params[1]).toBe('E1'); expect(params[2]).toBe('A, Junior'); expect(params[5]).toBe('hash:secret');
  });
  test('reports missing Sheets configuration without network access', async () => {
    delete process.env.GOOGLE_APPS_SCRIPT_URL; delete process.env.APPS_SCRIPT_URL;
    repository.selectAllStudents.mockResolvedValue([]);
    await expect(service.pushEntityToSheets('students', 2)).resolves.toEqual({ error: 'missing_config' });
  });
  test('neutralizes spreadsheet formulas during CSV export', async () => {
    repository.selectAllStudents.mockResolvedValue([{ student_id: 1, first_name: '=HYPERLINK("https://bad")' }]);
    const result = await service.exportEntity('students', 2);
    expect(result.csv).toContain("'=HYPERLINK");
    expect(result.csv).not.toContain(',=HYPERLINK');
  });
});
