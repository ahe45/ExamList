const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getGenerationMergeSortFieldKeys,
  sortGenerationFilesForMergedDownload,
} = require("./archive-ordering");

function createGenerationFile({
  filters = {},
  generationId,
  generationUnit = "custom",
  generationUnitFields = ["date", "periodCode", "roomCode"],
  targetName = "",
  chunk = null,
}) {
  return {
    generationId,
    generationUnit,
    requestJson: JSON.stringify({
      chunk,
      filters,
      generationUnit,
      targetName,
      template: {
        layout: {
          generation: {
            unitFields: generationUnitFields,
          },
        },
      },
    }),
    targetName,
  };
}

test("sortGenerationFilesForMergedDownload sorts by configured generation unit fields", () => {
  const sortedFiles = sortGenerationFilesForMergedDownload([
    createGenerationFile({
      filters: { date: "2026-05-20", periodCode: "1", roomCode: "R101" },
      generationId: "generation-3",
      targetName: "2026-05-20 / 1 / R101",
    }),
    createGenerationFile({
      filters: { date: "2026-05-19", periodCode: "2", roomCode: "R102" },
      generationId: "generation-2",
      targetName: "2026-05-19 / 2 / R102",
    }),
    createGenerationFile({
      filters: { date: "2026-05-19", periodCode: "1", roomCode: "R101" },
      generationId: "generation-1",
      targetName: "2026-05-19 / 1 / R101",
    }),
  ]);

  assert.deepEqual(
    sortedFiles.map((file) => file.generationId),
    ["generation-1", "generation-2", "generation-3"],
  );
});

test("sortGenerationFilesForMergedDownload keeps chunks in chunk index order inside the same target", () => {
  const sortedFiles = sortGenerationFilesForMergedDownload([
    createGenerationFile({
      chunk: { chunkIndex: 2, targetIndex: 1 },
      filters: { date: "2026-05-19", periodCode: "1", roomCode: "R101" },
      generationId: "generation-1-2",
    }),
    createGenerationFile({
      chunk: { chunkIndex: 1, targetIndex: 1 },
      filters: { date: "2026-05-19", periodCode: "1", roomCode: "R101" },
      generationId: "generation-1-1",
    }),
  ]);

  assert.deepEqual(
    sortedFiles.map((file) => file.generationId),
    ["generation-1-1", "generation-1-2"],
  );
});

test("sortGenerationFilesForMergedDownload sorts standard generation unit values naturally", () => {
  const sortedFiles = sortGenerationFilesForMergedDownload([
    createGenerationFile({
      filters: { roomCode: "R10" },
      generationId: "generation-r10",
      generationUnit: "roomCode",
      generationUnitFields: [],
      targetName: "R10",
    }),
    createGenerationFile({
      filters: { roomCode: "R2" },
      generationId: "generation-r2",
      generationUnit: "roomCode",
      generationUnitFields: [],
      targetName: "R2",
    }),
    createGenerationFile({
      filters: { roomCode: "R1" },
      generationId: "generation-r1",
      generationUnit: "roomCode",
      generationUnitFields: [],
      targetName: "R1",
    }),
  ]);

  assert.deepEqual(
    sortedFiles.map((file) => file.generationId),
    ["generation-r1", "generation-r2", "generation-r10"],
  );
});

test("getGenerationMergeSortFieldKeys reads fields from the stored template snapshot", () => {
  assert.deepEqual(
    getGenerationMergeSortFieldKeys(
      createGenerationFile({
        generationUnitFields: ["periodCode", "roomCode"],
        generationId: "generation-1",
      }),
    ),
    ["periodCode", "roomCode"],
  );
});

test("getGenerationMergeSortFieldKeys ignores stale custom fields for standard generation units", () => {
  assert.deepEqual(
    getGenerationMergeSortFieldKeys(
      createGenerationFile({
        generationId: "generation-1",
        generationUnit: "roomCode",
        generationUnitFields: ["date", "periodCode", "roomCode"],
      }),
    ),
    ["roomCode"],
  );
});
