const test = require("node:test");
const assert = require("node:assert/strict");

const { buildPdfGenerationChunkRequest } = require("./batch-generation-runner");

test("buildPdfGenerationChunkRequest keeps original target filter and stores chunk range", () => {
  const request = buildPdfGenerationChunkRequest({
    chunkPlan: {
      candidateOffset: 500,
      candidatePage: 2,
      chunkCount: 3,
      chunkIndex: 2,
      chunkSize: 500,
      displayTargetName: "101호 (2/3)",
      requestedCandidateCount: 500,
      targetCandidateCount: 1201,
      targetIndex: 1,
      targetName: "101호",
    },
    request: {
      filters: {
        campus: "서울",
      },
    },
    strategy: {
      filterKey: "room",
    },
    templateRequest: {
      candidateSort: {
        sortDirection: "asc",
        sortKey: "examineeNo",
      },
      schoolId: "school-1",
      templateId: "template-1",
    },
  });

  assert.equal(request.targetName, "101호 (2/3)");
  assert.equal(request.candidatePage, 2);
  assert.equal(request.sampleLimit, 500);
  assert.deepEqual(request.filters, {
    campus: "서울",
    room: "101호",
  });
  assert.deepEqual(request.chunk, {
    candidateOffset: 500,
    candidatePage: 2,
    chunkCount: 3,
    chunkIndex: 2,
    chunkSize: 500,
    requestedCandidateCount: 500,
    targetCandidateCount: 1201,
    targetIndex: 1,
    targetName: "101호",
  });
});

test("buildPdfGenerationChunkRequest applies composite target filters when present", () => {
  const request = buildPdfGenerationChunkRequest({
    chunkPlan: {
      candidatePage: 1,
      chunkCount: 1,
      chunkIndex: 1,
      chunkSize: 500,
      displayTargetName: "A / S / 2026-05-19 / P1 / U / B / R101",
      requestedCandidateCount: 30,
      targetCandidateCount: 30,
      targetFilters: {
        admissionCode: "A",
        buildingCode: "B",
        examDate: "2026-05-19",
        periodCode: "P1",
        roomCode: "R101",
        seriesCode: "S",
        unitCode: "U",
      },
      targetIndex: 1,
      targetName: "A / S / 2026-05-19 / P1 / U / B / R101",
    },
    request: {
      filters: {
        campus: "서울",
      },
    },
    strategy: {
      filterKey: "roomCode",
    },
    templateRequest: {
      schoolId: "school-1",
      templateId: "template-1",
    },
  });

  assert.deepEqual(request.filters, {
    admissionCode: "A",
    buildingCode: "B",
    campus: "서울",
    examDate: "2026-05-19",
    periodCode: "P1",
    roomCode: "R101",
    seriesCode: "S",
    unitCode: "U",
  });
});
