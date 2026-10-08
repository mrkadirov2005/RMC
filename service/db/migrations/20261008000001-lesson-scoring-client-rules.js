// The center's scoring rules (October 2026): attendance 40/30/20/0, and activity with a 40-point
// Stellar level for one student per lesson, then 30/20/10/5. Homework (20/15/10/5/0), the coin
// mapping and the stellar coin bonus are left as each center set them. Lessons already saved keep
// their scores.
const ATTENDANCE = [
  { label: 'On time', score: 40, symbol: '✓', fill: 100, tone: 'emerald' },
  { label: 'Late', score: 30, symbol: '◕', fill: 75, tone: 'amber' },
  { label: 'Excused', score: 20, symbol: '◐', fill: 50, tone: 'sky' },
  { label: 'Absent', score: 0, symbol: '○', fill: 0, tone: 'rose' },
];
const ACTIVITY = [
  { label: 'Stellar', score: 40, symbol: '🌟', fill: 100, tone: 'violet', stellar: true },
  { label: 'Very active', score: 30, symbol: '★', fill: 75, tone: 'emerald' },
  { label: 'Good', score: 20, symbol: '●', fill: 50, tone: 'sky' },
  { label: 'Little', score: 10, symbol: '◔', fill: 25, tone: 'amber' },
  { label: 'Barely noticeable', score: 5, symbol: '○', fill: 10, tone: 'rose' },
];

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE app_settings
       SET setting_value = jsonb_set(jsonb_set(setting_value::jsonb, '{attendance}', :attendance::jsonb), '{activity}', :activity::jsonb),
           updated_at = CURRENT_TIMESTAMP
       WHERE setting_key = 'lesson_scoring'`,
      { replacements: { attendance: JSON.stringify(ATTENDANCE), activity: JSON.stringify(ACTIVITY) } }
    );
  },

  async down() {
    // The previous values were edited per center in Settings; they are not restored.
  },
};
