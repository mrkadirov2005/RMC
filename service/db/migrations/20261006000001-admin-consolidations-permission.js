module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- Consolidations used to show for every branch admin; it now needs VIEW_CONSOLIDATIONS like
      -- the other sidebar pages. Give it to the admins that exist today so nobody loses the page;
      -- the owner can take it away in the admin's permissions afterwards.
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
      SET permissions = to_jsonb((current.list || '["VIEW_CONSOLIDATIONS"]'::jsonb)::text)
      FROM current
      WHERE s.superuser_id = current.superuser_id
        AND jsonb_typeof(current.list) = 'array'
        AND NOT current.list ? 'VIEW_CONSOLIDATIONS';
    `);
  },

  async down() {
    // Leaves the permission in place: removing it could take the page away from admins the
    // owner deliberately gave it to after this migration ran.
  },
};
