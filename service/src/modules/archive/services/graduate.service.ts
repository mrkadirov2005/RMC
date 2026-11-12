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

export type GraduateRecordKind = 'certificate' | 'admission' | 'thanks';
const KINDS: GraduateRecordKind[] = ['certificate', 'admission', 'thanks'];

// The file's real type from its first bytes: a PDF, or a PNG/JPEG screenshot (thank-you notes).
const fileTypeOf = (data: Buffer) => {
  if (data.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg';
  return null;
};

const isDay = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
const isLink = (value: string) => /^https?:\/\/\S+$/i.test(value);

/**
 * A graduate's record: a certificate (IELTS 7.0), a university admission or a thank-you note,
 * with the date it was received and a PDF/screenshot sent as base64, a link, or both. The file is
 * checked by its signature, not its name.
 */
const addCertificate = async (studentId: number, body: any, centerId: number | undefined, uploadedByName: string | null) => {
  const title = String(body?.title || '').trim().slice(0, 255);
  if (!title) return { error: 'title_required' as const };
  const kind: GraduateRecordKind = KINDS.includes(body?.kind) ? body.kind : 'certificate';
  const receivedOn = isDay(body?.received_on) ? String(body.received_on) : new Date().toISOString().slice(0, 10);
  const linkUrl = String(body?.link_url || '').trim().slice(0, 2000) || null;
  if (linkUrl && !isLink(linkUrl)) return { error: 'bad_link' as const };
  const note = String(body?.note || '').trim().slice(0, 2000) || null;

  let data: Buffer | null = null;
  let contentType: string | null = null;
  if (body?.data) {
    data = Buffer.from(String(body.data).replace(/^data:[^;]+;base64,/, ''), 'base64');
    if (data.length === 0 || data.length > MAX_PDF_BYTES) return { error: 'invalid_size' as const };
    contentType = fileTypeOf(data);
    if (!contentType) return { error: 'not_pdf' as const };
  }
  if (!data && !linkUrl) return { error: 'file_or_link' as const };
  const extension = contentType === 'image/png' ? '.png' : contentType === 'image/jpeg' ? '.jpg' : '.pdf';
  const fileName = data ? String(body?.file_name || `${kind}${extension}`).replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 255) : null;

  const studentCenter = await graduateRepository.findGraduateCenter(studentId, centerId);
  if (!studentCenter) return { error: 'not_found' as const };
  return {
    row: await graduateRepository.insertCertificate({
      centerId: Number(studentCenter), studentId, title, kind, receivedOn, linkUrl, note, fileName, data, contentType, uploadedByName,
    }),
  };
};

/**
 * The year's graduate records against the year before: per month and type, per teacher, and the
 * most common titles (which certificates and universities). Graduates never count as active
 * students; this is statistics only.
 */
const graduateStats = async (query: any, centerId?: number, now = new Date()) => {
  const year = Number.isInteger(Number(query?.year)) && Number(query.year) > 2000 ? Number(query.year) : now.getFullYear();
  const rows = await graduateRepository.findGraduateStats(year, centerId);
  const empty = () => ({ certificate: 0, admission: 0, thanks: 0, total: 0 });
  const months = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, this_year: empty(), last_year: empty() }));
  const teachers = new Map<number, { teacher_id: number; teacher_name: string; certificate: number; admission: number; thanks: number; total: number }>();
  const titles = new Map<string, { title: string; kind: string; count: number }>();
  const totals = { this_year: empty(), last_year: empty() };
  rows.forEach((row: any) => {
    const kind = KINDS.includes(row.kind) ? row.kind as GraduateRecordKind : 'certificate';
    const side = Number(row.year) === year ? 'this_year' : 'last_year';
    const bucket = months[Number(row.month) - 1]?.[side];
    if (bucket) { bucket[kind] += 1; bucket.total += 1; }
    totals[side][kind] += 1;
    totals[side].total += 1;
    if (side !== 'this_year') return;
    if (row.teacher_id) {
      const id = Number(row.teacher_id);
      const entry = teachers.get(id) || { teacher_id: id, teacher_name: row.teacher_name || `#${id}`, certificate: 0, admission: 0, thanks: 0, total: 0 };
      entry[kind] += 1;
      entry.total += 1;
      teachers.set(id, entry);
    }
    const key = `${kind}|${String(row.title || '').trim().toLowerCase()}`;
    const title = titles.get(key) || { title: String(row.title || '').trim(), kind, count: 0 };
    title.count += 1;
    titles.set(key, title);
  });
  return {
    year,
    totals,
    months,
    by_teacher: Array.from(teachers.values()).sort((a, b) => b.total - a.total || a.teacher_name.localeCompare(b.teacher_name)),
    top_titles: Array.from(titles.values()).sort((a, b) => b.count - a.count || a.title.localeCompare(b.title)).slice(0, 20),
  };
};

const getCertificateFile = (certificateId: number, centerId?: number) => graduateRepository.findCertificateFile(certificateId, centerId);
const deleteCertificate = (certificateId: number, centerId?: number) => graduateRepository.softDeleteCertificate(certificateId, centerId);

module.exports = { graduateStats, listGraduates, addCertificate, getCertificateFile, deleteCertificate, monthsBetween, MAX_PDF_BYTES };
export {};
