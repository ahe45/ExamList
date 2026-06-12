const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getMigrationTargets,
  migrateTemplateDefaultBlack,
  normalizeLegacyDefaultBlackText,
  parseArgs,
} = require("./migrate-template-default-black");

function normalizeSql(sql) {
  return String(sql || "").replace(/\s+/g, " ").trim();
}

function createMigrationConnection(initialRowsByTable = {}) {
  const state = {
    queries: [],
    rowsByTable: Object.fromEntries(
      Object.entries(initialRowsByTable).map(([tableName, rows]) => [
        tableName,
        rows.map((row) => ({ ...row })),
      ]),
    ),
    updates: [],
  };
  const connection = {
    query: async (sql, params = []) => {
      const compactSql = normalizeSql(sql);
      const tableName = Object.keys(state.rowsByTable).find((candidateTableName) =>
        compactSql.includes(`FROM \`${candidateTableName}\``) ||
          compactSql.includes(`UPDATE \`${candidateTableName}\``),
      );

      state.queries.push({ params, sql: compactSql });

      if (compactSql.startsWith("SELECT")) {
        return [
          (state.rowsByTable[tableName] || []).map((row) => ({
            id: row.id,
            value: row.value,
          })),
        ];
      }

      if (compactSql.startsWith("UPDATE")) {
        const row = (state.rowsByTable[tableName] || []).find((item) => item.id === params[1]);

        if (row) {
          row.value = params[0];
        }

        state.updates.push({
          id: params[1],
          sql: compactSql,
          table: tableName,
          value: params[0],
        });
        return [{ affectedRows: row ? 1 : 0 }];
      }

      return [[]];
    },
  };

  return { connection, state };
}

test("default black migration text normalizer rewrites only legacy default black values", () => {
  const normalized = normalizeLegacyDefaultBlackText(
    "color:#152033; border-color: rgb(21, 32, 51); outline-color: rgba(21, 32, 51, 1); background:#334155;",
  );

  assert.equal(normalized.changed, true);
  assert.equal(normalized.replacements, 3);
  assert.equal(
    normalized.value,
    "color:#000000; border-color: #000000; outline-color: #000000; background:#334155;",
  );
});

test("default black migration defaults to dry-run and excludes generation history", () => {
  assert.deepEqual(parseArgs([]), {
    apply: false,
    includeGenerationHistory: false,
    sampleLimit: 10,
  });
  assert.equal(getMigrationTargets({ includeGenerationHistory: false }).some((target) => target.table === "pdf_generation_histories"), false);
  assert.equal(getMigrationTargets({ includeGenerationHistory: true }).some((target) => target.table === "pdf_generation_histories"), true);
});

test("default black migration dry-run reports changed rows without updates", async () => {
  const { connection, state } = createMigrationConnection({
    pdf_templates: [
      { id: "template-1", value: '{"documentHtml":"<span style=\\"color:#152033\\">A</span>"}' },
      { id: "template-2", value: '{"documentHtml":"<span style=\\"color:#334155\\">B</span>"}' },
    ],
  });

  const summary = await migrateTemplateDefaultBlack(connection, {
    apply: false,
    targets: [
      {
        column: "layout_json",
        idColumn: "id",
        label: "test templates",
        preserveUpdatedAt: true,
        table: "pdf_templates",
      },
    ],
  });

  assert.equal(summary.totals.scannedRows, 2);
  assert.equal(summary.totals.changedRows, 1);
  assert.equal(summary.totals.replacements, 1);
  assert.equal(summary.totals.updatedRows, 0);
  assert.equal(state.updates.length, 0);
});

test("default black migration apply updates changed rows and preserves updated_at", async () => {
  const { connection, state } = createMigrationConnection({
    pdf_templates: [
      { id: "template-1", value: '{"documentHtml":"<span style=\\"color:rgb(21,32,51)\\">A</span>"}' },
    ],
  });

  const summary = await migrateTemplateDefaultBlack(connection, {
    apply: true,
    targets: [
      {
        column: "layout_json",
        idColumn: "id",
        label: "test templates",
        preserveUpdatedAt: true,
        table: "pdf_templates",
      },
    ],
  });

  assert.equal(summary.totals.changedRows, 1);
  assert.equal(summary.totals.updatedRows, 1);
  assert.equal(state.updates.length, 1);
  assert.match(state.updates[0].sql, /updated_at = updated_at/);
  assert.equal(state.rowsByTable.pdf_templates[0].value, '{"documentHtml":"<span style=\\"color:#000000\\">A</span>"}');
});
