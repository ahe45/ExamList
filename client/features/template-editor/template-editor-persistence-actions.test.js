const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

function installDomStubs() {
  global.HTMLElement = global.HTMLElement || class HTMLElement {};
  global.window = {
    clearTimeout,
    setTimeout,
  };
  global.document = {
    body: {
      appendChild() {},
    },
    createElement() {
      return {
        addEventListener() {},
        classList: {
          add() {},
          remove() {},
        },
        replaceChildren() {},
        setAttribute() {},
        textContent: "",
      };
    },
    getElementById() {
      return null;
    },
  };
}

function createTemplatePayload(templateId, pageId = `${templateId}-page`) {
  return {
    dataTags: { groups: [] },
    template: {
      description: "",
      generationUnit: "roomCode",
      id: templateId,
      layout: {
        dataTagSettings: {
          emptyValueData: {},
          sampleData: {},
        },
        pages: [{ id: pageId, settings: {}, type: "content" }],
      },
      name: templateId,
      orientation: "portrait",
      paperPreset: "A4",
      schoolId: "school-1",
    },
  };
}

function createCoverAndContentTemplatePayload(templateId) {
  const payload = createTemplatePayload(templateId, `${templateId}-content`);

  payload.template.layout.pages = [
    { id: `${templateId}-cover`, settings: {}, type: "cover" },
    { id: `${templateId}-content`, settings: {}, type: "content" },
  ];
  return payload;
}

test("loadTemplateEditor ignores a stale response from a previously selected template", async () => {
  installDomStubs();
  const { createTemplateEditorPersistenceActions } = await importClientModule("template-editor-persistence-actions.js");
  const pendingLoads = new Map();
  const renderedTemplateIds = [];
  const appState = {
    currentView: "templateEditor",
    route: {
      params: {
        templateId: "template-a",
      },
      view: "templateEditor",
    },
    templateEditor: {
      dataTags: { groups: [] },
      dataTagEmptyValueData: {},
      dataTagSampleModal: {},
      dataTagSampleValues: {},
      errorMessage: "",
      isDirty: false,
      isPreviewLoading: false,
      isPreviewOpen: false,
      lastLoadedTemplateId: "",
      loading: false,
      previewCandidateCount: 0,
      previewErrorMessage: "",
      previewHtml: "",
      previewPageCount: 0,
      previewPdfUrl: "",
      previewWarnings: [],
      savedTemplateSnapshot: null,
      selectedPageId: "",
      template: null,
    },
    ui: {
      activeSchoolId: "school-1",
      activeTemplateId: "",
    },
  };
  const actions = createTemplateEditorPersistenceActions({
    appState,
    canManageTemplates: () => true,
    getCurrentSchoolId: () => "school-1",
    hasPermission: () => true,
    initializeDocumentHistoryForPage() {},
    loadTemplateEditorRequest: ({ templateId }) =>
      new Promise((resolve) => {
        pendingLoads.set(templateId, resolve);
      }),
    onStateChange: async () => {
      renderedTemplateIds.push(appState.templateEditor.template?.id || "");
    },
    refreshDocumentEditorRuntime() {},
    resetDocumentEditorRuntime() {},
    setLastDocumentSelectionPage() {},
    syncDocumentOverflowUi() {},
    syncSelectedPageDocumentHtml() {},
    templatesActions: {
      loadSummary: async () => {},
      loadTemplates: async () => {},
    },
  });

  const firstLoad = actions.loadTemplateEditor("template-a");
  appState.route.params.templateId = "template-b";
  const secondLoad = actions.loadTemplateEditor("template-b");

  pendingLoads.get("template-b")(createTemplatePayload("template-b"));
  await secondLoad;

  assert.equal(appState.templateEditor.template.id, "template-b");
  assert.equal(appState.templateEditor.lastLoadedTemplateId, "template-b");

  pendingLoads.get("template-a")(createTemplatePayload("template-a"));
  await firstLoad;

  assert.equal(appState.templateEditor.template.id, "template-b");
  assert.equal(appState.templateEditor.lastLoadedTemplateId, "template-b");
  assert.deepEqual(renderedTemplateIds, ["template-b"]);
});

test("loadTemplateEditor selects the content page by default", async () => {
  installDomStubs();
  const { createTemplateEditorPersistenceActions } = await importClientModule("template-editor-persistence-actions.js");
  const lastSelectionPages = [];
  const appState = {
    currentView: "templateEditor",
    route: {
      params: {
        templateId: "template-content-default",
      },
      view: "templateEditor",
    },
    templateEditor: {
      dataTags: { groups: [] },
      dataTagEmptyValueData: {},
      dataTagSampleModal: {},
      dataTagSampleValues: {},
      errorMessage: "",
      isDirty: false,
      isPreviewLoading: false,
      isPreviewOpen: false,
      lastLoadedTemplateId: "",
      loading: false,
      previewCandidateCount: 0,
      previewErrorMessage: "",
      previewHtml: "",
      previewPageCount: 0,
      previewPdfUrl: "",
      previewWarnings: [],
      savedTemplateSnapshot: null,
      selectedPageId: "",
      template: null,
    },
    ui: {
      activeSchoolId: "school-1",
      activeTemplateId: "",
    },
  };
  const actions = createTemplateEditorPersistenceActions({
    appState,
    canManageTemplates: () => true,
    getCurrentSchoolId: () => "school-1",
    hasPermission: () => true,
    initializeDocumentHistoryForPage() {},
    loadTemplateEditorRequest: async ({ templateId }) => createCoverAndContentTemplatePayload(templateId),
    onStateChange: async () => {},
    refreshDocumentEditorRuntime() {},
    resetDocumentEditorRuntime() {},
    setLastDocumentSelectionPage(pageId) {
      lastSelectionPages.push(pageId);
    },
    syncDocumentOverflowUi() {},
    syncSelectedPageDocumentHtml() {},
    templatesActions: {
      loadSummary: async () => {},
      loadTemplates: async () => {},
    },
  });

  await actions.loadTemplateEditor("template-content-default");

  assert.equal(appState.templateEditor.selectedPageId, "template-content-default-content");
  assert.deepEqual(lastSelectionPages, ["template-content-default-content"]);
});

test("saveTemplateLayout skips legacy document sync after runtime sync", async () => {
  installDomStubs();
  const { createTemplateEditorPersistenceActions } = await importClientModule("template-editor-persistence-actions.js");
  const pageId = "template-runtime-page";
  const template = createTemplatePayload("template-runtime", pageId).template;
  const runtimeHtml = '<div class="template-doc"><p>runtime html</p></div>';
  let legacySyncCalls = 0;
  let refreshCalls = 0;
  let savedTemplate = null;
  const appState = {
    currentView: "templateEditor",
    route: {
      params: {
        templateId: template.id,
      },
      view: "templateEditor",
    },
    templateEditor: {
      dataTags: { groups: [] },
      dataTagEmptyValueData: {},
      dataTagSampleModal: {},
      dataTagSampleValues: {},
      documentOverflowMessage: "",
      errorMessage: "",
      hasDocumentOverflow: false,
      isDirty: false,
      isSaving: false,
      lastLoadedTemplateId: template.id,
      savedTemplateSnapshot: structuredClone(template),
      selectedPageId: pageId,
      template,
    },
    ui: {
      activeSchoolId: "school-1",
      activeTemplateId: template.id,
    },
  };
  const actions = createTemplateEditorPersistenceActions({
    appState,
    canManageTemplates: () => true,
    getCurrentSchoolId: () => "school-1",
    hasPermission: () => true,
    initializeDocumentHistoryForPage() {},
    onStateChange: async () => {},
    refreshDocumentEditorRuntime() {
      refreshCalls += 1;
    },
    resetDocumentEditorRuntime() {},
    saveTemplateLayoutRequest: async ({ template: templatePayload }) => {
      savedTemplate = structuredClone(templatePayload);
      return {
        ...structuredClone(templatePayload),
        latestVersionNo: 2,
      };
    },
    setLastDocumentSelectionPage() {},
    syncDocumentOverflowUi() {},
    syncSelectedPageDocumentHtml() {
      legacySyncCalls += 1;
    },
    syncTemplateEditorRuntimeToStateAction({ appState: targetState }) {
      targetState.templateEditor.template.layout.pages[0].settings.documentHtml = runtimeHtml;
      return true;
    },
    templatesActions: {
      loadSummary: async () => {},
      loadTemplates: async () => {},
    },
  });

  await actions.saveTemplateLayout();

  assert.equal(legacySyncCalls, 0);
  assert.equal(refreshCalls, 0);
  assert.equal(savedTemplate.layout.pages[0].settings.documentHtml, runtimeHtml);
  assert.equal(appState.templateEditor.isDirty, false);
});

test("openTemplatePreview creates a PDF preview with current sample values", async () => {
  installDomStubs();
  const { createTemplateEditorPersistenceActions } = await importClientModule("template-editor-persistence-actions.js");
  const template = createTemplatePayload("template-preview-pdf").template;
  let previewRequest = null;
  const stateChanges = [];
  const appState = {
    currentView: "templateEditor",
    route: {
      params: {
        templateId: template.id,
      },
      view: "templateEditor",
    },
    templateEditor: {
      dataTags: {
        groups: [
          {
            tags: [
              { key: "candidate.name", label: "이름" },
              { key: "candidate.examNo", label: "수험번호" },
            ],
          },
        ],
      },
      dataTagEmptyValueData: {
        "candidate.name": "빈 이름",
      },
      dataTagSampleModal: {},
      dataTagSampleValues: {
        "candidate.name": "홍길동",
        "candidate.examNo": "26010001",
      },
      errorMessage: "",
      isDirty: false,
      isPreviewLoading: false,
      isPreviewOpen: false,
      lastLoadedTemplateId: template.id,
      loading: false,
      previewCandidateCount: 0,
      previewErrorMessage: "",
      previewHtml: "old html",
      previewPageCount: 0,
      previewPdfUrl: "",
      previewWarnings: [],
      savedTemplateSnapshot: structuredClone(template),
      selectedPageId: template.layout.pages[0].id,
      template,
    },
    ui: {
      activeSchoolId: "school-1",
      activeTemplateId: template.id,
    },
  };
  const actions = createTemplateEditorPersistenceActions({
    appState,
    canManageTemplates: () => true,
    getCurrentSchoolId: () => "school-1",
    hasPermission: () => true,
    initializeDocumentHistoryForPage() {},
    loadTemplatePreviewRequest: async (request) => {
      previewRequest = structuredClone(request);
      return {
        candidateCount: 25,
        pageCount: 1,
        pdfUrl: "/api/pdf-generations/previews/pdf-generation-preview-test?name=preview.pdf",
        warnings: ["샘플"],
      };
    },
    onStateChange: async () => {
      stateChanges.push({
        isPreviewLoading: appState.templateEditor.isPreviewLoading,
        previewPdfUrl: appState.templateEditor.previewPdfUrl,
      });
    },
    refreshDocumentEditorRuntime() {},
    resetDocumentEditorRuntime() {},
    setLastDocumentSelectionPage() {},
    syncDocumentOverflowUi() {},
    syncSelectedPageDocumentHtml() {},
    templatesActions: {
      loadSummary: async () => {},
      loadTemplates: async () => {},
    },
  });

  await actions.openTemplatePreview();

  assert.equal(previewRequest.schoolId, "school-1");
  assert.equal(previewRequest.sampleLimit, 60);
  assert.equal(previewRequest.sampleData["candidate.name"], "홍길동");
  assert.equal(previewRequest.sampleData["candidate.examNo"], "26010001");
  assert.equal(previewRequest.emptyValueData["candidate.name"], "빈 이름");
  assert.equal(appState.templateEditor.previewHtml, "");
  assert.equal(
    appState.templateEditor.previewPdfUrl,
    "/api/pdf-generations/previews/pdf-generation-preview-test?name=preview.pdf",
  );
  assert.equal(appState.templateEditor.previewCandidateCount, 25);
  assert.equal(appState.templateEditor.previewPageCount, 1);
  assert.deepEqual(appState.templateEditor.previewWarnings, ["샘플"]);
  assert.equal(stateChanges[0].isPreviewLoading, true);
  assert.equal(stateChanges.at(-1).isPreviewLoading, false);
});

test("saveTemplateLayout uses legacy document sync when runtime is unavailable", async () => {
  installDomStubs();
  const { createTemplateEditorPersistenceActions } = await importClientModule("template-editor-persistence-actions.js");
  const pageId = "template-legacy-page";
  const template = createTemplatePayload("template-legacy", pageId).template;
  let legacySyncCalls = 0;
  let refreshCalls = 0;
  const appState = {
    currentView: "templateEditor",
    route: {
      params: {
        templateId: template.id,
      },
      view: "templateEditor",
    },
    templateEditor: {
      dataTags: { groups: [] },
      dataTagEmptyValueData: {},
      dataTagSampleModal: {},
      dataTagSampleValues: {},
      documentOverflowMessage: "",
      errorMessage: "",
      hasDocumentOverflow: false,
      isDirty: false,
      isSaving: false,
      lastLoadedTemplateId: template.id,
      savedTemplateSnapshot: structuredClone(template),
      selectedPageId: pageId,
      template,
    },
    ui: {
      activeSchoolId: "school-1",
      activeTemplateId: template.id,
    },
  };
  const actions = createTemplateEditorPersistenceActions({
    appState,
    canManageTemplates: () => true,
    getCurrentSchoolId: () => "school-1",
    hasPermission: () => true,
    initializeDocumentHistoryForPage() {},
    onStateChange: async () => {},
    refreshDocumentEditorRuntime() {
      refreshCalls += 1;
    },
    resetDocumentEditorRuntime() {},
    saveTemplateLayoutRequest: async ({ template: templatePayload }) => ({
      ...structuredClone(templatePayload),
      latestVersionNo: 2,
    }),
    setLastDocumentSelectionPage() {},
    syncDocumentOverflowUi() {},
    syncSelectedPageDocumentHtml() {
      legacySyncCalls += 1;
    },
    syncTemplateEditorRuntimeToStateAction() {
      return false;
    },
    templatesActions: {
      loadSummary: async () => {},
      loadTemplates: async () => {},
    },
  });

  await actions.saveTemplateLayout();

  assert.equal(legacySyncCalls, 1);
  assert.equal(refreshCalls, 1);
});
