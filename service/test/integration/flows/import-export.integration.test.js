describe('CSV import/export safety with PostgreSQL', () => {
  let pool;
  let service;
  let centerId;
  let otherCenterId;

  beforeAll(async () => {
    pool = require('../../../src/db/pool');
    await pool.query('TRUNCATE TABLE edu_centers, owners RESTART IDENTITY CASCADE');
    centerId = (await pool.query(`INSERT INTO edu_centers (center_name, center_code) VALUES ('Import Center', 'IMPORT-A') RETURNING center_id`)).rows[0].center_id;
    otherCenterId = (await pool.query(`INSERT INTO edu_centers (center_name, center_code) VALUES ('Other Import Center', 'IMPORT-B') RETURNING center_id`)).rows[0].center_id;
    service = require('../../../src/modules/import_export/services/import_export.service');
  });

  afterAll(async () => { if (pool) await pool.end(); });

  test('imports quoted student CSV into the authenticated center with hashed credentials', async () => {
    const csv = [
      'center_id,enrollment_number,first_name,last_name,username,password,email',
      `${centerId},CSV-1,"Ali, Junior",Vali,csv_student,secret12,csv@example.com`,
    ].join('\n');
    await expect(service.importEntity('students', csv, centerId)).resolves.toEqual({ created: 1, entity: 'students' });
    const row = (await pool.query(`SELECT center_id, first_name, password_hash FROM students WHERE enrollment_number='CSV-1'`)).rows[0];
    expect(row.center_id).toBe(centerId); expect(row.first_name).toBe('Ali, Junior');
    expect(row.password_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  test('rejects cross-center rows without partial creation', async () => {
    const before = Number((await pool.query('SELECT COUNT(*) count FROM students')).rows[0].count);
    const csv = `center_id,enrollment_number,first_name,last_name\n${otherCenterId},CSV-BAD,Bad,Center`;
    await expect(service.importEntity('students', csv, centerId)).resolves.toEqual({ error: 'invalid_center' });
    expect(Number((await pool.query('SELECT COUNT(*) count FROM students')).rows[0].count)).toBe(before);
  });

  test('exports scoped rows with stable headers and neutralized spreadsheet formulas', async () => {
    await pool.query(`UPDATE students SET first_name='=2+2' WHERE enrollment_number='CSV-1'`);
    const exported = await service.exportEntity('students', centerId);
    expect(exported.rows).toBe(1);
    expect(exported.csv.split('\n')[0]).toContain('student_id,center_id,enrollment_number');
    expect(exported.csv).toContain("'=2+2");
    const otherExport = await service.exportEntity('students', otherCenterId);
    expect(otherExport.rows).toBe(0);
  });
});
