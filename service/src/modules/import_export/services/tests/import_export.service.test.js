jest.mock('../../repositories/import_export.repository', () => ({
  selectAllStudents: jest.fn(), selectAllTeachers: jest.fn(), selectAllClasses: jest.fn(), selectAllPayments: jest.fn(),
  selectAllRooms: jest.fn(), selectAllAssignments: jest.fn(), selectAllSubjects: jest.fn(),
  insertStudent: jest.fn(), findOrCreateClassIdByNameOrCode: jest.fn(), findTeacherIdByEmployeeId: jest.fn(),
  withTransaction: jest.fn((callback) => callback({})),
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

  // RMC-049: rows are chunked into batches of 500 (IMPORT_BATCH_SIZE in import_export.service.ts),
  // each wrapped in its own importExportRepository.withTransaction call. A row-level failure that
  // is NOT a business-validation error (invalid_center/missing_student, which still fail the whole
  // import fast) should only roll back its own batch: earlier, already-committed batches keep their
  // created count, and later batches still get attempted.
  describe('batched import isolation', () => {
    const buildCsv = (count, failAtIndex) => {
      const lines = ['enrollment_number,first_name,last_name'];
      for (let i = 0; i < count; i += 1) {
        const enrollment = i === failAtIndex ? 'FAIL' : `E${i}`;
        lines.push(`${enrollment},First${i},Last${i}`);
      }
      return lines.join('\n');
    };

    test('a mid-import batch failure rolls back only that batch; earlier batches stay committed and later batches still run', async () => {
      repository.insertStudent.mockImplementation((params) => {
        if (params[1] === 'FAIL') return Promise.reject(new Error('boom'));
        return Promise.resolve({ student_id: 1 });
      });

      // 1005 rows => batch1 rows[0..499] (500), batch2 rows[500..999] (500), batch3 rows[1000..1004] (5).
      // The failing row is the very first row of batch2, so batch2 contributes 0 created rows.
      const csv = buildCsv(1005, 500);

      const result = await service.importEntity('students', csv);

      expect(result.created).toBe(505); // 500 (batch1) + 0 (batch2 rolled back) + 5 (batch3)
      expect(result.batches).toHaveLength(3);
      expect(result.batches[0]).toMatchObject({ batch: 1, rows: 500, created: 500, status: 'ok' });
      expect(result.batches[1]).toMatchObject({ batch: 2, rows: 500, created: 0, status: 'failed' });
      expect(result.batches[1].error).toContain('boom');
      expect(result.batches[2]).toMatchObject({ batch: 3, rows: 5, created: 5, status: 'ok' });

      // batch1's 500 rows were actually attempted/committed, and batch3's 5 rows were still
      // attempted after batch2 failed -- only the single failing row in batch2 is missing.
      expect(repository.insertStudent).toHaveBeenCalledTimes(506);
    });

    test('a business-validation error (invalid_center) still aborts the whole import immediately, not just its batch', async () => {
      repository.insertStudent.mockResolvedValue({ student_id: 1 });
      const lines = ['center_id,enrollment_number,first_name,last_name'];
      for (let i = 0; i < 600; i += 1) {
        // second batch's first row belongs to a different center than the caller's scope
        const centerId = i === 500 ? 99 : 2;
        lines.push(`${centerId},E${i},First${i},Last${i}`);
      }
      const csv = lines.join('\n');

      const result = await service.importEntity('students', csv, 2);

      expect(result).toEqual({ error: 'invalid_center' });
      // batch1 already inserted 500 rows before the fail-fast error in batch2 -- this
      // pre-existing fail-fast contract for business-validation errors is unchanged by RMC-049's
      // batching, only the transaction-scope of unexpected/unhandled errors changed.
      expect(repository.insertStudent).toHaveBeenCalledTimes(500);
    });
  });

  // RMC-049: the Apps Script fetch call now has an AbortController-based ~20s timeout instead of
  // hanging forever.
  describe('Apps Script fetch timeout', () => {
    afterEach(() => {
      jest.useRealTimers();
      delete global.fetch;
      delete process.env.GOOGLE_APPS_SCRIPT_URL;
      delete process.env.APPS_SCRIPT_URL;
    });

    test('aborts a hung Apps Script fetch after ~20s and reports a timeout error instead of hanging forever', async () => {
      process.env.GOOGLE_APPS_SCRIPT_URL = 'https://script.example/exec';
      repository.selectAllStudents.mockResolvedValue([]);

      jest.useFakeTimers();
      global.fetch = jest.fn((_url, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      }));

      const resultPromise = service.pushEntityToSheets('students', 2);
      await jest.advanceTimersByTimeAsync(20000);
      const result = await resultPromise;

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ error: 'apps_script_timeout', details: expect.stringContaining('20000') });
    });
  });
});
