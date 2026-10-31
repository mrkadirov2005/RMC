const mediaService = require('./media.service');
const storage = require('./mediaStorage');

const fail = (res: any, error: any, message: string) => {
  console.error('Media error:', error);
  res.status(500).json({ error: message });
};

// Where signed local URLs point. Set MEDIA_PUBLIC_BASE_URL behind a proxy; otherwise the request's host.
const baseUrlOf = (req: any) => String(process.env.MEDIA_PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
const ownerOf = (req: any) => ({ type: req.user.userType, id: Number(req.user.id) });

const mb = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;

// @MOB-055 POST /api/mobile/v1/media/uploads { purpose, content_type, size_bytes, file_name? }
const createUpload = async (req: any, res: any) => {
  try {
    const result = await mediaService.createUpload(ownerOf(req), req.body, baseUrlOf(req));
    const errors: Record<string, any> = {
      bad_purpose: { status: 400, error: "Fayl maqsadi noto'g'ri", code: 'BAD_PURPOSE' },
      bad_type: { status: 415, error: 'Bu turdagi fayl qabul qilinmaydi', code: 'BAD_TYPE', limits: result.limits },
      bad_size: { status: 400, error: "Fayl hajmi noto'g'ri", code: 'BAD_SIZE' },
      too_large: { status: 413, error: `Fayl juda katta (ko'pi bilan ${mb(result.max_bytes || 0)})`, code: 'TOO_LARGE', max_bytes: result.max_bytes },
      too_many: { status: 429, error: "Juda ko'p fayl yuklandi. Keyinroq urinib ko'ring.", code: 'TOO_MANY' },
    };
    const err = errors[result.kind];
    if (err) {
      const { status, ...body } = err;
      return res.status(status).json(body);
    }
    res.status(201).json({ media: result.media, upload: result.upload });
  } catch (error: any) {
    fail(res, error, "Yuklashni boshlab bo'lmadi");
  }
};

// @MOB-055 POST /api/mobile/v1/media/:id/complete
const completeUpload = async (req: any, res: any) => {
  try {
    const result = await mediaService.completeUpload(ownerOf(req), Number(req.params.id));
    if (result.kind === 'ok') return res.json(result.media);
    const errors: Record<string, any> = {
      not_found: { status: 404, error: 'Fayl topilmadi', code: 'NOT_FOUND' },
      missing: { status: 409, error: 'Fayl hali yuklanmagan', code: 'NOT_UPLOADED' },
      rejected: { status: 413, error: 'Fayl rad etildi: hajmi ruxsat etilganidan katta', code: 'REJECTED' },
    };
    const { status, ...body } = errors[result.kind];
    res.status(status).json(body);
  } catch (error: any) {
    fail(res, error, "Yuklashni tekshirib bo'lmadi");
  }
};

// @MOB-055 GET /api/mobile/v1/media/:id → a signed link valid for 5 minutes.
const download = async (req: any, res: any) => {
  try {
    const result = await mediaService.ownDownload(ownerOf(req), Number(req.params.id), baseUrlOf(req));
    if (!result) return res.status(404).json({ error: 'Fayl topilmadi' });
    res.json(result);
  } catch (error: any) {
    fail(res, error, "Faylni ochib bo'lmadi");
  }
};

// @MOB-055 Local storage only: PUT/GET /api/media-local/<key>?op&type&size&exp&sig. The signature is
// the permission; no token is needed, as with S3.
const localPut = async (req: any, res: any) => {
  try {
    if (storage.usesS3()) return res.status(404).end();
    const key = String(req.params[0] || '');
    const signed = storage.verifyLocal(key, req.query);
    if (!signed || signed.op !== 'put') return res.status(403).json({ error: 'Havola yaroqsiz yoki muddati tugagan' });
    const contentType = String(req.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (contentType !== signed.type) return res.status(403).json({ error: 'Fayl turi mos emas' });
    const body: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (body.length === 0 || body.length > Number(signed.size)) return res.status(413).json({ error: 'Fayl hajmi mos emas' });
    await storage.writeLocal(key, body);
    res.status(200).end();
  } catch (error: any) {
    fail(res, error, "Faylni saqlab bo'lmadi");
  }
};

const localGet = (req: any, res: any) => {
  if (storage.usesS3()) return res.status(404).end();
  const key = String(req.params[0] || '');
  const signed = storage.verifyLocal(key, req.query);
  if (!signed || signed.op !== 'get') return res.status(403).json({ error: 'Havola yaroqsiz yoki muddati tugagan' });
  res.setHeader('Content-Type', signed.type);
  res.setHeader('Cache-Control', 'private, max-age=60');
  res.sendFile(storage.localPath(key), (error: any) => {
    if (error && !res.headersSent) res.status(404).end();
  });
};

module.exports = { createUpload, completeUpload, download, localPut, localGet, baseUrlOf };

export {};
