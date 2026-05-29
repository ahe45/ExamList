const test = require("node:test");
const assert = require("node:assert/strict");

const { createPdfTemplateService } = require("./service");

function createHttpError(statusCode, message, errorCode = "") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errorCode = errorCode;
  return error;
}

function normalizeSql(sql = "") {
  return String(sql).replace(/\s+/g, " ").trim();
}

function createServiceHarness(options = {}) {
  const connectionQueries = [];
  const topLevelQueries = [];
  let insertedTemplate = null;
  const defaultSchoolId = options.defaultSchoolId || "school-default";
  const defaultSourceLayout = options.defaultSourceLayout || {
    dataTagSettings: {
      emptyValueData: {},
      sampleData: {},
    },
    generation: {
      unit: options.defaultSourceGenerationUnit || "roomCode",
    },
    id: options.defaultSourceTemplateId || "template-default-source",
    name: "기본 템플릿",
    pages: [
      {
        elements: [],
        enabled: true,
        heightPt: 841.89,
        id: "page-default-source-content",
        name: "본문",
        repeatable: true,
        settings: {
          backgroundColor: "#ffffff",
        },
        sortOrder: 1,
        type: "content",
        widthPt: 595.28,
      },
    ],
    paper: {
      heightPt: 841.89,
      margin: {
        bottom: 28.35,
        left: 28.35,
        right: 28.35,
        top: 28.35,
      },
      orientation: options.defaultSourceOrientation || "portrait",
      preset: options.defaultSourcePaperPreset || "A4",
      widthPt: 595.28,
    },
  };
  const defaultSourceTemplate = {
    id: options.defaultSourceTemplateId || "template-default-source",
    schoolId: defaultSchoolId,
    name: "기본 템플릿",
    description: options.defaultSourceDescription || "한국대학교 기본 양식",
    paperPreset: options.defaultSourcePaperPreset || defaultSourceLayout.paper?.preset || "A4",
    orientation: options.defaultSourceOrientation || defaultSourceLayout.paper?.orientation || "portrait",
    generationUnit: options.defaultSourceGenerationUnit || defaultSourceLayout.generation?.unit || "roomCode",
    latestVersionNo: options.defaultSourceLatestVersionNo || 1,
    layoutJson: JSON.stringify(defaultSourceLayout),
    createdAt: "2026-05-12T00:00:00.000Z",
    updatedAt: "2026-05-12T00:00:00.000Z",
  };
  const fallbackTemplate = {
    id: options.templateId || "template-existing",
    schoolId: options.schoolId || "school-1",
    name: options.name || "기존 양식",
    description: options.description || "",
    paperPreset: options.paperPreset || "A4",
    orientation: options.orientation || "portrait",
    generationUnit: options.generationUnit || "room",
    latestVersionNo: options.latestVersionNo || 1,
    layoutJson: options.layoutJson || "",
    createdAt: options.createdAt || "2026-05-13T00:00:00.000Z",
    updatedAt: options.updatedAt || "2026-05-13T00:00:00.000Z",
  };
  const connection = {
    async beginTransaction() {
      connectionQueries.push({ sql: "BEGIN", params: [] });
    },
    async commit() {
      connectionQueries.push({ sql: "COMMIT", params: [] });
    },
    async rollback() {
      connectionQueries.push({ sql: "ROLLBACK", params: [] });
    },
    release() {
      connectionQueries.push({ sql: "RELEASE", params: [] });
    },
    async query(sql, params = []) {
      connectionQueries.push({ sql, params });

      if (normalizeSql(sql).startsWith("SELECT COALESCE(MAX(version_no), 0) AS maxVersionNo")) {
        return [[{ maxVersionNo: Number(options.maxVersionNo) || 0 }]];
      }

      if (normalizeSql(sql).startsWith("INSERT INTO pdf_templates")) {
        insertedTemplate = {
          id: params[0],
          schoolId: params[1],
          name: params[2],
          description: params[3],
          paperPreset: params[4],
          orientation: params[5],
          generationUnit: params[6],
          latestVersionNo: params[10],
          layoutJson: params[11],
          createdAt: "2026-05-13T00:00:00.000Z",
          updatedAt: "2026-05-13T00:00:00.000Z",
        };
      }

      return [];
    },
  };
  const service = createPdfTemplateService({
    createHttpError,
    getDefaultSchoolId: async () => defaultSchoolId,
    getPool: () => ({
      getConnection: async () => connection,
    }),
    query: async (sql, params = []) => {
      const compactSql = normalizeSql(sql);

      topLevelQueries.push({ sql, params });

      if (compactSql.startsWith("SELECT COUNT(*) AS total FROM pdf_templates")) {
        return [{ total: Array.isArray(options.listRows) ? options.listRows.length : 0 }];
      }

      if (compactSql.startsWith("SELECT id FROM pdf_templates WHERE school_id = ? AND name = ?")) {
        return options.defaultSourceMissing ? [] : [{ id: defaultSourceTemplate.id }];
      }

      if (compactSql.includes("FROM pdf_template_versions")) {
        return [];
      }

      if (compactSql.includes("FROM pdf_templates") && compactSql.includes("LIMIT 1")) {
        if (String(params[0] || "") === defaultSourceTemplate.id) {
          return [defaultSourceTemplate];
        }

        return [
          {
            ...fallbackTemplate,
            ...(insertedTemplate || {}),
            id: params[0] || insertedTemplate?.id || fallbackTemplate.id,
            schoolId: params[1] || insertedTemplate?.schoolId || fallbackTemplate.schoolId,
          },
        ];
      }

      if (compactSql.includes("FROM pdf_templates") && compactSql.includes("ORDER BY")) {
        return Array.isArray(options.listRows) ? options.listRows : [];
      }

      return [];
    },
    renderListThumbnail: options.renderListThumbnail,
  });

  return {
    connectionQueries,
    service,
    topLevelQueries,
  };
}

test("createTemplate creates a template without exposing activation state", async () => {
  const { connectionQueries, service } = createServiceHarness();

  const createdTemplate = await service.createTemplate({
    description: "추가 테스트",
    generationUnit: "room",
    name: "신규 양식",
    orientation: "portrait",
    paperPreset: "A4",
    schoolId: "school-1",
  });

  assert.equal(createdTemplate.name, "신규 양식");
  assert.equal(Object.prototype.hasOwnProperty.call(createdTemplate, "isActive"), false);
  assert.equal(connectionQueries.some((entry) => normalizeSql(entry.sql).includes("SET is_active")), false);
});

test("createTemplate uses 한국대학교's 기본 템플릿 as the default layout source", async () => {
  const sourceLayout = {
    dataTagSettings: {
      emptyValueData: {
        "room.otherRoom": "원본 타고사실",
      },
      sampleData: {
        "candidate.name": "홍길동",
      },
    },
    generation: {
      fileNamePattern: "{{candidate.examDate}}_{{room.name}}.pdf",
      unit: "custom",
      unitFields: ["date", "periodCode", "roomCode"],
    },
    id: "template-source-default",
    name: "기본 템플릿",
    pages: [
      {
        elements: [
          {
            config: {
              content: "원본 캔버스 요소",
              style: {
                fontSize: 13,
              },
            },
            height: 32,
            id: "element-source-title",
            locked: false,
            name: "원본 요소",
            pageId: "page-source-content",
            type: "text",
            visible: true,
            width: 180,
            x: 24,
            y: 30,
            zIndex: 10,
          },
        ],
        enabled: true,
        heightPt: 728.5,
        id: "page-source-content",
        name: "본문",
        repeatable: true,
        settings: {
          backgroundColor: "#f7f7f7",
          candidateBlockGrid: {
            columns: 3,
            enabled: true,
            rows: 4,
            sortKey: "candidate.name",
          },
          documentHtml: "<p>원본 캔버스</p>",
          editorMode: "document",
          otherRoomPage: {
            enabled: true,
          },
          pageNumber: {
            enabled: true,
            preset: "koreanPage",
          },
          recognitionMarks: {
            enabled: true,
            offsetXPt: 20,
            offsetYPt: 21,
            sizePt: 8,
          },
        },
        sortOrder: 1,
        type: "content",
        widthPt: 1031.81,
      },
    ],
    paper: {
      heightPt: 728.5,
      margin: {
        bottom: 18,
        left: 20,
        right: 22,
        top: 16,
      },
      orientation: "landscape",
      preset: "B5",
      widthPt: 1031.81,
    },
  };
  const { service, topLevelQueries } = createServiceHarness({
    defaultSourceGenerationUnit: "custom",
    defaultSourceLayout: sourceLayout,
    defaultSourceOrientation: "landscape",
    defaultSourcePaperPreset: "B5",
  });

  const createdTemplate = await service.createTemplate({
    description: "",
    generationUnit: "roomCode",
    name: "새 양식",
    orientation: "portrait",
    paperPreset: "A4",
    schoolId: "school-1",
  });
  const contentPage = createdTemplate.layout.pages.find((page) => page.type === "content");
  const sourceLookup = topLevelQueries.find((entry) =>
    normalizeSql(entry.sql).startsWith("SELECT id FROM pdf_templates WHERE school_id = ? AND name = ?"),
  );

  assert.equal(createdTemplate.name, "새 양식");
  assert.equal(createdTemplate.paperPreset, "B5");
  assert.equal(createdTemplate.orientation, "landscape");
  assert.equal(createdTemplate.generationUnit, "custom");
  assert.equal(createdTemplate.layout.name, "새 양식");
  assert.deepEqual(sourceLookup.params, ["school-default", "기본 템플릿"]);
  assert.notEqual(createdTemplate.layout.id, "template-source-default");
  assert.notEqual(contentPage.id, "page-source-content");
  assert.notEqual(contentPage.elements[0].id, "element-source-title");
  assert.equal(contentPage.name, "본문");
  assert.equal(contentPage.widthPt, 1031.81);
  assert.equal(contentPage.settings.documentHtml, "<p>원본 캔버스</p>");
  assert.equal(contentPage.settings.candidateBlockGrid.enabled, true);
  assert.equal(contentPage.settings.candidateBlockGrid.columns, 3);
  assert.equal(contentPage.settings.recognitionMarks.enabled, true);
  assert.deepEqual(contentPage.settings.otherRoomPage, { enabled: true });
  assert.equal(createdTemplate.layout.generation.unit, "custom");
  assert.deepEqual(createdTemplate.layout.generation.unitFields, ["date", "periodCode", "roomCode"]);
  assert.equal(createdTemplate.layout.dataTagSettings.emptyValueData["room.otherRoom"], "원본 타고사실");
  assert.equal(createdTemplate.layout.dataTagSettings.sampleData["candidate.name"], "홍길동");
});

test("createTemplate creates blank templates from 한국대학교's 기본 템플릿 with only canvas content cleared", async () => {
  const sourceLayout = {
    dataTagSettings: {
      emptyValueData: {
        "room.otherRoom": "타고사실",
      },
      sampleData: {
        "candidate.name": "샘플 성명",
      },
    },
    generation: {
      fileNamePattern: "{{room.name}}.pdf",
      unit: "custom",
      unitFields: ["date", "periodCode", "roomCode"],
    },
    id: "template-source-blank",
    name: "기본 템플릿",
    pages: [
      {
        elements: [
          {
            config: {
              content: "비워질 요소",
            },
            height: 24,
            id: "element-source-blank",
            name: "캔버스 요소",
            pageId: "page-source-blank",
            type: "text",
            width: 120,
            x: 10,
            y: 20,
          },
        ],
        enabled: true,
        id: "page-source-blank",
        name: "본문",
        repeatable: true,
        settings: {
          backgroundColor: "#f7f7f7",
          candidateBlockGrid: {
            blockTemplateHtml: "<p>비워질 블록</p>",
            columns: 3,
            enabled: true,
            gapXPt: 6,
            rows: 4,
            sortKey: "candidate.name",
          },
          documentHtml: "<p>비워질 문서</p>",
          editorMode: "document",
          otherRoomPage: {
            enabled: true,
          },
          pageNumber: {
            enabled: true,
            preset: "koreanPage",
          },
          recognitionMarks: {
            enabled: true,
            offsetXPt: 20,
            offsetYPt: 21,
            sizePt: 8,
          },
          safeArea: {
            bottom: 18,
            left: 20,
            right: 22,
            top: 16,
          },
        },
        sortOrder: 1,
        type: "content",
      },
    ],
    paper: {
      heightPt: 728.5,
      margin: {
        bottom: 18,
        left: 20,
        right: 22,
        top: 16,
      },
      orientation: "landscape",
      preset: "B5",
      widthPt: 1031.81,
    },
  };
  const { service, topLevelQueries } = createServiceHarness({
    defaultSourceGenerationUnit: "custom",
    defaultSourceLayout: sourceLayout,
    defaultSourceOrientation: "landscape",
    defaultSourcePaperPreset: "B5",
  });

  const createdTemplate = await service.createTemplate({
    creationMode: "blank",
    description: "",
    generationUnit: "room",
    name: "빈 양식",
    orientation: "portrait",
    paperPreset: "A4",
    schoolId: "school-1",
  });
  const contentPage = createdTemplate.layout.pages.find((page) => page.type === "content");
  const sourceLookup = topLevelQueries.find((entry) =>
    normalizeSql(entry.sql).startsWith("SELECT id FROM pdf_templates WHERE school_id = ? AND name = ?"),
  );

  assert.equal(createdTemplate.name, "빈 양식");
  assert.equal(createdTemplate.paperPreset, "B5");
  assert.equal(createdTemplate.orientation, "landscape");
  assert.equal(createdTemplate.generationUnit, "custom");
  assert.deepEqual(sourceLookup.params, ["school-default", "기본 템플릿"]);
  assert.equal(createdTemplate.layout.pages.length, 1);
  assert.notEqual(contentPage.id, "page-source-blank");
  assert.equal(contentPage.name, "본문");
  assert.equal(createdTemplate.layout.pages.every((page) => Array.isArray(page.elements) && page.elements.length === 0), true);
  assert.equal(Object.prototype.hasOwnProperty.call(contentPage.settings, "documentHtml"), false);
  assert.equal(contentPage.settings.editorMode, "document");
  assert.equal(contentPage.settings.candidateBlockGrid.enabled, false);
  assert.equal(contentPage.settings.candidateBlockGrid.blockTemplateHtml, "<p><br></p>");
  assert.equal(contentPage.settings.candidateBlockGrid.columns, 3);
  assert.equal(contentPage.settings.pageNumber.enabled, true);
  assert.equal(contentPage.settings.recognitionMarks.enabled, true);
  assert.deepEqual(contentPage.settings.otherRoomPage, { enabled: true });
  assert.equal(createdTemplate.layout.dataTagSettings.emptyValueData["room.otherRoom"], "타고사실");
  assert.equal(createdTemplate.layout.dataTagSettings.sampleData["candidate.name"], "샘플 성명");
  assert.deepEqual(createdTemplate.layout.generation.unitFields, ["date", "periodCode", "roomCode"]);
});

test("createTemplate reports a missing 한국대학교 기본 템플릿 source", async () => {
  const { service } = createServiceHarness({
    defaultSourceMissing: true,
  });

  await assert.rejects(
    () =>
      service.createTemplate({
        description: "",
        generationUnit: "roomCode",
        name: "새 양식",
        orientation: "portrait",
        paperPreset: "A4",
        schoolId: "school-1",
      }),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.errorCode, "DEFAULT_TEMPLATE_NOT_FOUND");
      assert.match(error.message, /한국대학교의 '기본 템플릿' 양식/);
      return true;
    },
  );

  await assert.rejects(
    () =>
      service.createTemplate({
        creationMode: "blank",
        description: "",
        generationUnit: "roomCode",
        name: "빈 양식",
        orientation: "portrait",
        paperPreset: "A4",
        schoolId: "school-1",
      }),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.errorCode, "DEFAULT_TEMPLATE_NOT_FOUND");
      return true;
    },
  );
});

test("duplicateTemplate can copy a source school template into a target school", async () => {
  const { connectionQueries, service, topLevelQueries } = createServiceHarness({
    layoutJson: JSON.stringify({
      generation: { unit: "room" },
      pages: [
        {
          elements: [],
          enabled: true,
          id: "page-source",
          name: "본문",
          repeatable: true,
          settings: { backgroundColor: "#ffffff" },
          sortOrder: 1,
          type: "content",
        },
      ],
    }),
    schoolId: "school-source",
    templateId: "template-source",
  });

  const duplicatedTemplate = await service.duplicateTemplate("template-source", {
    sourceSchoolId: "school-source",
    targetSchoolId: "school-target",
  });
  const insertQuery = connectionQueries.find((entry) => normalizeSql(entry.sql).startsWith("INSERT INTO pdf_templates"));
  const sourceLookup = topLevelQueries.find((entry) => normalizeSql(entry.sql).includes("FROM pdf_templates") && normalizeSql(entry.sql).includes("LIMIT 1"));

  assert.equal(sourceLookup.params[1], "school-source");
  assert.equal(insertQuery.params[1], "school-target");
  assert.equal(duplicatedTemplate.schoolId, "school-target");
  assert.equal(duplicatedTemplate.name, "기존 양식 복사본");
});

test("updateTemplate updates metadata without writing activation state", async () => {
  const { connectionQueries, service } = createServiceHarness({
    latestVersionNo: 2,
    name: "수정 전 양식",
  });

  const updatedTemplate = await service.updateTemplate("template-existing", {
    description: "수정 테스트",
    generationUnit: "room",
    name: "수정 후 양식",
    orientation: "portrait",
    paperPreset: "A4",
    schoolId: "school-1",
  });

  assert.equal(updatedTemplate.id, "template-existing");
  assert.equal(connectionQueries.some((entry) => normalizeSql(entry.sql).includes("is_active =")), false);
});

test("updateTemplate uses the stored maximum version number when latest version is stale", async () => {
  const { connectionQueries, service } = createServiceHarness({
    latestVersionNo: 1,
    maxVersionNo: 4,
    name: "기본 템플릿",
    schoolId: "school-default",
    templateId: "template-default",
  });

  await service.updateTemplate("template-default", {
    description: "버전 보정 테스트",
    generationUnit: "room",
    name: "기본 템플릿",
    orientation: "portrait",
    paperPreset: "A4",
    schoolId: "school-default",
  });

  const maxVersionQuery = connectionQueries.find((entry) =>
    normalizeSql(entry.sql).startsWith("SELECT COALESCE(MAX(version_no), 0) AS maxVersionNo"),
  );
  const updateQuery = connectionQueries.find((entry) => normalizeSql(entry.sql).startsWith("UPDATE pdf_templates SET"));
  const versionInsertQuery = connectionQueries.find((entry) => normalizeSql(entry.sql).startsWith("INSERT INTO pdf_template_versions"));

  assert.deepEqual(maxVersionQuery.params, ["template-default"]);
  assert.equal(updateQuery.params[5], 5);
  assert.equal(versionInsertQuery.params[2], 5);
});

test("listTemplates keeps card order stable by creation order", async () => {
  const { service, topLevelQueries } = createServiceHarness();

  await service.listTemplates({
    limit: 100,
    schoolId: "school-1",
  });

  const listQuery = topLevelQueries.find((entry) => normalizeSql(entry.sql).includes("FROM pdf_templates") && normalizeSql(entry.sql).includes("ORDER BY"));

  assert.ok(listQuery, "template list query should be executed");
  assert.match(normalizeSql(listQuery.sql), /ORDER BY created_at ASC, name ASC, id ASC/);
  assert.equal(listQuery.params.limit, 100);
});

test("listTemplates can use preview-rendered thumbnails for template cards", async () => {
  const calls = [];
  const { service } = createServiceHarness({
    listRows: [
      {
        createdAt: "2026-05-13T00:00:00.000Z",
        description: "기본값",
        generationUnit: "room",
        id: "template-thumbnail",
        layoutJson: JSON.stringify({
          pages: [
            {
              id: "page-content",
              settings: {
                documentHtml: "<p>CONTENT</p>",
                editorMode: "document",
              },
              type: "content",
            },
          ],
        }),
        latestVersionNo: 1,
        name: "썸네일 양식",
        orientation: "portrait",
        paperPreset: "A4",
        schoolId: "school-1",
        updatedAt: "2026-05-13T00:00:00.000Z",
      },
    ],
    renderListThumbnail: async (template) => {
      calls.push(template.id);
      return {
        heightPt: 842,
        html: "<!doctype html><p>PREVIEW_THUMBNAIL</p>",
        sourcePageId: "page-content",
        sourcePageNumber: 1,
        widthPt: 595,
      };
    },
  });

  const result = await service.listTemplates({
    limit: 20,
    schoolId: "school-1",
  });

  assert.deepEqual(calls, ["template-thumbnail"]);
  assert.equal(result.items[0].thumbnailHtml, "<!doctype html><p>PREVIEW_THUMBNAIL</p>");
  assert.deepEqual(result.items[0].thumbnailPage, {
    heightPt: 842,
    sourcePageId: "page-content",
    sourcePageNumber: 1,
    widthPt: 595,
  });
});

test("deleteTemplate removes template rows and related snapshot data from the database", async () => {
  const { connectionQueries, service } = createServiceHarness({
    templateId: "template-delete",
  });

  const result = await service.deleteTemplate("template-delete", {
    schoolId: "school-1",
  });
  const executedSql = connectionQueries.map((entry) => normalizeSql(entry.sql));

  assert.deepEqual(result, {
    deleted: true,
    id: "template-delete",
    name: "기존 양식",
  });
  assert.ok(executedSql.includes("DELETE FROM pdf_template_elements WHERE template_id = ?"));
  assert.ok(executedSql.includes("DELETE FROM pdf_template_pages WHERE template_id = ?"));
  assert.ok(executedSql.includes("DELETE FROM pdf_template_versions WHERE template_id = ?"));
  assert.ok(executedSql.some((sql) => sql.startsWith("DELETE FROM pdf_templates WHERE id = ? AND school_id = ?")));
  assert.equal(executedSql.some((sql) => sql.startsWith("UPDATE pdf_templates SET")), false);
});
