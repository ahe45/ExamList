const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getGenerationTargetStrategy,
  normalizeArchiveFileName,
  normalizeArchiveGenerationIds,
  normalizeTargetNames,
  resolveGenerationTargets,
} = require("./service");

test("getGenerationTargetStrategy returns filter mapping for room generation", () => {
  const strategy = getGenerationTargetStrategy("room");

  assert.equal(strategy.filterKey, "roomCode");
  assert.equal(strategy.groupBy, "roomCode");
  assert.equal(strategy.label, "고사실코드");
});

test("resolveGenerationTargets groups room generation by room only", async () => {
  let capturedGroupBy = null;
  const result = await resolveGenerationTargets({
    candidateService: {
      async findCandidateGroups(_filters, groupBy) {
        capturedGroupBy = groupBy;
        return [
          {
            candidateCount: 12,
            filters: {
              roomCode: "R101",
            },
            name: "R101",
          },
        ];
      },
    },
    createHttpError: (statusCode, message, errorCode) => Object.assign(new Error(message), { errorCode, statusCode }),
    filters: {
      schoolId: "school-1",
    },
    generationUnit: "roomCode",
  });

  assert.equal(capturedGroupBy, "roomCode");
  assert.deepEqual(result.items, [
    {
      candidateCount: 12,
      filters: {
        roomCode: "R101",
      },
      name: "R101",
    },
  ]);
});

test("resolveGenerationTargets groups by configured generation unit priorities", async () => {
  let capturedGroupBy = null;
  const result = await resolveGenerationTargets({
    candidateService: {
      async findCandidateGroups(_filters, groupBy) {
        capturedGroupBy = groupBy;
        return [
          {
            candidateCount: 8,
            filters: {
              date: "2026-05-22",
              periodCode: "1",
              roomCode: "101",
            },
            name: "2026-05-22 / 1 / 101",
          },
        ];
      },
    },
    createHttpError: (statusCode, message, errorCode) => Object.assign(new Error(message), { errorCode, statusCode }),
    filters: {
      schoolId: "school-1",
    },
    generationUnit: "custom",
    generationUnitFields: ["date", "periodCode", "roomCode"],
  });

  assert.deepEqual(capturedGroupBy, ["date", "periodCode", "roomCode"]);
  assert.equal(result.label, "날짜 / 교시 코드 / 고사실 코드");
  assert.deepEqual(result.items, [
    {
      candidateCount: 8,
      filters: {
        date: "2026-05-22",
        periodCode: "1",
        roomCode: "101",
      },
      name: "2026-05-22 / 1 / 101",
    },
  ]);
});

test("normalizeTargetNames trims empty values and removes duplicates", () => {
  assert.deepEqual(normalizeTargetNames([" 101호 ", "", "101호", "102호"]), ["101호", "102호"]);
});

test("normalizeArchiveGenerationIds trims ids and removes duplicates", () => {
  assert.deepEqual(
    normalizeArchiveGenerationIds([" generation-1 ", "", "generation-1", "generation-2"]),
    ["generation-1", "generation-2"],
  );
});

test("normalizeArchiveFileName sanitizes invalid characters and appends zip extension", () => {
  assert.equal(normalizeArchiveFileName('고사실/배치:1'), "고사실_배치_1.zip");
});
