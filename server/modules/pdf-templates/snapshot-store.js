const { randomUUID } = require("crypto");

const { flattenSnapshot } = require("./defaults");

async function replaceSnapshotRows(connection, templateId, snapshot) {
  const { elements, pages } = flattenSnapshot(snapshot);

  await connection.query(`DELETE FROM pdf_template_elements WHERE template_id = ?`, [templateId]);
  await connection.query(`DELETE FROM pdf_template_pages WHERE template_id = ?`, [templateId]);

  for (const page of pages) {
    await connection.query(
      `
        INSERT INTO pdf_template_pages (
          id,
          template_id,
          page_type,
          name,
          sort_order,
          enabled,
          repeatable,
          width_pt,
          height_pt,
          settings_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        page.id,
        templateId,
        page.type,
        page.name,
        Number(page.sortOrder) || 0,
        page.enabled ? 1 : 0,
        page.repeatable ? 1 : 0,
        Number(page.widthPt) || 0,
        Number(page.heightPt) || 0,
        JSON.stringify(page.settings || {}),
      ],
    );
  }

  for (const element of elements) {
    await connection.query(
      `
        INSERT INTO pdf_template_elements (
          id,
          template_id,
          page_id,
          element_type,
          name,
          x_pt,
          y_pt,
          width_pt,
          height_pt,
          z_index,
          locked,
          visible,
          config_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        element.id,
        templateId,
        element.pageId,
        element.type,
        element.name,
        Number(element.x) || 0,
        Number(element.y) || 0,
        Number(element.width) || 0,
        Number(element.height) || 0,
        Number(element.zIndex) || 0,
        element.locked ? 1 : 0,
        element.visible === false ? 0 : 1,
        JSON.stringify(element.config || {}),
      ],
    );
  }
}

async function insertVersionRow(connection, templateId, versionNo, snapshot, createdBy = "system") {
  await connection.query(
    `
      INSERT INTO pdf_template_versions (
        id,
        template_id,
        version_no,
        snapshot_json,
        created_by
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      `template-version-${randomUUID()}`,
      templateId,
      versionNo,
      JSON.stringify(snapshot),
      String(createdBy || "system"),
    ],
  );
}

module.exports = {
  insertVersionRow,
  replaceSnapshotRows,
};
