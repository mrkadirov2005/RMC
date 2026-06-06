const rows = [
  {
    id: 'Refresh translations',
    english: 'Refresh translations',
    uzbek: 'Tarjimalarni yangilash',
  },
  {
    id: 'Translations refreshed',
    english: 'Translations refreshed',
    uzbek: 'Tarjimalar yangilandi',
  },
  {
    id: 'Could not refresh translations',
    english: 'Could not refresh translations',
    uzbek: 'Tarjimalarni yangilab bolmadi',
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
