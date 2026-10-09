const graduateService = require('../services/graduate.service');
const paymentService = require('../../payments/services/payment.service');
const { getCenterScope, sendError, sendScopeError } = require('../../../shared/controller');

const ERRORS: Record<string, [number, string]> = {
  title_required: [400, 'Sertifikat nomini kiriting (masalan, IELTS 6.5).'],
  invalid_size: [400, "Fayl bo'sh yoki 5 MB dan katta."],
  not_pdf: [400, "Faqat PDF fayl yuklash mumkin."],
  not_found: [404, 'Bitiruvchi topilmadi.'],
};
const idOf = (value: unknown) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const getGraduates = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    res.json(await graduateService.listGraduates(scope.centerId ?? undefined));
  } catch (error: any) {
    sendError(res, error, "Bitiruvchilarni yuklab bo'lmadi");
  }
};

const uploadCertificate = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    const studentId = idOf(req.params?.studentId);
    if (!studentId) return res.status(400).json({ error: "ID noto'g'ri." });
    const out = await graduateService.addCertificate(studentId, req.body, scope.centerId ?? undefined, await paymentService.resolveCashierName(req.user));
    const known = out?.error && ERRORS[out.error];
    if (known) return res.status(known[0]).json({ error: known[1] });
    res.status(201).json(out.row);
  } catch (error: any) {
    sendError(res, error, "Sertifikatni yuklab bo'lmadi");
  }
};

const downloadCertificate = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    const id = idOf(req.params?.id);
    const file = id ? await graduateService.getCertificateFile(id, scope.centerId ?? undefined) : null;
    if (!file) return res.status(404).json({ error: 'Sertifikat topilmadi.' });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.file_name)}`,
      'X-Content-Type-Options': 'nosniff',
    });
    res.send(file.file_data);
  } catch (error: any) {
    sendError(res, error, "Sertifikatni yuklab olib bo'lmadi");
  }
};

const removeCertificate = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    const id = idOf(req.params?.id);
    if (!id || !(await graduateService.deleteCertificate(id, scope.centerId ?? undefined))) return res.status(404).json({ error: 'Sertifikat topilmadi.' });
    res.json({ message: "Sertifikat o'chirildi" });
  } catch (error: any) {
    sendError(res, error, "Sertifikatni o'chirib bo'lmadi");
  }
};

module.exports = { getGraduates, uploadCertificate, downloadCertificate, removeCertificate };
export {};
