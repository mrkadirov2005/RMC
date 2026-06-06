const rows = [
  {
    id: 'No tests assigned to this class.',
    english: 'No tests assigned to this class.',
    uzbek: 'Bu sinfga testlar biriktirilmagan.',
  },
  {
    id: 'Untitled test',
    english: 'Untitled test',
    uzbek: 'Nomsiz test',
  },
  {
    id: 'Mandatory',
    english: 'Mandatory',
    uzbek: 'Majburiy',
  },
  {
    id: 'Optional',
    english: 'Optional',
    uzbek: 'Ixtiyoriy',
  },
  {
    id: 'Open',
    english: 'Open',
    uzbek: 'Ochish',
  },
  {
    id: 'No duration',
    english: 'No duration',
    uzbek: 'Davomiylik yoq',
  },
  {
    id: 'pass',
    english: 'pass',
    uzbek: 'otish',
  },
];

module.exports = {
  async up(queryInterface) {
    const values = [];
    const placeholders = rows.map((row, index) => {
      const offset = index * 3;
      values.push(row.id, row.english, row.uzbek);
      return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
    });

    await queryInterface.sequelize.query(
      `
        INSERT INTO translations (id, english, uzbek)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (id)
        DO UPDATE SET english = EXCLUDED.english, uzbek = EXCLUDED.uzbek
      `,
      { bind: values }
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DELETE FROM translations WHERE id IN (:ids)',
      { replacements: { ids: rows.map((row) => row.id) } }
    );
  },
};
