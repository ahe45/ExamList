const { getAuditSchoolReferences, stringList } = require("../pdf-generations/audit-school-index");
const { createRequestSnapshotStore } = require("../pdf-generations/request-snapshot-store");

async function ensurePerformanceSchema(connection) {
  const query = async (sql, params = []) => (await connection.query(sql, params))[0];
  await query(`CREATE TABLE IF NOT EXISTS pdf_request_templates (
    id CHAR(64) PRIMARY KEY, template_json LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await query(`CREATE TABLE IF NOT EXISTS pdf_audit_log_schools (
    audit_id VARCHAR(64) NOT NULL, school_id VARCHAR(64) NOT NULL,
    PRIMARY KEY (audit_id, school_id), KEY idx_audit_school (school_id, audit_id),
    CONSTRAINT fk_audit_school_log FOREIGN KEY (audit_id) REFERENCES pdf_audit_logs(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await query(`CREATE TABLE IF NOT EXISTS operation_jobs (
    id CHAR(36) PRIMARY KEY, owner_id VARCHAR(64) NOT NULL, school_id VARCHAR(64) NOT NULL DEFAULT '',
    kind VARCHAR(40) NOT NULL, status VARCHAR(16) NOT NULL, processed INT NOT NULL DEFAULT 0, total INT NOT NULL DEFAULT 0,
    result_json LONGTEXT NULL, error_message TEXT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_operation_owner (owner_id, created_at), KEY idx_operation_status (status, updated_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const store = createRequestSnapshotStore(query);
  for (const table of ["pdf_generation_histories", "pdf_generation_batches"]) {
    let cursor = "";
    while (true) {
      const rows = await query(`SELECT id, request_json AS requestJson FROM ${table} WHERE id > ? ORDER BY id LIMIT 100`, [cursor]);
      if (!rows.length) break;
      for (const row of rows) {
        const compact = await store.compactRequestJson(row.requestJson);
        if (compact !== row.requestJson) await query(`UPDATE ${table} SET request_json = ?, updated_at = updated_at WHERE id = ?`, [compact, row.id]);
      }
      cursor = rows[rows.length - 1].id;
    }
  }
  const entities = await query(`SELECT id, school_id AS schoolId FROM pdf_generation_histories
    UNION SELECT id, school_id FROM pdf_generation_batches
    UNION SELECT archive_id AS id, school_id FROM pdf_generation_batches WHERE archive_id <> ''`);
  const schoolByEntity = new Map();
  function associate(id, schools) { if (!id) return; schoolByEntity.set(id, [...new Set([...(schoolByEntity.get(id) || []), ...schools.filter(Boolean)])]); }
  for (const row of entities) associate(row.id, [row.schoolId]);
  const logs = await query("SELECT id, entity_id AS entityId, metadata_json AS metadataJson FROM pdf_audit_logs");
  for (const log of logs) {
    let metadata = {}; try { metadata = JSON.parse(log.metadataJson || '{}') || {}; } catch {}
    log.references = getAuditSchoolReferences(log.entityId, metadata);
    log.linkedSchools = stringList(metadata.schoolId, metadata.schoolIds);
    associate(log.entityId, log.linkedSchools);
  }
  // Propagate references regardless of audit creation order (including merged artifacts).
  let changed;
  do {
    changed = false;
    for (const log of logs) {
      const schools = stringList(log.linkedSchools, log.references.flatMap(id => schoolByEntity.get(id) || []));
      if (schools.length !== log.linkedSchools.length) { changed = true; log.linkedSchools = schools; associate(log.entityId, schools); }
    }
  } while (changed);
  const links = logs.flatMap(log => log.linkedSchools.map(schoolId => [log.id, schoolId]));
  for (let offset = 0; offset < links.length; offset += 500) {
    await query("INSERT IGNORE INTO pdf_audit_log_schools (audit_id, school_id) VALUES ?", [links.slice(offset, offset + 500)]);
  }
}
module.exports = { ensurePerformanceSchema };
