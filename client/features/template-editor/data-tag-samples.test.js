const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

test("data tag sample values keep editable blanks and fall back to defaults", async () => {
  const {
    buildDefaultDataTagEmptyValueData,
    buildDefaultDataTagSampleValues,
    normalizeDataTagEmptyValueData,
    normalizeDataTagSampleValues,
  } = await importClientModule("data-tag-samples.js");
  const definitions = [
    { example: "홍길동", key: "candidate.name", label: "이름" },
    { example: "101호", key: "candidate.roomName", label: "고사실명" },
    { example: "사진", key: "candidate.photo", label: "수험생 사진" },
  ];

  assert.deepEqual(buildDefaultDataTagSampleValues(definitions), {
    "candidate.name": "홍길동",
    "candidate.photo": "사진",
    "candidate.roomName": "101호",
  });
  assert.deepEqual(buildDefaultDataTagEmptyValueData(definitions), {
    "candidate.name": "이름",
    "candidate.photo": "사진",
    "candidate.roomName": "고사실명",
  });
  assert.deepEqual(normalizeDataTagSampleValues(definitions, { "candidate.name": "" }), {
    "candidate.name": "",
    "candidate.photo": "사진",
    "candidate.roomName": "101호",
  });
  assert.deepEqual(normalizeDataTagEmptyValueData(definitions, { "candidate.roomName": "빈 고사실" }), {
    "candidate.name": "이름",
    "candidate.photo": "사진",
    "candidate.roomName": "빈 고사실",
  });
});

test("data tag settings modal renders collapsed accordion groups with sample and empty value inputs", async () => {
  const { renderDataTagSampleModal } = await importClientModule("data-tag-samples-renderer.js");
  const html = renderDataTagSampleModal({
    dataTags: { groups: [] },
    dataTagSampleModal: {
      draftEmptyValueData: {},
      draftValues: {},
      isOpen: true,
    },
    dataTagEmptyValueData: {},
    dataTagSampleValues: {},
  });

  const groupMatches = html.match(/<details class="template-tag-accordion-group">/g) || [];
  const rowMatches = html.match(/data-data-tag-sample-key="/g) || [];
  const emptyValueMatches = html.match(/data-data-tag-empty-value-key="/g) || [];

  assert.ok(groupMatches.length > 1);
  assert.ok(rowMatches.length > groupMatches.length);
  assert.equal(emptyValueMatches.length, rowMatches.length);
  assert.doesNotMatch(html, /<details\b[^>]*\bopen\b/i);
  assert.match(html, /데이터 태그 설정/);
  assert.match(html, /샘플데이터/);
  assert.match(html, /빈 값 데이터/);
  assert.match(html, /class="template-tag-accordion data-tag-sample-accordion"/);
  assert.match(html, /class="template-tag-accordion-summary"/);
  assert.match(html, /class="template-tag-group-count"/);
  assert.match(html, /class="template-tag-button template-tag-accordion-button data-tag-sample-tag"/);
  assert.match(html, /data-data-tag-empty-value-key="school\.name"[\s\S]*value="학교명"/);
  assert.match(html, /data-data-tag-sample-key="row\.indexInPage"[\s\S]*value="1"/);
  assert.match(html, /순번/);
  assert.match(
    html,
    /data-tag-sample-tag"[\s\S]*data-data-tag-sample-key="[\s\S]*data-data-tag-empty-value-key="/,
  );
});

test("saving data tag settings can persist immediately without marking editor dirty", async () => {
  const { createDataTagSampleActions } = await importClientModule("data-tag-sample-actions.js");
  const appState = {
    templateEditor: {
      dataTags: {
        groups: [
          {
            tags: [
              { example: "홍길동", key: "candidate.name", label: "이름", type: "string" },
            ],
          },
        ],
      },
      dataTagEmptyValueData: {
        "candidate.name": "이름",
      },
      dataTagSampleModal: {
        draftEmptyValueData: {
          "candidate.name": "빈 이름",
        },
        draftValues: {
          "candidate.name": "김철수",
        },
        isOpen: true,
      },
      dataTagSampleValues: {
        "candidate.name": "홍길동",
      },
      isDirty: false,
      template: {
        layout: {
          dataTagSettings: {},
          pages: [{ id: "page-1" }],
        },
      },
    },
  };
  let persistedSettings = null;
  let renderCount = 0;
  const actions = createDataTagSampleActions({
    appState,
    onSaveDataTagSettings: async () => {
      persistedSettings = appState.templateEditor.template.layout.dataTagSettings;
      return true;
    },
    onStateChange: async () => {
      renderCount += 1;
    },
  });

  await actions.saveDataTagSampleModal();

  assert.equal(persistedSettings.sampleData["candidate.name"], "김철수");
  assert.equal(persistedSettings.emptyValueData["candidate.name"], "빈 이름");
  assert.equal(appState.templateEditor.isDirty, false);
  assert.equal(appState.templateEditor.dataTagSampleModal.isOpen, false);
  assert.ok(renderCount >= 1);
});
