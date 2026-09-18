const test = require("node:test");
const assert = require("node:assert/strict");
const { replaceSnapshotRows } = require("./snapshot-store");
test("snapshot persistence only writes changed rows and rejects foreign template identifiers", async () => {
  const tables = new Map([["pdf_template_pages", new Map()], ["pdf_template_elements", new Map()]]);
  const writes = [];
  const connection = { query: async (sql, params) => {
    const name = sql.includes("pdf_template_elements") ? "pdf_template_elements" : "pdf_template_pages";
    const table = tables.get(name);
    if (sql.startsWith("SELECT")) return [[...table.values()].filter(row => sql.includes("template_id <>") ? params[0].includes(row.id) && row.template_id !== params[1] : row.template_id === params[0])];
    if (sql.startsWith("INSERT")) {
      const columns = sql.slice(sql.indexOf("(") + 1, sql.indexOf(")")).split(", ");
      for (const row of params[0]) { table.set(row[0], Object.fromEntries(columns.map((key, i) => [key, row[i]]))); writes.push(row[0]); }
    }
    if (sql.startsWith("DELETE")) for (const [id, row] of table) if (row.template_id === params[0] && !params[1]?.includes(id)) table.delete(id);
    return [{ affectedRows: 1 }];
  } };
  const snapshot = { pages: [{ id: "page", type: "content", name: "page", elements: [{ id: "element", type: "text", config: { text: "original" } }] }] };
  await replaceSnapshotRows(connection, "template", snapshot);
  assert.deepEqual(writes, ["page", "element"]);
  writes.length = 0;
  await replaceSnapshotRows(connection, "template", snapshot); assert.equal(writes.length, 0);
  snapshot.pages[0].elements[0].config.text = "changed";
  await replaceSnapshotRows(connection, "template", snapshot); assert.deepEqual(writes, ["element"]);
  await assert.rejects(replaceSnapshotRows(connection, "other-template", snapshot), { statusCode: 400 });
  assert.equal(tables.get("pdf_template_pages").get("page").template_id, "template");
  snapshot.pages[0].elements = []; await replaceSnapshotRows(connection, "template", snapshot);
  assert.equal(tables.get("pdf_template_elements").size, 0); assert.equal(tables.get("pdf_template_pages").size, 1);
});
