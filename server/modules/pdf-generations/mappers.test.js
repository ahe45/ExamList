const test = require("node:test");
const assert = require("node:assert/strict");

const { mapBatchRow, mapGenerationRow } = require("./mappers");

test("mapBatchRow exposes the elapsed time calculated by the server", () => {
  const row = mapBatchRow({
    elapsedSeconds: 12.9,
    id: "batch-1",
  });

  assert.equal(row.elapsedSeconds, 12);
});

test("mapGenerationRow prefers stored display result scope over request filters", () => {
  const row = mapGenerationRow({
    candidateCount: 10,
    fileSizeBytes: 1024,
    generationUnit: "roomCode",
    id: "generation-1",
    pageCount: 2,
    progressPercent: 100,
    requestJson: JSON.stringify({
      filters: {
        admissionCode: "A01",
        roomCode: "R101",
      },
      generationUnit: "roomCode",
      resultScope: {
        admission: "논술",
        campus: "서울",
        endTime: "10:00",
        room: "101호",
        time: "09:00",
        track: "수시",
      },
      targetName: "R101",
    }),
    status: "completed",
    targetName: "R101",
    templateName: "고사실 템플릿",
  });

  assert.equal(row.resultScope.campus, "서울");
  assert.equal(row.resultScope.track, "수시");
  assert.equal(row.resultScope.time, "09:00");
  assert.equal(row.resultScope.endTime, "10:00");
  assert.equal(row.resultScope.admission, "논술");
  assert.equal(row.resultScope.room, "101호");
  assert.equal(row.downloadUrl, "/api/pdf-generations/generation-1/download");
  assert.equal(row.printUrl, "/api/pdf-generations/generation-1/download?disposition=inline");
});
