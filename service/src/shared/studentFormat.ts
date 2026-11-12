export {};

// One standard way to write a student's school, class and phone, so filters and searches find
// them: admins type "7", "7 maktab" or "maktab 7" and it is stored as "7-Maktab"; a class "7" or
// "7 sinf" as "7-Sinf"; a phone as "+998901234567" (no spaces, so searches and the Telegram bot
// that compare phone numbers keep matching). College and university names, and any
// text that is not a plain school number, are kept as typed.

const clean = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, ' ');

/** "7", "7 maktab", "7-MAKTAB", "maktab 7", "№7 maktab" -> "7-Maktab" (schools only). */
const formatSchoolName = (value: unknown, studyPlaceType?: unknown) => {
  const text = clean(value);
  if (!text) return text;
  if (studyPlaceType && String(studyPlaceType) !== 'school') return text;
  const match = text.match(/^(?:№\s*)?(\d{1,4})\s*-?\s*(?:son(?:li)?\s*)?(?:maktab|maktabi|school)?\.?$/i)
    || text.match(/^(?:maktab|school)\s*(?:№\s*)?(\d{1,4})$/i);
  return match ? `${Number(match[1])}-Maktab` : text;
};

/** "7", "7 sinf", "7-SINF", "7-sinf" -> "7-Sinf"; for a college or university, "2" -> "2-kurs". */
const formatSchoolClass = (value: unknown, studyPlaceType?: unknown) => {
  const text = clean(value);
  if (!text) return text;
  const isSchool = !studyPlaceType || String(studyPlaceType) === 'school';
  const match = text.match(isSchool ? /^(\d{1,2})\s*-?\s*(?:sinf|class)?\.?$/i : /^(\d{1})\s*-?\s*(?:kurs|course)?\.?$/i);
  if (!match) return text;
  return isSchool ? `${Number(match[1])}-Sinf` : `${Number(match[1])}-kurs`;
};

/** Uzbek numbers -> "+998901234567"; anything that is not one is kept as typed. */
const formatUzPhone = (value: unknown) => {
  const text = clean(value);
  if (!text) return text;
  let digits = text.replace(/\D/g, '');
  // The form starts phone fields at "+998"; left like that, the field is empty.
  if (digits === '998') return '';
  if (digits.length === 9) digits = `998${digits}`;
  if (!(digits.length === 12 && digits.startsWith('998'))) return text;
  return `+${digits}`;
};

/** A copy of a student payload with school, class and phones in the standard form. */
const standardizeStudentPayload = <T extends Record<string, any>>(payload: T): T => {
  if (!payload || typeof payload !== 'object') return payload;
  const out: Record<string, any> = { ...payload };
  const type = payload.study_place_type;
  if (typeof payload.school_name === 'string') out.school_name = formatSchoolName(payload.school_name, type);
  if (typeof payload.school_class === 'string') out.school_class = formatSchoolClass(payload.school_class, type);
  if (typeof payload.phone === 'string') out.phone = formatUzPhone(payload.phone);
  if (typeof payload.parent_phone === 'string') out.parent_phone = formatUzPhone(payload.parent_phone);
  return out as T;
};

module.exports = { formatSchoolName, formatSchoolClass, formatUzPhone, standardizeStudentPayload };
