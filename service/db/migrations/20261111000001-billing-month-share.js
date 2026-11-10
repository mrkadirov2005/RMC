// The share of a month's group price a student record owes, by lessons: a month's price covers 12
// lessons. A whole month in the group costs the full price. A month the student joined or left
// partway through costs price / 12 for each of the group's lesson days (from its schedule) the
// student was in the group, at most 12. A group without lesson days in its schedule falls back to
// calendar days. Used by the To'lovlar summary, SMS and salary; ui/src/shared/billingPeriod.ts
// has the same rule.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION billing_month_share(p_section text, p_start date, p_end date, p_month date)
      RETURNS numeric
      LANGUAGE plpgsql
      STABLE
      AS $fn$
      DECLARE
        m_start date := date_trunc('month', p_month)::date;
        m_end date := (date_trunc('month', p_month) + interval '1 month' - interval '1 day')::date;
        f date;
        t date;
        lesson_days text[];
        lessons int;
      BEGIN
        f := GREATEST(m_start, COALESCE(p_start, m_start));
        t := LEAST(m_end, COALESCE(p_end, m_end));
        IF f > t THEN RETURN 0; END IF;
        IF f = m_start AND t = m_end THEN RETURN 1; END IF;
        BEGIN
          lesson_days := ARRAY(SELECT jsonb_array_elements_text(p_section::jsonb -> 'days'));
        EXCEPTION WHEN others THEN
          lesson_days := NULL;
        END;
        IF lesson_days IS NULL OR cardinality(lesson_days) = 0 THEN
          RETURN (t - f + 1)::numeric / (m_end - m_start + 1);
        END IF;
        SELECT count(*) INTO lessons
        FROM generate_series(f, t, interval '1 day') d
        WHERE to_char(d, 'FMDay') = ANY(lesson_days);
        RETURN LEAST(lessons, 12)::numeric / 12;
      END
      $fn$;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS billing_month_share(text, date, date, date);');
  },
};
