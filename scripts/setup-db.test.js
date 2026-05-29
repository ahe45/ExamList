const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");

const defaultSeed = require("../db/default-seed.json");
const { ensureInitialDefaultSchoolTemplate } = require("./setup-db");

function normalizeSql(sql) {
  return String(sql || "").replace(/\s+/g, " ").trim();
}

function hashJson(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function hashText(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

function createSeedPool(initialState = {}) {
  const state = {
    elements: [],
    pages: [],
    queries: [],
    schools: (initialState.schools || []).map((school) => ({ ...school })),
    settings: (initialState.settings || []).map((settings) => ({ ...settings })),
    templates: (initialState.templates || []).map((template) => ({ ...template })),
    versions: [],
  };
  const connection = {
    beginTransaction: async () => {
      state.didBegin = true;
    },
    commit: async () => {
      state.didCommit = true;
    },
    query: async (sql, params = []) => {
      const compactSql = normalizeSql(sql);
      state.queries.push({ params, sql: compactSql });

      if (compactSql.startsWith("SELECT id FROM schools WHERE id = ?")) {
        return [state.schools.filter((school) => school.id === params[0]).map((school) => ({ id: school.id }))];
      }

      if (compactSql.startsWith("SELECT id FROM schools WHERE code = ?")) {
        return [
          state.schools
            .filter((school) => {
              if (compactSql.includes("AND id <> ?")) {
                return school.code === params[0] && school.id !== params[1];
              }

              return school.code === params[0];
            })
            .map((school) => ({ id: school.id })),
        ];
      }

      if (compactSql.startsWith("UPDATE schools SET")) {
        const school = state.schools.find((item) => item.id === params[5]);

        if (school) {
          school.code = params[0];
          school.name = params[1];
          school.description = params[2];
          school.deletionPasswordHash = params[3];
          school.createdAccount = params[4];
          school.deletedAt = null;
        }

        return [{ affectedRows: school ? 1 : 0 }];
      }

      if (compactSql.startsWith("INSERT INTO schools")) {
        state.schools.push({
          code: params[1],
          description: params[3],
          deletionPasswordHash: params[4],
          createdAccount: params[5],
          id: params[0],
          name: params[2],
        });
        return [{ affectedRows: 1 }];
      }

      if (compactSql.startsWith("INSERT INTO school_settings")) {
        const existingSettings = state.settings.find((settings) => settings.id === params[0] || settings.schoolId === params[1]);

        if (existingSettings) {
          existingSettings.schoolId = params[1];
          existingSettings.schoolName = params[2];
          existingSettings.academicYear = params[3];
          existingSettings.logoDataUrl = params[4];
        } else {
          state.settings.push({
            academicYear: params[3],
            id: params[0],
            logoDataUrl: params[4],
            schoolId: params[1],
            schoolName: params[2],
          });
        }

        return [{ affectedRows: 1 }];
      }

      if (compactSql.startsWith("SELECT id FROM pdf_templates WHERE id = ?")) {
        return [state.templates.filter((template) => template.id === params[0]).map((template) => ({ id: template.id }))];
      }

      if (compactSql.startsWith("SELECT id FROM pdf_templates WHERE school_id = ?")) {
        return [
          state.templates
            .filter((template) => template.schoolId === params[0] && template.name === params[1] && !template.deletedAt)
            .map((template) => ({ id: template.id })),
        ];
      }

      if (compactSql.startsWith("INSERT INTO pdf_templates")) {
        state.templates.push({
          description: params[3],
          generationUnit: params[6],
          coverEnabled: params[8],
          id: params[0],
          isActive: params[7],
          layout: JSON.parse(params[11]),
          latestVersionNo: params[10],
          name: params[2],
          orientation: params[5],
          paperPreset: params[4],
          schoolId: params[1],
          contentEnabled: params[9],
        });
        return [{ affectedRows: 1 }];
      }

      if (compactSql.startsWith("DELETE FROM pdf_template_elements")) {
        state.elements = state.elements.filter((element) => element.templateId !== params[0]);
        return [{ affectedRows: 1 }];
      }

      if (compactSql.startsWith("DELETE FROM pdf_template_pages")) {
        state.pages = state.pages.filter((page) => page.templateId !== params[0]);
        return [{ affectedRows: 1 }];
      }

      if (compactSql.startsWith("INSERT INTO pdf_template_pages")) {
        state.pages.push({
          enabled: params[5],
          heightPt: params[8],
          id: params[0],
          name: params[3],
          pageType: params[2],
          repeatable: params[6],
          settings: JSON.parse(params[9]),
          sortOrder: params[4],
          templateId: params[1],
          widthPt: params[7],
        });
        return [{ affectedRows: 1 }];
      }

      if (compactSql.startsWith("INSERT INTO pdf_template_elements")) {
        state.elements.push({
          id: params[0],
          templateId: params[1],
        });
        return [{ affectedRows: 1 }];
      }

      if (compactSql.startsWith("INSERT INTO pdf_template_versions")) {
        state.versions.push({
          id: params[0],
          snapshot: JSON.parse(params[3]),
          templateId: params[1],
          versionNo: params[2],
        });
        return [{ affectedRows: 1 }];
      }

      return [[]];
    },
    release: () => {
      state.didRelease = true;
    },
    rollback: async () => {
      state.didRollback = true;
    },
  };

  return {
    pool: {
      getConnection: async () => connection,
    },
    state,
  };
}

async function withMutedConsole(callback) {
  const originalLog = console.log;

  console.log = () => {};

  try {
    return await callback();
  } finally {
    console.log = originalLog;
  }
}

test("setup-db seeds 한국대학교 and 기본 템플릿 when missing", async () => {
  const { pool, state } = createSeedPool();

  await withMutedConsole(() => ensureInitialDefaultSchoolTemplate(pool));

  assert.equal(state.didBegin, true);
  assert.equal(state.didCommit, true);
  assert.equal(state.didRelease, true);
  assert.equal(defaultSeed.school.createdAccount, "default");
  assert.deepEqual(state.schools[0], {
    code: defaultSeed.school.code,
    description: defaultSeed.school.description,
    createdAccount: defaultSeed.school.createdAccount,
    deletionPasswordHash: defaultSeed.school.deletionPasswordHash,
    id: defaultSeed.school.id,
    name: defaultSeed.school.name,
  });
  assert.equal(state.settings[0].id, defaultSeed.schoolSettings.id);
  assert.equal(state.settings[0].schoolId, defaultSeed.schoolSettings.schoolId);
  assert.equal(state.settings[0].schoolName, defaultSeed.schoolSettings.schoolName);
  assert.equal(state.settings[0].academicYear, defaultSeed.schoolSettings.academicYear);
  assert.equal(hashText(state.settings[0].logoDataUrl), hashText(defaultSeed.schoolSettings.logoDataUrl));
  assert.equal(state.templates.length, 1);
  assert.equal(state.templates[0].id, defaultSeed.template.id);
  assert.equal(state.templates[0].schoolId, defaultSeed.template.schoolId);
  assert.equal(state.templates[0].name, defaultSeed.template.name);
  assert.equal(state.templates[0].description, defaultSeed.template.description);
  assert.equal(state.templates[0].paperPreset, defaultSeed.template.paperPreset);
  assert.equal(state.templates[0].orientation, defaultSeed.template.orientation);
  assert.equal(state.templates[0].generationUnit, defaultSeed.template.generationUnit);
  assert.equal(state.templates[0].isActive, 1);
  assert.equal(state.templates[0].coverEnabled, 1);
  assert.equal(state.templates[0].contentEnabled, 1);
  assert.equal(hashJson(state.templates[0].layout), hashJson(defaultSeed.template.layout));
  assert.equal(state.templates[0].layout.pages.length, defaultSeed.template.layout.pages.length);
  assert.match(state.templates[0].layout.pages[0].settings.documentHtml, /수험생확인대장/);
  assert.match(state.templates[0].layout.pages[1].settings.documentHtml, /candidate-block-grid/);
  assert.deepEqual(
    state.pages.map((page) => page.pageType),
    ["cover", "content"],
  );
  assert.equal(state.pages[0].settings.documentHtml, defaultSeed.template.layout.pages[0].settings.documentHtml);
  assert.equal(state.pages[1].settings.documentHtml, defaultSeed.template.layout.pages[1].settings.documentHtml);
  assert.equal(state.versions.length, 1);
  assert.equal(state.versions[0].templateId, state.templates[0].id);
  assert.equal(hashJson(state.versions[0].snapshot), hashJson(defaultSeed.template.layout));
});

test("setup-db does not duplicate an existing 기본 템플릿", async () => {
  const { pool, state } = createSeedPool({
    schools: [
      {
        code: "LEGACY",
        createdAccount: "legacy-admin",
        deletedAt: "2026-01-01",
        description: "old",
        id: "school-default",
        name: "이전 학교명",
      },
    ],
    templates: [
      {
        id: "template-existing",
        name: "기본 템플릿",
        schoolId: "school-default",
      },
    ],
  });

  await withMutedConsole(() => ensureInitialDefaultSchoolTemplate(pool));

  assert.equal(state.templates.length, 1);
  assert.equal(state.templates[0].id, "template-existing");
  assert.equal(state.pages.length, 0);
  assert.equal(state.versions.length, 0);
  assert.equal(state.schools[0].code, defaultSeed.school.code);
  assert.equal(state.schools[0].name, "한국대학교");
  assert.equal(state.schools[0].description, defaultSeed.school.description);
  assert.equal(state.schools[0].createdAccount, defaultSeed.school.createdAccount);
  assert.equal(state.schools[0].deletedAt, null);
  assert.equal(state.settings[0].academicYear, defaultSeed.schoolSettings.academicYear);
  assert.equal(hashText(state.settings[0].logoDataUrl), hashText(defaultSeed.schoolSettings.logoDataUrl));
});
