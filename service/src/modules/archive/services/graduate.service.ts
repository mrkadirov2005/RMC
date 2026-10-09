const graduateRepository = require('../repositories/graduate.repository');

const MAX_PDF_BYTES = 5 * 1024 * 1024;

/** Whole months between two YYYY-MM-DD dates (a started month counts once the day is reached). */
const monthsBetween = (from?: string | null, to?: string | null) => {
  if (!from || !to) return null;
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const months = (ty - fy) * 12 + (tm - fm) - (td < fd ? 1 : 0);
  return Math.max(0, months);
};

const listGraduates = async (centerId?: number) =>
  (await graduateRepository.findGraduates(centerId)).map((row: any) => ({ ...row, months_studied: monthsBetween(row.studied_from, row.finished_on) }));

/** A PDF certificate sent as base64; checked by its signature, not its name. */
const addCertificate = async (studentId: number, body: any, centerId: number | undefined, uploadedByName: string | null) => {
  const title = String(body?.title || '').trim().slice(0, 255);
  const fileName = String(body?.file_name || 'certificate.pdf').replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 255);
  if (!title) return { error: 'title_required' as const };
  const base64 = String(body?.data || '').replace(/^data:application\/pdf;base64,/, '');
  const data = Buffer.from(base64, 'base64');
  if (data.length === 0 || data.length > MAX_PDF_BYTES) return { error: 'invalid_size' as const };
  if (data.subarray(0, 5).toString('latin1') !== '%PDF-') return { error: 'not_pdf' as const };
  const studentCenter = await graduateRepository.findGraduateCenter(studentId, centerId);
  if (!studentCenter) return { error: 'not_found' as const };
  return { row: await graduateRepository.insertCertificate({ centerId: Number(studentCenter), studentId, title, fileName, data, uploadedByName }) };
};

const getCertificateFile = (certificateId: number, centerId?: number) => graduateRepository.findCertificateFile(certificateId, centerId);
const deleteCertificate = (certificateId: number, centerId?: number) => graduateRepository.softDeleteCertificate(certificateId, centerId);

module.exports = { listGraduates, addCertificate, getCertificateFile, deleteCertificate, monthsBetween, MAX_PDF_BYTES };
export {};
