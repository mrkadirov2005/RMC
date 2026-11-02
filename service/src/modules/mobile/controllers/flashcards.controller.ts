const flashcardsService = require('../services/flashcards.service');

const fail = (res: any, error: any, message: string) => {
  console.error('Flashcards error:', error);
  res.status(500).json({ error: message });
};

// @MOB-145 GET /student/flashcards: today's cards and progress.
const session = async (req: any, res: any) => {
  try {
    res.json(await flashcardsService.session(Number(req.user.id)));
  } catch (error: any) {
    fail(res, error, "Kartochkalarni yuklab bo'lmadi");
  }
};

// @MOB-145 POST /student/flashcards/:wordId/review { grade: again | hard | good | easy }
const review = async (req: any, res: any) => {
  try {
    const wordId = Number(req.params.wordId);
    if (!Number.isInteger(wordId) || wordId < 1) return res.status(400).json({ error: "So'z noto'g'ri" });
    const result = await flashcardsService.review(Number(req.user.id), wordId, String(req.body?.grade || ''));
    if (result.kind === 'invalid') return res.status(400).json({ error: "Javob noto'g'ri", code: 'INVALID_GRADE' });
    if (result.kind === 'not_found') return res.status(404).json({ error: "So'z topilmadi" });
    res.json(result.review);
  } catch (error: any) {
    fail(res, error, "Javobni saqlab bo'lmadi");
  }
};

module.exports = { session, review };

export {};
