const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeGenerationListFilter,
  normalizeGenerationRequestFilters,
} = require("./service");

test("normalizeGenerationListFilter trims text and validates status", () => {
  const filter = normalizeGenerationListFilter({
    generationUnit: " room ",
    keyword: " 101호 ",
    limit: "500",
    status: "completed",
    templateId: " template-1 ",
  });

  assert.deepEqual(filter, {
    generationUnit: "room",
    keyword: "101호",
    limit: 100,
    page: 1,
    status: "completed",
    templateId: "template-1",
  });
});

test("normalizeGenerationListFilter clears unsupported status", () => {
  const filter = normalizeGenerationListFilter({
    limit: "0",
    status: "pending",
  });

  assert.equal(filter.limit, 1);
  assert.equal(filter.status, "");
});

test("normalizeGenerationListFilter accepts queued and running statuses", () => {
  assert.equal(normalizeGenerationListFilter({ status: "queued" }).status, "queued");
  assert.equal(normalizeGenerationListFilter({ status: "running" }).status, "running");
});

test("normalizeGenerationRequestFilters trims values and removes empty entries", () => {
  assert.deepEqual(
    normalizeGenerationRequestFilters({
      admission: " 수시 ",
      empty: "   ",
      page: 1,
      room: " 101호 ",
    }),
    {
      admission: "수시",
      page: "1",
      room: "101호",
    },
  );
});
