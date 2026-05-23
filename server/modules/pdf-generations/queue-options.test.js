const test = require("node:test");
const assert = require("node:assert/strict");

const {
  calculateExpiryDate,
  normalizeGenerationChunkSize,
  normalizeProgressPercent,
  normalizeRetentionDays,
  normalizeRetryAttempts,
} = require("./service");

test("queue progress, retry, and retention helpers clamp values", () => {
  assert.equal(normalizeProgressPercent(150), 100);
  assert.equal(normalizeProgressPercent(-1), 0);
  assert.equal(normalizeRetryAttempts(9), 5);
  assert.equal(normalizeRetryAttempts(0), 1);
  assert.equal(normalizeGenerationChunkSize(10), 50);
  assert.equal(normalizeGenerationChunkSize(9999), 5000);
  assert.equal(normalizeRetentionDays(-10), 0);
  assert.equal(normalizeRetentionDays(9999), 3650);
});

test("calculateExpiryDate adds retention days and supports disabled retention", () => {
  assert.equal(calculateExpiryDate(new Date("2026-04-01T00:00:00Z"), 0), null);
  assert.equal(
    calculateExpiryDate(new Date("2026-04-01T00:00:00Z"), 30).toISOString(),
    "2026-05-01T00:00:00.000Z",
  );
});
