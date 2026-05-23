const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createPdfGenerationChunkPlans,
  createPdfGenerationChunksForTarget,
  getChunkPlanSummary,
} = require("./chunks");

test("createPdfGenerationChunksForTarget splits large target into page-sized chunks", () => {
  const chunks = createPdfGenerationChunksForTarget(
    {
      candidateCount: 1201,
      name: "101호",
    },
    {
      chunkSize: 500,
      targetIndex: 2,
    },
  );

  assert.equal(chunks.length, 3);
  assert.deepEqual(chunks.map((chunk) => chunk.candidatePage), [1, 2, 3]);
  assert.deepEqual(chunks.map((chunk) => chunk.requestedCandidateCount), [500, 500, 201]);
  assert.equal(chunks[0].displayTargetName, "101호 (1/3)");
  assert.equal(chunks[2].targetIndex, 2);
});

test("createPdfGenerationChunkPlans summarizes chunk count and candidates", () => {
  const plans = createPdfGenerationChunkPlans(
    [
      { candidateCount: 50, name: "101호" },
      { candidateCount: 51, name: "102호" },
    ],
    { chunkSize: 50 },
  );
  const summary = getChunkPlanSummary(plans);

  assert.equal(plans.length, 3);
  assert.equal(summary.chunkCount, 3);
  assert.equal(summary.targetCount, 2);
  assert.equal(summary.totalCandidateCount, 101);
});
