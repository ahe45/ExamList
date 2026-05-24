const { ensureDatabaseExists, getPool } = require("../db");
const { createAppContext } = require("../server/create-app-context");
const { buildBlankTemplateSnapshot } = require("../server/modules/pdf-templates/defaults");
const { insertVersionRow, replaceSnapshotRows } = require("../server/modules/pdf-templates/snapshot-store");
const { defaultSchoolId } = require("../server/modules/schools/validators");

const initialDefaultSchool = Object.freeze({
  code: "KOREA",
  description: "",
  id: defaultSchoolId,
  name: "한국대학교",
});

const initialDefaultTemplate = Object.freeze({
  description: "한국대학교 기본 양식",
  generationUnit: "roomCode",
  id: "template-default",
  name: "기본 템플릿",
  orientation: "portrait",
  paperPreset: "A4",
});

async function queryRows(connection, sql, params = []) {
  const [rows] = await connection.query(sql, params);

  return rows;
}

async function resolveAvailableSchoolCode(connection, preferredCode) {
  const preferredCodes = [preferredCode, "KOREA_DEFAULT"];

  for (const code of preferredCodes) {
    const rows = await queryRows(connection, "SELECT id FROM schools WHERE code = ? LIMIT 1", [code]);

    if (!rows.length) {
      return code;
    }
  }

  return `KOREA_${Date.now().toString(36).toUpperCase()}`.slice(0, 80);
}

async function ensureInitialDefaultSchool(connection) {
  const rows = await queryRows(connection, "SELECT id FROM schools WHERE id = ? LIMIT 1", [initialDefaultSchool.id]);

  if (rows.length) {
    await connection.query(
      `
        UPDATE schools
        SET
          name = ?,
          description = ?,
          is_active = 1,
          deleted_at = NULL
        WHERE id = ?
      `,
      [initialDefaultSchool.name, initialDefaultSchool.description, initialDefaultSchool.id],
    );
    return;
  }

  const schoolCode = await resolveAvailableSchoolCode(connection, initialDefaultSchool.code);

  await connection.query(
    `
      INSERT INTO schools (
        id,
        code,
        name,
        description,
        deletion_password_hash,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      initialDefaultSchool.id,
      schoolCode,
      initialDefaultSchool.name,
      initialDefaultSchool.description,
      "",
      1,
    ],
  );
}

async function ensureInitialDefaultSchoolSettings(connection) {
  await connection.query(
    `
      INSERT INTO school_settings (
        id,
        school_id,
        school_name
      )
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        school_id = VALUES(school_id),
        school_name = VALUES(school_name),
        updated_at = CURRENT_TIMESTAMP
    `,
    ["default", initialDefaultSchool.id, initialDefaultSchool.name],
  );
}

async function resolveInitialTemplateId(connection) {
  const rows = await queryRows(connection, "SELECT id FROM pdf_templates WHERE id = ? LIMIT 1", [initialDefaultTemplate.id]);

  return rows.length ? `template-default-${Date.now().toString(36)}` : initialDefaultTemplate.id;
}

async function ensureInitialDefaultTemplate(connection) {
  const existingTemplates = await queryRows(
    connection,
    `
      SELECT id
      FROM pdf_templates
      WHERE school_id = ?
        AND name = ?
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [initialDefaultSchool.id, initialDefaultTemplate.name],
  );

  if (existingTemplates.length) {
    console.log("Default template setup skipped. Existing template was found.");
    return;
  }

  const templateId = await resolveInitialTemplateId(connection);
  const snapshot = buildBlankTemplateSnapshot(initialDefaultTemplate, { templateId });

  await connection.query(
    `
      INSERT INTO pdf_templates (
        id,
        school_id,
        name,
        description,
        paper_preset,
        orientation,
        generation_unit,
        is_active,
        cover_enabled,
        content_enabled,
        latest_version_no,
        layout_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      templateId,
      initialDefaultSchool.id,
      initialDefaultTemplate.name,
      initialDefaultTemplate.description,
      initialDefaultTemplate.paperPreset,
      initialDefaultTemplate.orientation,
      initialDefaultTemplate.generationUnit,
      1,
      1,
      1,
      1,
      JSON.stringify(snapshot),
    ],
  );

  await replaceSnapshotRows(connection, templateId, snapshot);
  await insertVersionRow(connection, templateId, 1, snapshot, "system");

  console.log("Initial default school and template are ready: 한국대학교 / 기본 템플릿");
}

async function ensureInitialDefaultSchoolTemplate(pool = getPool()) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await ensureInitialDefaultSchool(connection);
    await ensureInitialDefaultSchoolSettings(connection);
    await ensureInitialDefaultTemplate(connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function ensureInitialSuperAdminAccount(appContext) {
  const accountList = await appContext.services.authService.listAccounts();

  if (accountList.total > 0) {
    console.log("Admin account setup skipped. Existing accounts were found.");
    return;
  }

  await appContext.services.authService.createAccount({
    password: "1234",
    role: "super_admin",
    userId: "admin",
    userName: "Admin",
  });

  console.log("Initial super administrator account is ready: admin / 1234");
}

async function run() {
  await ensureDatabaseExists();
  const appContext = createAppContext();

  try {
    await appContext.services.schemaBootstrapService.ensureSchema();
    await ensureInitialDefaultSchoolTemplate();
    await ensureInitialSuperAdminAccount(appContext);
    console.log("Database schema is ready.");
  } catch (error) {
    const translatedError = appContext.translateDatabaseError(error);
    console.error(translatedError.message);
    process.exitCode = 1;
  } finally {
    try {
      await getPool().end();
    } catch (_error) {
      // Ignore pool shutdown errors in setup scripts.
    }
  }
}

if (require.main === module) {
  run();
}

module.exports = {
  ensureInitialDefaultSchoolTemplate,
  ensureInitialSuperAdminAccount,
  run,
};
