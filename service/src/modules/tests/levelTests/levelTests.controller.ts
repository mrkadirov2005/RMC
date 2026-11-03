// The level-test library: which built-in English level tests a center has, and adding the rest.
const { requireTestCenterScope } = require('../controllers/testScope');
const levelTests = require('./englishLevels');

const listEnglishLevelTests = async (req: any, res: any) => {
  try {
    const centerId = requireTestCenterScope(req, res);
    if (centerId == null) return;
    res.json({ items: await levelTests.listEnglishLevelTests(Number(centerId)) });
  } catch (error: any) {
    console.error('Level tests error:', error);
    res.status(500).json({ error: "Daraja testlarini yuklab bo'lmadi" });
  }
};

const installEnglishLevelTests = async (req: any, res: any) => {
  try {
    const centerId = requireTestCenterScope(req, res);
    if (centerId == null) return;
    const out = await levelTests.installEnglishLevelTests({
      centerId: Number(centerId),
      createdBy: req.user?.id ?? null,
      createdByType: req.user?.userType ?? null,
    });
    res.status(out.created.length ? 201 : 200).json(out);
  } catch (error: any) {
    console.error('Level tests install error:', error);
    res.status(500).json({ error: "Daraja testlarini qo'shib bo'lmadi" });
  }
};

module.exports = { listEnglishLevelTests, installEnglishLevelTests };

export {};
