// The center's own list of why a student left (replacing the English seeds and the custom
// reasons admins typed in). Old reasons stay in the table, inactive, so past removals still
// show what was chosen. Two reasons need a note: the result reached, and which center.
const REASONS = [
  ['school_started', 'Maktab boshlanib qoldi, ulgurmayapti', false],
  ['too_many_subjects', 'Ikki-uch fandan qatnayapti, ulgurmaydi', false],
  ['finished_successfully', 'Muvaffaqiyatli tugatib natijaga erishdi', true],
  ['other_center', 'Boshqa markazga ketdi', true],
  ['disliked_teacher', 'Ustoz yoqmagani uchun ketdi', false],
  ['schedule_mismatch', 'Vaqti mos kelmagani uchun ketdi', false],
  ['transferred_teacher', 'Boshqa ustozga transfer', false],
  ['no_means', "Sharoiti bo'lmadi", false],
  ['parents_refused', 'Ota-onasi ruxsat bermadi', false],
  ['trial_only', 'Sinov darsiga kirib, boshqa kelmadi', false],
  ['absent_three_times', 'Darslarga sababsiz 3 marta qoldirgan', false],
  ['stranger', "Mutlaqo begona o'quvchi, hech kim tanimaydi", false],
  ['admin_mistake', 'Admin adashib kiritganligi uchun chiqarildi', false],
];

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE student_action_reasons
        ADD COLUMN IF NOT EXISTS sort_order INTEGER,
        ADD COLUMN IF NOT EXISTS needs_note BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS delete_reason_note TEXT;
      UPDATE student_action_reasons SET active = false WHERE reason_type = 'delete';
    `);
    for (const [index, [code, name, needsNote]] of REASONS.entries()) {
      await queryInterface.sequelize.query(
        `INSERT INTO student_action_reasons (reason_type, reason_code, reason_name, active, sort_order, needs_note, created_at)
         VALUES ('delete', :code, :name, true, :sortOrder, :needsNote, CURRENT_TIMESTAMP)
         ON CONFLICT (reason_type, reason_code)
         DO UPDATE SET reason_name = EXCLUDED.reason_name, active = true, sort_order = EXCLUDED.sort_order, needs_note = EXCLUDED.needs_note`,
        { replacements: { code, name, sortOrder: index + 1, needsNote } }
      );
    }
  },

  async down() {
    // Removals already record these reasons; they are left in place.
  },
};
