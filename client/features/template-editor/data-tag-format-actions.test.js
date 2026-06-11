const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

test("openDataTagFormatModal ignores unsupported data tags", async () => {
  const { createDataTagFormatActions } = await importClientModule("data-tag-format-actions.js");
  const appState = {
    templateEditor: {
      dataTags: {
        groups: [
          {
            tags: [
              { key: "candidate.name", label: "이름", type: "string" },
            ],
          },
        ],
      },
    },
  };
  let stateChangeCount = 0;
  const actions = createDataTagFormatActions({
    appState,
    canManageTemplates: () => true,
    onStateChange: async () => {
      stateChangeCount += 1;
    },
    syncSelectedPageDocumentHtml: () => {},
  });

  const didOpen = await actions.openDataTagFormatModal({
    dataset: {
      templateTagValue: "candidate.name",
    },
  });

  assert.equal(didOpen, false);
  assert.equal(stateChangeCount, 0);
  assert.equal(appState.templateEditor.dataTagFormatModal, undefined);
});

test("openDataTagFormatModal opens for supported date and time data tags", async () => {
  const { createDataTagFormatActions } = await importClientModule("data-tag-format-actions.js");
  const appState = {
    templateEditor: {
      dataTags: {
        groups: [
          {
            tags: [
              { key: "candidate.examDate", label: "시험날짜", type: "date" },
            ],
          },
        ],
      },
    },
  };
  let stateChangeCount = 0;
  const actions = createDataTagFormatActions({
    appState,
    canManageTemplates: () => true,
    onStateChange: async () => {
      stateChangeCount += 1;
    },
    syncSelectedPageDocumentHtml: () => {},
  });

  const didOpen = await actions.openDataTagFormatModal({
    closest: () => null,
    dataset: {
      templateTagValue: "candidate.examDate",
    },
  });

  assert.equal(didOpen, true);
  assert.equal(stateChangeCount, 1);
  assert.equal(appState.templateEditor.dataTagFormatModal.isOpen, true);
  assert.equal(appState.templateEditor.dataTagFormatModal.isSupported, true);
  assert.equal(appState.templateEditor.dataTagFormatModal.formatType, "date");
});
