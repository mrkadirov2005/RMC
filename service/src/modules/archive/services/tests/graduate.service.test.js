jest.mock('../../repositories/graduate.repository', () => ({
  findGraduates: jest.fn(),
  findGraduateCenter: jest.fn(),
  insertCertificate: jest.fn(async (row) => ({ certificate_id: 1, title: row.title, file_size: row.data ? row.data.length : null })),
  findCertificateFile: jest.fn(),
  findGraduateStats: jest.fn(),
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
    // No file and no link.
    expect(await service.addCertificate(1, { title: 'x', data: '' }, 4, null)).toEqual({ error: 'file_or_link' });
    expect(await service.addCertificate(1, { title: 'x', link_url: 'drive.google.com/x' }, 4, null)).toEqual({ error: 'bad_link' });
    const big = Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(service.MAX_PDF_BYTES)]).toString('base64');
    expect(await service.addCertificate(1, { title: 'x', data: big }, 4, null)).toEqual({ error: 'invalid_size' });
    expect(await service.addCertificate(1, { title: ' ', data: pdf }, 4, null)).toEqual({ error: 'title_required' });
    repository.findGraduateCenter.mockResolvedValue(null);
    expect(await service.addCertificate(1, { title: 'x', data: pdf }, 4, null)).toEqual({ error: 'not_found' });
    expect(repository.insertCertificate).not.toHaveBeenCalled();
  });

  it('keeps a certificate link, an admission, or a thank-you screenshot, with the date received', async () => {
    repository.findGraduateCenter.mockResolvedValue(4);
    repository.insertCertificate.mockImplementation(async (row) => row);
    const viaLink = await service.addCertificate(1, { title: 'IELTS 7.0', link_url: 'https://drive.google.com/file/abc', received_on: '2026-09-14' }, 4, 'admin');
    expect(viaLink.row).toMatchObject({ kind: 'certificate', receivedOn: '2026-09-14', linkUrl: 'https://drive.google.com/file/abc', data: null, fileName: null });
    const admission = await service.addCertificate(1, { title: 'Westminster University', kind: 'admission', link_url: 'https://wiut.uz/letter' }, 4, 'admin');
    expect(admission.row.kind).toBe('admission');
    const pngBytes = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(10)]).toString('base64');
    const thanks = await service.addCertificate(1, { title: 'Thank you note', kind: 'thanks', data: `data:image/png;base64,${pngBytes}`, note: 'Wrote to the teacher' }, 4, 'admin');
    expect(thanks.row).toMatchObject({ kind: 'thanks', contentType: 'image/png', fileName: 'thanks.png', note: 'Wrote to the teacher' });
  });

  it('counts records by month, type and teacher, this year against last year', async () => {
    repository.findGraduateStats.mockResolvedValue([
      { year: 2026, month: 9, kind: 'certificate', title: 'IELTS 7.0', teacher_id: 1, teacher_name: 'Aziz' },
      { year: 2026, month: 9, kind: 'certificate', title: 'ielts 7.0 ', teacher_id: 1, teacher_name: 'Aziz' },
      { year: 2026, month: 10, kind: 'admission', title: 'WIUT', teacher_id: 2, teacher_name: 'Bobur' },
      { year: 2025, month: 9, kind: 'certificate', title: 'IELTS 6.5', teacher_id: 1, teacher_name: 'Aziz' },
    ]);
    const stats = await service.graduateStats({ year: '2026' }, 4);
    expect(repository.findGraduateStats).toHaveBeenCalledWith(2026, 4);
    expect(stats.totals).toEqual({ this_year: { certificate: 2, admission: 1, thanks: 0, total: 3 }, last_year: { certificate: 1, admission: 0, thanks: 0, total: 1 } });
    expect(stats.months[8]).toMatchObject({ month: 9, this_year: { total: 2 }, last_year: { total: 1 } });
    expect(stats.by_teacher.map((t) => [t.teacher_name, t.total])).toEqual([['Aziz', 2], ['Bobur', 1]]);
    expect(stats.top_titles[0]).toMatchObject({ title: 'IELTS 7.0', count: 2 });
  });
});
