const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildGenerationRequestSummary,
  buildGenerationRequestSnapshot,
  restoreGenerationRequestFromHistory,
} = require("./service");

test("buildGenerationRequestSnapshot stores resolved target filters for grouped generation", () => {
  const snapshot = buildGenerationRequestSnapshot({
    candidates: [{ roomCode: "R101", roomName: "101호" }],
    request: {
      generationUnit: "room",
      templateId: "template-1",
    },
    template: {
      generationUnit: "room",
      id: "template-1",
      layout: { pages: [] },
      name: "고사실 템플릿",
      orientation: "portrait",
      paperPreset: "A4",
    },
  });

  assert.equal(snapshot.targetName, "R101");
  assert.deepEqual(snapshot.filters, {
    roomCode: "R101",
  });
  assert.equal(snapshot.template?.id, "template-1");
});

test("buildGenerationRequestSnapshot stores unique display scope from generated candidates", () => {
  const snapshot = buildGenerationRequestSnapshot({
    candidates: [
      {
        admission: "논술",
        building: "1고사관",
        endTime: "10:00",
        examDate: "2026-05-19",
        major: "국어국문",
        period: "1교시",
        room: "101호",
        roomCode: "R101",
        time: "09:00",
        track: "수시",
        unit: "인문대학",
      },
      {
        admission: "논술",
        building: "1고사관",
        endTime: "10:00",
        examDate: "2026-05-19",
        major: "영어영문",
        period: "1교시",
        room: "101호",
        roomCode: "R101",
        time: "09:00",
        track: "수시",
        unit: "인문대학",
      },
    ],
    request: {
      filters: {
        admissionCode: "A01",
      },
      generationUnit: "roomCode",
      templateId: "template-1",
    },
    template: {
      generationUnit: "roomCode",
      id: "template-1",
      layout: { pages: [] },
      name: "고사실 템플릿",
    },
  });

  assert.deepEqual(snapshot.resultScope, {
    admission: "논술",
    building: "1고사관",
    endTime: "10:00",
    examDate: "2026-05-19",
    period: "1교시",
    room: "101호",
    time: "09:00",
    track: "수시",
    unit: "인문대학",
  });
  assert.equal(snapshot.resultScope.major, undefined);
  assert.equal(snapshot.filters.admissionCode, "A01");
});

test("restoreGenerationRequestFromHistory rebuilds rerun payload from stored request json", () => {
  const restored = restoreGenerationRequestFromHistory(
    {
      generationUnit: "room",
      requestJson: JSON.stringify({
        filters: {},
        generationUnit: "room",
        targetName: "R101",
        template: {
          generationUnit: "room",
          id: "template-1",
          layout: { pages: [] },
          name: "고사실 템플릿",
          orientation: "portrait",
          paperPreset: "A4",
        },
      }),
      targetName: "",
      templateId: "template-1",
    },
    (statusCode, message, errorCode) => Object.assign(new Error(message), { errorCode, statusCode }),
  );

  assert.deepEqual(restored.filters, {
    roomCode: "R101",
  });
  assert.equal(restored.templateId, "template-1");
  assert.equal(restored.targetName, "R101");
});

test("buildGenerationRequestSummary returns filter labels and template snapshot summary", () => {
  const summary = buildGenerationRequestSummary({
    generationUnit: "room",
    requestJson: JSON.stringify({
      filters: {
        roomCode: "R101",
        track: "면접고사",
      },
      generationUnit: "room",
      targetName: "R101",
      template: {
        generationUnit: "room",
        id: "template-1",
        layout: { pages: [{ id: "page-1" }, { id: "page-2" }] },
        name: "고사실 템플릿",
        orientation: "portrait",
        paperPreset: "A4",
      },
    }),
    targetName: "R101",
    templateId: "template-1",
  });

  assert.equal(summary.available, true);
  assert.equal(summary.targetName, "R101");
  assert.equal(summary.template?.pageCount, 2);
  assert.deepEqual(summary.filters, [
    { key: "roomCode", label: "고사실코드", value: "R101" },
    { key: "track", label: "모집시기", value: "면접고사" },
  ]);
});
