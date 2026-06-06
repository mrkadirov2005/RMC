const rows = [
  {
    id: 'Edit mode on',
    english: 'Edit mode on',
    uzbek: 'Tahrirlash rejimi yoqilgan',
  },
  {
    id: 'Edit translations',
    english: 'Edit translations',
    uzbek: 'Tarjimalarni tahrirlash',
  },
  {
    id: 'Click a label, button, heading, table header, or placeholder to edit its translation.',
    english: 'Click a label, button, heading, table header, or placeholder to edit its translation.',
    uzbek: 'Tarjimasini tahrirlash uchun label, tugma, sarlavha, jadval sarlavhasi yoki placeholder ustiga bosing.',
  },
  {
    id: 'Edit translation',
    english: 'Edit translation',
    uzbek: 'Tarjimani tahrirlash',
  },
  {
    id: 'Visible text',
    english: 'Visible text',
    uzbek: 'Korinadigan matn',
  },
  {
    id: 'placeholder text',
    english: 'placeholder text',
    uzbek: 'Placeholder matni',
  },
  {
    id: 'aria-label text',
    english: 'aria-label text',
    uzbek: 'Aria-label matni',
  },
  {
    id: 'title text',
    english: 'title text',
    uzbek: 'Title matni',
  },
  {
    id: 'Editing:',
    english: 'Editing:',
    uzbek: 'Tahrirlanmoqda:',
  },
  {
    id: 'ID / key',
    english: 'ID / key',
    uzbek: 'ID / kalit',
  },
  {
    id: 'Save translation',
    english: 'Save translation',
    uzbek: 'Tarjimani saqlash',
  },
  {
    id: 'Translation saved',
    english: 'Translation saved',
    uzbek: 'Tarjima saqlandi',
  },
  {
    id: 'Translation id is required',
    english: 'Translation id is required',
    uzbek: 'Tarjima ID si majburiy',
  },
  {
    id: 'Could not save translation',
    english: 'Could not save translation',
    uzbek: 'Tarjimani saqlab bolmadi',
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
