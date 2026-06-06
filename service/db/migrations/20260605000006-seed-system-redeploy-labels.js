const rows = [
  {
    id: 'Owner system settings',
    english: 'Owner system settings',
    uzbek: 'Ega tizim sozlamalari',
  },
  {
    id: 'Redeploy server',
    english: 'Redeploy server',
    uzbek: 'Serverni qayta joylash',
  },
  {
    id: 'Runs the configured redeploy script after confirming the password from the backend .env file.',
    english: 'Runs the configured redeploy script after confirming the password from the backend .env file.',
    uzbek: 'Backend .env faylidagi parol tasdiqlangandan keyin sozlangan redeploy skriptini ishga tushiradi.',
  },
  {
    id: 'Redeploy',
    english: 'Redeploy',
    uzbek: 'Qayta joylash',
  },
  {
    id: 'Confirm server redeploy',
    english: 'Confirm server redeploy',
    uzbek: 'Server redeployini tasdiqlash',
  },
  {
    id: 'Enter the redeploy password from',
    english: 'Enter the redeploy password from',
    uzbek: 'Redeploy parolini kiriting:',
  },
  {
    id: 'Redeploy password',
    english: 'Redeploy password',
    uzbek: 'Redeploy paroli',
  },
  {
    id: 'Redeploy password is required.',
    english: 'Redeploy password is required.',
    uzbek: 'Redeploy paroli majburiy.',
  },
  {
    id: 'Server redeploy started.',
    english: 'Server redeploy started.',
    uzbek: 'Server redeployi boshlandi.',
  },
  {
    id: 'Could not start server redeploy.',
    english: 'Could not start server redeploy.',
    uzbek: 'Server redeployini boshlab bolmadi.',
  },
  {
    id: 'Start redeploy',
    english: 'Start redeploy',
    uzbek: 'Redeployni boshlash',
  },
  {
    id: 'Starting...',
    english: 'Starting...',
    uzbek: 'Boshlanmoqda...',
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
