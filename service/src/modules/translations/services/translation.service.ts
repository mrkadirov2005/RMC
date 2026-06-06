const translationRepository = require('../repositories/translation.repository');

type TranslationInput = {
  id?: string;
  english?: string;
  uzbek?: string;
};

const normalizeText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const normalizeInput = (input: TranslationInput, fallbackId?: string) => {
  const id = normalizeText(input.id || fallbackId);
  if (!id) {
    throw new Error('Translation id is required');
  }
  return {
    id,
    english: normalizeText(input.english),
    uzbek: normalizeText(input.uzbek),
  };
};

const listTranslations = () => translationRepository.findAll();

const getTranslation = (id: string) => translationRepository.findById(id);

const saveTranslation = (id: string, data: TranslationInput) => {
  const row = normalizeInput(data, id);
  return translationRepository.upsert(row.id, row.english, row.uzbek);
};

const saveTranslations = (rows: TranslationInput[]) => {
  const normalizedRows = rows.map((row) => normalizeInput(row));
  return translationRepository.bulkUpsert(normalizedRows);
};

const deleteTranslation = (id: string) => translationRepository.remove(id);

module.exports = {
  listTranslations,
  getTranslation,
  saveTranslation,
  saveTranslations,
  deleteTranslation,
};

export {};
