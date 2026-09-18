const { randomUUID } = require("crypto");

const { flattenSnapshot } = require("./defaults");

async function replaceSnapshotRows(connection, templateId, snapshot) {
  const { elements, pages } = flattenSnapshot(snapshot);
  const pageColumns = ["id", "template_id", "page_type", "name", "sort_order", "enabled", "repeatable", "width_pt", "height_pt", "settings_json"];
  const elementColumns = ["id", "template_id", "page_id", "element_type", "name", "x_pt", "y_pt", "width_pt", "height_pt", "z_index", "locked", "visible", "config_json"];
  const pageRows = pages.map(page => [page.id, templateId, page.type, page.name, Number(page.sortOrder) || 0, page.enabled ? 1 : 0, page.repeatable ? 1 : 0, Number(page.widthPt) || 0, Number(page.heightPt) || 0, JSON.stringify(page.settings || {})]);
  const elementRows = elements.map(element => [element.id, templateId, element.pageId, element.type, element.name, Number(element.x) || 0, Number(element.y) || 0, Number(element.width) || 0, Number(element.height) || 0, Number(element.zIndex) || 0, element.locked ? 1 : 0, element.visible === false ? 0 : 1, JSON.stringify(element.config || {})]);
  function comparable(value, column) {
    if (column.endsWith("_json")) { try { return JSON.stringify(JSON.parse(value)); } catch {} }
    if (["sort_order", "enabled", "repeatable", "width_pt", "height_pt", "x_pt", "y_pt", "z_index", "locked", "visible"].includes(column)) return String(Number(value) || 0);
    return String(value ?? "");
  }
  async function upsertChanged(table, columns, values) {
    const [existing] = await connection.query(`SELECT ${columns.join(", ")} FROM ${table} WHERE template_id = ?`, [templateId]);
    const previous = new Map((Array.isArray(existing) ? existing : []).map(row => [row.id, row]));
    const newIds = values.filter(row => !previous.has(row[0])).map(row => row[0]);
    if (newIds.length) {
      const [conflicts] = await connection.query(`SELECT id FROM ${table} WHERE id IN (?) AND template_id <> ?`, [newIds, templateId]);
      if (conflicts.length) throw Object.assign(new Error("다른 양식에서 사용하는 개체 식별자가 포함되어 있습니다."), { statusCode: 400 });
    }
    const changed = values.filter(row => !previous.has(row[0]) || columns.some((column, index) => comparable(row[index], column) !== comparable(previous.get(row[0])[column], column)));
    for (let offset = 0; offset < changed.length; offset += 200) {
      await connection.query(`INSERT INTO ${table} (${columns.join(", ")}) VALUES ? ON DUPLICATE KEY UPDATE ${columns.slice(1).map(column => column + " = VALUES(" + column + ")").join(", ")}`, [changed.slice(offset, offset + 200)]);
    }
  }
  async function removeMissing(table, rows) {
    await connection.query(`DELETE FROM ${table} WHERE template_id = ?${rows.length ? " AND id NOT IN (?)" : ""}`, rows.length ? [templateId, rows.map(row => row[0])] : [templateId]);
  }
  await upsertChanged("pdf_template_pages", pageColumns, pageRows);
  await upsertChanged("pdf_template_elements", elementColumns, elementRows);
  await removeMissing("pdf_template_elements", elementRows);
  await removeMissing("pdf_template_pages", pageRows);
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
