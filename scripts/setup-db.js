const { ensureDatabaseExists, getPool } = require("../db");
const { createAppContext } = require("../server/create-app-context");
const defaultSeed = require("../db/default-seed.json");
const { cloneSnapshotWithFreshIds } = require("../server/modules/pdf-templates/defaults");
const { insertVersionRow, replaceSnapshotRows } = require("../server/modules/pdf-templates/snapshot-store");

const DEFAULT_SCHOOL_CREATED_ACCOUNT = "default";

async function queryRows(connection, sql, params = []) {
  const [rows] = await connection.query(sql, params);

  return rows;
}

function getSeedSchool() {
  return defaultSeed.school;
}

function getSeedSchoolSettings() {
  return defaultSeed.schoolSettings;
}

function getSeedTemplate() {
  return defaultSeed.template;
}

async function resolveAvailableSchoolCode(connection, preferredCode, schoolId = "") {
  const preferredCodes = [preferredCode, "KOREA_DEFAULT"].filter(Boolean);

  for (const code of preferredCodes) {
    const rows = await queryRows(
      connection,
      schoolId
        ? "SELECT id FROM schools WHERE code = ? AND id <> ? LIMIT 1"
        : "SELECT id FROM schools WHERE code = ? LIMIT 1",
      schoolId ? [code, schoolId] : [code],
    );

    if (!rows.length) {
      return code;
    }
  }

  return `KOREA_${Date.now().toString(36).toUpperCase()}`.slice(0, 80);
}

async function ensureInitialDefaultSchool(connection) {
  const seedSchool = getSeedSchool();
  const rows = await queryRows(connection, "SELECT id FROM schools WHERE id = ? LIMIT 1", [seedSchool.id]);

  if (rows.length) {
    const schoolCode = await resolveAvailableSchoolCode(connection, seedSchool.code, seedSchool.id);

    await connection.query(
      `
        UPDATE schools
        SET
          code = ?,
          name = ?,
          description = ?,
          deletion_password_hash = ?,
          created_account = ?,
          deleted_at = NULL
        WHERE id = ?
      `,
      [
        schoolCode,
        seedSchool.name,
        seedSchool.description,
        seedSchool.deletionPasswordHash || "",
        seedSchool.createdAccount || DEFAULT_SCHOOL_CREATED_ACCOUNT,
        seedSchool.id,
      ],
    );
    return;
  }

  const schoolCode = await resolveAvailableSchoolCode(connection, seedSchool.code);

  await connection.query(
    `
      INSERT INTO schools (
        id,
        code,
        name,
        description,
        deletion_password_hash,
        created_account
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      seedSchool.id,
      schoolCode,
      seedSchool.name,
      seedSchool.description,
      seedSchool.deletionPasswordHash || "",
      seedSchool.createdAccount || DEFAULT_SCHOOL_CREATED_ACCOUNT,
    ],
  );
}

async function ensureInitialDefaultSchoolSettings(connection) {
  const seedSchool = getSeedSchool();
  const seedSettings = getSeedSchoolSettings();

  await connection.query(
    `
      INSERT INTO school_settings (
        id,
        school_id,
        school_name,
        academic_year,
        logo_data_url
      )
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        school_id = VALUES(school_id),
        school_name = VALUES(school_name),
        academic_year = VALUES(academic_year),
        logo_data_url = VALUES(logo_data_url),
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      seedSettings.id || "default",
      seedSettings.schoolId || seedSchool.id,
      seedSettings.schoolName || seedSchool.name,
      seedSettings.academicYear || "",
      seedSettings.logoDataUrl || "",
    ],
  );
}

async function resolveInitialTemplateId(connection) {
  const seedTemplate = getSeedTemplate();
  const rows = await queryRows(connection, "SELECT id FROM pdf_templates WHERE id = ? LIMIT 1", [seedTemplate.id]);

  return rows.length ? `template-default-${Date.now().toString(36)}` : seedTemplate.id;
}

function buildSeedTemplateSnapshot(templateId) {
  const seedTemplate = getSeedTemplate();
  const metadata = {
    description: seedTemplate.description,
    generationUnit: seedTemplate.generationUnit,
    name: seedTemplate.name,
    orientation: seedTemplate.orientation,
    paperPreset: seedTemplate.paperPreset,
  };

  if (templateId === seedTemplate.id) {
    const snapshot = JSON.parse(JSON.stringify(seedTemplate.layout));
    snapshot.id = templateId;

    return snapshot;
  }

  return cloneSnapshotWithFreshIds(seedTemplate.layout, metadata, templateId, {
    preserveLayoutSettings: true,
  });
}

async function ensureInitialDefaultTemplate(connection) {
  const seedSchool = getSeedSchool();
  const seedTemplate = getSeedTemplate();
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
    [seedSchool.id, seedTemplate.name],
  );

  if (existingTemplates.length) {
    console.log("Default template setup skipped. Existing template was found.");
    return;
  }

  const templateId = await resolveInitialTemplateId(connection);
  const snapshot = buildSeedTemplateSnapshot(templateId);

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
      seedSchool.id,
      seedTemplate.name,
      seedTemplate.description,
      seedTemplate.paperPreset,
      seedTemplate.orientation,
      seedTemplate.generationUnit,
      seedTemplate.isActive === false ? 0 : 1,
      seedTemplate.coverEnabled === false ? 0 : 1,
      seedTemplate.contentEnabled === false ? 0 : 1,
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
