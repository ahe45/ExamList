function stringList(...values) { return [...new Set(values.flatMap(value => Array.isArray(value) ? value : [value]).filter(value => typeof value === "string" && value))]; }
function getAuditSchoolReferences(entityId, metadata = {}) {
  return stringList(entityId, metadata.generationId, metadata.generationIds, metadata.batchId, metadata.batchIds,
    metadata.archiveId, metadata.archiveIds, metadata.sourceGenerationId, metadata.sourceGenerationIds,
    metadata.rerunSourceGenerationId, metadata.rerunSourceGenerationIds);
}
async function indexAuditLogSchools(query, auditId, entityId, metadata = {}) {
  const schools = new Set(stringList(metadata.schoolId, metadata.schoolIds));
  const relatedIds = getAuditSchoolReferences(entityId, metadata);
  if (relatedIds.length) {
    const rows = await query(`SELECT school_id AS schoolId FROM pdf_generation_histories WHERE id IN (?)
      UNION SELECT school_id FROM pdf_generation_batches WHERE id IN (?) OR archive_id IN (?)
      UNION SELECT scope.school_id FROM pdf_audit_log_schools scope
        JOIN pdf_audit_logs log ON log.id = scope.audit_id WHERE log.entity_id IN (?)`, [relatedIds, relatedIds, relatedIds, relatedIds]);
    for (const row of Array.isArray(rows) ? rows : []) if (row.schoolId) schools.add(row.schoolId);
  }
  if (schools.size) await query("INSERT IGNORE INTO pdf_audit_log_schools (audit_id, school_id) VALUES ?", [[...schools].map(schoolId => [auditId, schoolId])]);
}
module.exports = { indexAuditLogSchools, getAuditSchoolReferences, stringList };
