async function ensurePdfTemplateVersionColumns(connection, { ensureColumn }) {
  await ensureColumn(connection, {
    columnName: "latest_version_no",
    definition: "latest_version_no INT NOT NULL DEFAULT 1 COMMENT '최신 버전 번호' AFTER content_enabled",
    tableName: "pdf_templates",
  });

  // Older databases can lack the column even when the table already exists.
  // Recover version counters from retained snapshots without lowering a newer
  // counter or changing any template content. This also retries a partial upgrade.
  await connection.query(`
    UPDATE pdf_templates AS templates
    LEFT JOIN (
      SELECT template_id, MAX(version_no) AS max_version_no
      FROM pdf_template_versions
      GROUP BY template_id
    ) AS versions ON versions.template_id = templates.id
    SET templates.latest_version_no = GREATEST(1, COALESCE(versions.max_version_no, 1))
    WHERE templates.latest_version_no < GREATEST(1, COALESCE(versions.max_version_no, 1))
  `);
}

module.exports = { ensurePdfTemplateVersionColumns };
