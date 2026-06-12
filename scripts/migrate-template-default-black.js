const { getPool } = require("../db");

const PURE_BLACK = "#000000";
const LEGACY_DEFAULT_BLACK_PATTERNS = Object.freeze([
  /#152033\b/gi,
  /rgb\(\s*21\s*,\s*32\s*,\s*51\s*\)/gi,
  /rgba\(\s*21\s*,\s*32\s*,\s*51\s*,\s*(?:1|1\.0+)\s*\)/gi,
]);
const SEARCH_TERMS = Object.freeze(["%#152033%", "%rgb(21%", "%rgba(21%"]);
const TEMPLATE_TARGETS = Object.freeze([
  Object.freeze({
    column: "layout_json",
    idColumn: "id",
    label: "current template layouts",
    preserveUpdatedAt: true,
    table: "pdf_templates",
  }),
  Object.freeze({
    column: "snapshot_json",
    idColumn: "id",
    label: "template version snapshots",
    preserveUpdatedAt: false,
    table: "pdf_template_versions",
  }),
  Object.freeze({
    column: "settings_json",
    idColumn: "id",
    label: "flattened template page settings",
    preserveUpdatedAt: true,
    table: "pdf_template_pages",
  }),
  Object.freeze({
    column: "config_json",
    idColumn: "id",
    label: "flattened template element configs",
    preserveUpdatedAt: true,
    table: "pdf_template_elements",
  }),
]);
const GENERATION_HISTORY_TARGETS = Object.freeze([
  Object.freeze({
    column: "request_json",
    idColumn: "id",
    label: "PDF generation request snapshots",
    preserveUpdatedAt: true,
    table: "pdf_generation_histories",
  }),
  Object.freeze({
    column: "request_json",
    idColumn: "id",
    label: "PDF generation batch request snapshots",
    preserveUpdatedAt: true,
    table: "pdf_generation_batches",
  }),
]);

function quoteIdentifier(value) {
  return `\`${String(value || "").replaceAll("`", "``")}\``;
}

function extractRows(queryResult) {
  if (Array.isArray(queryResult?.[0])) {
    return queryResult[0];
  }

  return Array.isArray(queryResult) ? queryResult : [];
}

function normalizeLegacyDefaultBlackText(value) {
  let replacements = 0;
  let text = String(value ?? "");

  LEGACY_DEFAULT_BLACK_PATTERNS.forEach((pattern) => {
    text = text.replace(pattern, () => {
      replacements += 1;
      return PURE_BLACK;
    });
  });

  return {
    changed: replacements > 0,
    replacements,
    value: text,
  };
}

function buildTargetSelectSql(target) {
  const column = quoteIdentifier(target.column);
  const searchClause = SEARCH_TERMS.map(() => `${column} LIKE ?`).join(" OR ");

  return `
    SELECT
      ${quoteIdentifier(target.idColumn)} AS id,
      ${column} AS value
    FROM ${quoteIdentifier(target.table)}
    WHERE ${column} IS NOT NULL
      AND (${searchClause})
  `;
}

function buildTargetUpdateSql(target) {
  const assignments = [`${quoteIdentifier(target.column)} = ?`];

  if (target.preserveUpdatedAt) {
    assignments.push("updated_at = updated_at");
  }

  return `
    UPDATE ${quoteIdentifier(target.table)}
    SET ${assignments.join(", ")}
    WHERE ${quoteIdentifier(target.idColumn)} = ?
  `;
}

function createEmptyTargetSummary(target) {
  return {
    changedRows: 0,
    column: target.column,
    label: target.label,
    replacements: 0,
    scannedRows: 0,
    samples: [],
    table: target.table,
    updatedRows: 0,
  };
}

function getMigrationTargets(options = {}) {
  return options.includeGenerationHistory
    ? [...TEMPLATE_TARGETS, ...GENERATION_HISTORY_TARGETS]
    : [...TEMPLATE_TARGETS];
}

async function migrateTemplateDefaultBlack(connection, options = {}) {
  const apply = options.apply === true;
  const sampleLimit = Math.max(0, Number(options.sampleLimit) || 10);
  const targets = Array.isArray(options.targets) ? options.targets : getMigrationTargets(options);
  const summary = {
    apply,
    includeGenerationHistory: options.includeGenerationHistory === true,
    targets: [],
    totals: {
      changedRows: 0,
      replacements: 0,
      scannedRows: 0,
      updatedRows: 0,
    },
  };

  for (const target of targets) {
    const targetSummary = createEmptyTargetSummary(target);
    const rows = extractRows(await connection.query(buildTargetSelectSql(target), [...SEARCH_TERMS]));
    const updateSql = buildTargetUpdateSql(target);

    targetSummary.scannedRows = rows.length;

    for (const row of rows) {
      const normalized = normalizeLegacyDefaultBlackText(row.value);

      if (!normalized.changed) {
        continue;
      }

      targetSummary.changedRows += 1;
      targetSummary.replacements += normalized.replacements;

      if (targetSummary.samples.length < sampleLimit) {
        targetSummary.samples.push({
          id: String(row.id || ""),
          replacements: normalized.replacements,
        });
      }

      if (apply) {
        const updateResult = await connection.query(updateSql, [normalized.value, row.id]);
        const result = Array.isArray(updateResult) ? updateResult[0] : updateResult;

        targetSummary.updatedRows += Number(result?.affectedRows) || 0;
      }
    }

    summary.targets.push(targetSummary);
    summary.totals.scannedRows += targetSummary.scannedRows;
    summary.totals.changedRows += targetSummary.changedRows;
    summary.totals.replacements += targetSummary.replacements;
    summary.totals.updatedRows += targetSummary.updatedRows;
  }

  return summary;
}

function parseArgs(argv = []) {
  const options = {
    apply: false,
    includeGenerationHistory: false,
    sampleLimit: 10,
  };

  argv.forEach((arg) => {
    if (arg === "--apply" || arg === "--write") {
      options.apply = true;
      return;
    }

    if (arg === "--dry-run") {
      options.apply = false;
      return;
    }

    if (arg === "--include-generation-history") {
      options.includeGenerationHistory = true;
      return;
    }

    if (arg.startsWith("--sample-limit=")) {
      options.sampleLimit = Math.max(0, Number(arg.slice("--sample-limit=".length)) || 0);
      return;
    }

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      return;
    }

    throw new Error(`Unsupported argument: ${arg}`);
  });

  return options;
}

function printHelp() {
  console.log(`
Usage:
  node scripts/migrate-template-default-black.js [--dry-run]
  node scripts/migrate-template-default-black.js --apply

Options:
  --apply                       Write changes to the database. Default is dry-run.
  --dry-run                     Preview affected rows without writing.
  --include-generation-history  Also rewrite stored PDF generation request snapshots.
  --sample-limit=N              Number of changed row ids to print per target. Default: 10.
`);
}

function printSummary(summary) {
  console.log(`Template default black migration (${summary.apply ? "apply" : "dry-run"})`);
  console.log(`Generation history included: ${summary.includeGenerationHistory ? "yes" : "no"}`);
  console.log(
    `Totals: scanned ${summary.totals.scannedRows}, changed ${summary.totals.changedRows}, replacements ${summary.totals.replacements}, updated ${summary.totals.updatedRows}`,
  );

  summary.targets.forEach((target) => {
    console.log(
      `- ${target.table}.${target.column}: scanned ${target.scannedRows}, changed ${target.changedRows}, replacements ${target.replacements}, updated ${target.updatedRows}`,
    );

    if (target.samples.length) {
      console.log(
        `  samples: ${target.samples.map((sample) => `${sample.id}(${sample.replacements})`).join(", ")}`,
      );
    }
  });

  if (!summary.apply && summary.totals.changedRows > 0) {
    console.log("Dry-run only. Re-run with --apply to write these changes.");
  }
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);

  if (options.help) {
    printHelp();
    return null;
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const summary = await migrateTemplateDefaultBlack(connection, options);

    if (options.apply) {
      await connection.commit();
    } else {
      await connection.rollback();
    }

    printSummary(summary);
    return summary;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end?.();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  GENERATION_HISTORY_TARGETS,
  LEGACY_DEFAULT_BLACK_PATTERNS,
  PURE_BLACK,
  TEMPLATE_TARGETS,
  getMigrationTargets,
  migrateTemplateDefaultBlack,
  normalizeLegacyDefaultBlackText,
  parseArgs,
};
