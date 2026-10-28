module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- The dashboard's daily payments chart now needs DASHBOARD_PAYMENTS_CHART, a switch under
      -- the Dashboard page in the admin's permissions. Give it to the admins that can open the
      -- dashboard today so nobody loses the chart; the owner can untick it afterwards.
      --
      -- permissions is jsonb holding the list as a JSON string (the service stores
      -- JSON.stringify(list)); older rows may hold a plain jsonb array. Both are read, and the
      -- string form is written back, as the service does.
      WITH current AS (
        SELECT superuser_id,
               CASE jsonb_typeof(permissions)
                 WHEN 'string' THEN (permissions #>> '{}')::jsonb
                 WHEN 'array' THEN permissions
                 ELSE '[]'::jsonb
               END AS list
        FROM superusers
        WHERE LOWER(COALESCE(role, '')) <> 'owner'
      )
      UPDATE superusers s
      SET permissions = to_jsonb((current.list || '["DASHBOARD_PAYMENTS_CHART"]'::jsonb)::text)
      FROM current
      WHERE s.superuser_id = current.superuser_id
        AND jsonb_typeof(current.list) = 'array'
        AND current.list ? 'VIEW_DASHBOARD'
        AND NOT current.list ? 'DASHBOARD_PAYMENTS_CHART';
    `);
  },

  async down() {
    // Leaves the permission in place: removing it could take the chart away from admins the
    // owner deliberately gave it to after this migration ran.
  },
};
