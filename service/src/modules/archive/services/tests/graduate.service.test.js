jest.mock('../../repositories/graduate.repository', () => ({
  findGraduates: jest.fn(),
  findGraduateCenter: jest.fn(),
  insertCertificate: jest.fn(async (row) => ({ certificate_id: 1, title: row.title, file_size: row.data.length })),
  findCertificateFile: jest.fn(),
  softDeleteCertificate: jest.fn(),
}));

const repository = require('../../repositories/graduate.repository');
const service = require('../graduate.service');

const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n').toString('base64');

describe('graduates', () => {
  beforeEach(() => jest.clearAllMocks());

  it('counts whole months studied', () => {
    expect(service.monthsBetween('2025-09-15', '2026-05-20')).toBe(8);
    expect(service.monthsBetween('2025-09-15', '2026-05-10')).toBe(7);
    expect(service.monthsBetween(null, '2026-05-10')).toBeNull();
  });

  it('adds the months to each graduate', async () => {
    repository.findGraduates.mockResolvedValue([{ student_id: 1, studied_from: '2025-01-10', finished_on: '2026-01-10' }]);
    expect((await service.listGraduates(4))[0].months_studied).toBe(12);
  });

  it('stores a PDF for a graduate of the branch, under a safe file name', async () => {
    repository.findGraduateCenter.mockResolvedValue(4);
    const out = await service.addCertificate(1, { title: ' IELTS 6.5 ', file_name: '../../etc/pass?.pdf', data: `data:application/pdf;base64,${pdf}` }, 4, 'Admin');
    expect(out.row.certificate_id).toBe(1);
    const saved = repository.insertCertificate.mock.calls[0][0];
    expect(saved).toMatchObject({ centerId: 4, studentId: 1, title: 'IELTS 6.5', uploadedByName: 'Admin' });
    expect(saved.fileName).not.toMatch(/[/?]/);
    expect(saved.data.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('refuses non-PDF files, empty or oversized files, a missing title and non-graduates', async () => {
    repository.findGraduateCenter.mockResolvedValue(4);
    const png = Buffer.from('\x89PNG....').toString('base64');
    expect(await service.addCertificate(1, { title: 'x', data: png }, 4, null)).toEqual({ error: 'not_pdf' });
    expect(await service.addCertificate(1, { title: 'x', data: '' }, 4, null)).toEqual({ error: 'invalid_size' });
    const big = Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(service.MAX_PDF_BYTES)]).toString('base64');
    expect(await service.addCertificate(1, { title: 'x', data: big }, 4, null)).toEqual({ error: 'invalid_size' });
    expect(await service.addCertificate(1, { title: ' ', data: pdf }, 4, null)).toEqual({ error: 'title_required' });
    repository.findGraduateCenter.mockResolvedValue(null);
    expect(await service.addCertificate(1, { title: 'x', data: pdf }, 4, null)).toEqual({ error: 'not_found' });
    expect(repository.insertCertificate).not.toHaveBeenCalled();
  });
});
