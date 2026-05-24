const test = require("node:test");
const assert = require("node:assert/strict");

const { ensureInitialDefaultSchoolTemplate } = require("./setup-db");

function normalizeSql(sql) {
  return String(sql || "").replace(/\s+/g, " ").trim();
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
        return [state.schools.filter((school) => school.code === params[0]).map((school) => ({ id: school.id }))];
      }

      if (compactSql.startsWith("UPDATE schools SET")) {
        const school = state.schools.find((item) => item.id === params[2]);

        if (school) {
          school.name = params[0];
          school.description = params[1];
          school.isActive = 1;
          school.deletedAt = null;
        }

        return [{ affectedRows: school ? 1 : 0 }];
      }

      if (compactSql.startsWith("INSERT INTO schools")) {
        state.schools.push({
          code: params[1],
          description: params[3],
          id: params[0],
          isActive: params[5],
          name: params[2],
        });
        return [{ affectedRows: 1 }];
      }

      if (compactSql.startsWith("INSERT INTO school_settings")) {
        const existingSettings = state.settings.find((settings) => settings.id === params[0] || settings.schoolId === params[1]);

        if (existingSettings) {
          existingSettings.schoolId = params[1];
          existingSettings.schoolName = params[2];
        } else {
          state.settings.push({
            id: params[0],
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
          id: params[0],
          layout: JSON.parse(params[11]),
          name: params[2],
          orientation: params[5],
          paperPreset: params[4],
          schoolId: params[1],
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
          id: params[0],
          name: params[3],
          pageType: params[2],
          templateId: params[1],
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
  assert.deepEqual(state.schools[0], {
    code: "KOREA",
    description: "",
    id: "school-default",
    isActive: 1,
    name: "한국대학교",
  });
  assert.deepEqual(state.settings[0], {
    id: "default",
    schoolId: "school-default",
    schoolName: "한국대학교",
  });
  assert.equal(state.templates.length, 1);
  assert.equal(state.templates[0].schoolId, "school-default");
  assert.equal(state.templates[0].name, "기본 템플릿");
  assert.equal(state.templates[0].paperPreset, "A4");
  assert.equal(state.templates[0].orientation, "portrait");
  assert.equal(state.templates[0].generationUnit, "roomCode");
  assert.equal(state.templates[0].layout.pages.length, 2);
  assert.deepEqual(
    state.pages.map((page) => page.pageType),
    ["cover", "content"],
  );
  assert.equal(state.versions.length, 1);
  assert.equal(state.versions[0].templateId, state.templates[0].id);
});

test("setup-db does not duplicate an existing 기본 템플릿", async () => {
  const { pool, state } = createSeedPool({
    schools: [
      {
        code: "LEGACY",
        deletedAt: "2026-01-01",
        description: "old",
        id: "school-default",
        isActive: 0,
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
  assert.equal(state.schools[0].name, "한국대학교");
  assert.equal(state.schools[0].isActive, 1);
  assert.equal(state.schools[0].deletedAt, null);
});
