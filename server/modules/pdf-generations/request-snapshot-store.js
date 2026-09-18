const { createHash } = require("node:crypto");
const { parseJsonColumn } = require("./filters");

function createRequestSnapshotStore(query) {
  const storedTemplates = new Map();
  async function compactRequestJson(value) {
    const request = parseJsonColumn(value, null);
    if (!request?.template?.layout?.pages) return value;
    const templateJson = JSON.stringify(request.template);
    const id = createHash("sha256").update(templateJson).digest("hex");
    if (!storedTemplates.has(id)) {
      const pending = query("INSERT IGNORE INTO pdf_request_templates (id, template_json) VALUES (?, ?)", [id, templateJson]);
      storedTemplates.set(id, pending);
      while (storedTemplates.size > 256) storedTemplates.delete(storedTemplates.keys().next().value);
    }
    try { await storedTemplates.get(id); } catch (error) { storedTemplates.delete(id); throw error; }
    return JSON.stringify({ ...request, templateSnapshotId: id, template: {
      ...request.template,
      layout: { generation: request.template.layout.generation },
    } });
  }
  async function hydrateRows(rows = []) {
    const requests = rows.map(row => parseJsonColumn(row.requestJson, null));
    const ids = [...new Set(requests.map(request => request?.templateSnapshotId).filter(Boolean))];
    if (!ids.length) return rows;
    const templates = await query("SELECT id, template_json AS templateJson FROM pdf_request_templates WHERE id IN (?)", [ids]);
    const byId = new Map(templates.map(row => [row.id, parseJsonColumn(row.templateJson, null)]));
    return rows.map((row, index) => {
      const request = requests[index];
      if (!request?.templateSnapshotId) return row;
      const template = byId.get(request.templateSnapshotId);
      if (!template) throw Object.assign(new Error("저장된 PDF 양식 스냅샷을 찾을 수 없습니다."), { errorCode: "PDF_SNAPSHOT_MISSING", statusCode: 500 });
      return { ...row, requestJson: JSON.stringify({ ...request, template }) };
    });
  }
  return { compactRequestJson, hydrateRows };
}
module.exports = { createRequestSnapshotStore };
