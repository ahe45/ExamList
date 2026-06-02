const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

class FakeInputElement {
  constructor({ checked = false, type = "checkbox", value = "" } = {}) {
    this.checked = checked;
    this.disabled = false;
    this.type = type;
    this.value = value;
  }
}

class FakeSelectElement extends FakeInputElement {}

function installDomStubs() {
  global.HTMLInputElement = FakeInputElement;
  global.HTMLSelectElement = FakeSelectElement;
  global.document = {
    getElementById() {
      return null;
    },
  };
}

function createPagePropertiesHost(sectionSelector, sectionElement) {
  return {
    classList: {
      toggle() {},
    },
    querySelector(selector) {
      return selector === sectionSelector ? sectionElement : null;
    },
    querySelectorAll() {
      return [];
    },
  };
}

function createSection(controlMap) {
  return {
    classList: {
      toggle() {},
    },
    querySelector(selector) {
      return controlMap[selector] || null;
    },
  };
}

function createAppState(page) {
  return {
    templateEditor: {
      selectedPageId: page.id,
      template: {
        layout: {
          pages: [page],
        },
      },
    },
  };
}

test("page number commit updates current appState page instead of stale bound page", async () => {
  installDomStubs();
  const { commitPageNumberControlsToPage } = await importClientModule("page-number-controls.js");
  const stalePage = {
    id: "page-content",
    settings: {
      pageNumber: { enabled: false, preset: "numericCurrentTotal" },
    },
    type: "content",
  };
  const currentPage = structuredClone(stalePage);
  const enabledControl = new FakeInputElement({ checked: true });
  const presetControl = new FakeSelectElement({ value: "koreanPage" });
  const sectionElement = createSection({
    '[data-examlist-page-number-setting="enabled"]': enabledControl,
    '[data-examlist-page-number-setting="preset"]': presetControl,
  });
  const pagePropertiesHost = createPagePropertiesHost(".examlist-page-number-field", sectionElement);

  const committed = commitPageNumberControlsToPage({
    appState: createAppState(currentPage),
    pagePropertiesHost,
    selectedPage: stalePage,
  });

  assert.equal(committed, true);
  assert.deepEqual(currentPage.settings.pageNumber, {
    enabled: true,
    preset: "koreanPage",
  });
  assert.equal(stalePage.settings.pageNumber.enabled, false);
});

test("recognition marks commit updates current appState page instead of stale bound page", async () => {
  installDomStubs();
  const { commitRecognitionMarksControlsToPage } = await importClientModule("recognition-marks-controls.js");
  const stalePage = {
    id: "page-content",
    settings: {
      recognitionMarks: { enabled: false, offsetXPt: 14.17, offsetYPt: 14.17, sizePt: 11.34 },
    },
    type: "content",
  };
  const currentPage = structuredClone(stalePage);
  const sectionElement = createSection({
    '[data-examlist-recognition-setting="enabled"]': new FakeInputElement({ checked: true }),
    '[data-examlist-recognition-setting="offsetX"]': new FakeInputElement({ type: "number", value: "7" }),
    '[data-examlist-recognition-setting="offsetY"]': new FakeInputElement({ type: "number", value: "8" }),
  });
  const pagePropertiesHost = createPagePropertiesHost(".examlist-recognition-marks-field", sectionElement);

  const committed = commitRecognitionMarksControlsToPage({
    appState: createAppState(currentPage),
    pagePropertiesHost,
    selectedPage: stalePage,
  });

  assert.equal(committed, true);
  assert.equal(currentPage.settings.recognitionMarks.enabled, true);
  assert.notEqual(currentPage.settings.recognitionMarks.offsetXPt, stalePage.settings.recognitionMarks.offsetXPt);
  assert.equal(stalePage.settings.recognitionMarks.enabled, false);
});

test("recognition marks commit does not create disabled default config", async () => {
  installDomStubs();
  const { commitRecognitionMarksControlsToPage } = await importClientModule("recognition-marks-controls.js");
  const page = {
    id: "page-cover",
    settings: {},
    type: "cover",
  };
  const sectionElement = createSection({
    '[data-examlist-recognition-setting="enabled"]': new FakeInputElement({ checked: false }),
    '[data-examlist-recognition-setting="offsetX"]': new FakeInputElement({ type: "number", value: "5" }),
    '[data-examlist-recognition-setting="offsetY"]': new FakeInputElement({ type: "number", value: "5" }),
  });
  const pagePropertiesHost = createPagePropertiesHost(".examlist-recognition-marks-field", sectionElement);

  const committed = commitRecognitionMarksControlsToPage({
    appState: createAppState(page),
    pagePropertiesHost,
    selectedPage: page,
  });

  assert.equal(committed, true);
  assert.equal(Object.hasOwn(page.settings, "recognitionMarks"), false);
});

test("other room page commit updates current appState page instead of stale bound page", async () => {
  installDomStubs();
  const { commitOtherRoomPageControlsToPage } = await importClientModule("other-room-page-controls.js");
  const stalePage = {
    id: "page-content",
    settings: {
      otherRoomPage: { enabled: false },
    },
    type: "content",
  };
  const currentPage = structuredClone(stalePage);
  const sectionElement = createSection({
    '[data-examlist-other-room-page-setting="enabled"]': new FakeInputElement({ checked: true }),
  });
  const pagePropertiesHost = createPagePropertiesHost(".examlist-other-room-page-field", sectionElement);

  const committed = commitOtherRoomPageControlsToPage({
    appState: createAppState(currentPage),
    pagePropertiesHost,
    selectedPage: stalePage,
  });

  assert.equal(committed, true);
  assert.deepEqual(currentPage.settings.otherRoomPage, { enabled: true });
  assert.equal(stalePage.settings.otherRoomPage.enabled, false);
});

test("cover page commit updates current appState page instead of stale bound page", async () => {
  installDomStubs();
  const { commitCoverPageControlsToPage } = await importClientModule("editor-runtime-page-controls.js");
  const stalePage = {
    enabled: true,
    id: "page-cover",
    settings: {},
    type: "cover",
  };
  const currentPage = structuredClone(stalePage);
  const sectionElement = createSection({
    '[data-examlist-cover-page-setting="enabled"]': new FakeInputElement({ checked: false }),
  });
  const pagePropertiesHost = createPagePropertiesHost(".examlist-cover-page-field", sectionElement);

  const committed = commitCoverPageControlsToPage({
    appState: createAppState(currentPage),
    pagePropertiesHost,
    selectedPage: stalePage,
  });

  assert.equal(committed, true);
  assert.equal(currentPage.enabled, false);
  assert.equal(stalePage.enabled, true);
});
