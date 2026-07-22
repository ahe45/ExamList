import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateEstimatedGenerationSeconds,
  calculateServerSyncedElapsedSeconds,
  formatActiveGenerationDuration,
  getActiveGenerationProgressViewModel,
} from "./pdf-generation-active-progress.js";

test("calculateEstimatedGenerationSeconds estimates total duration from completed work", () => {
  assert.equal(calculateEstimatedGenerationSeconds({ completedCount: 5, elapsedSeconds: 10, totalRequested: 20 }), 40);
  assert.equal(calculateEstimatedGenerationSeconds({ completedCount: 0, elapsedSeconds: 10, totalRequested: 20 }), 0);
});

test("calculateServerSyncedElapsedSeconds advances from the server elapsed time", () => {
  assert.equal(
    calculateServerSyncedElapsedSeconds({
      elapsedSeconds: 12,
      elapsedSyncedAtMs: 1000,
      serverElapsedSeconds: 12,
    }, 4500),
    15,
  );
});

test("calculateServerSyncedElapsedSeconds ignores browser clock values before the server sync", () => {
  assert.equal(
    calculateServerSyncedElapsedSeconds({
      elapsedSeconds: 7,
      elapsedSyncedAtMs: 5000,
      serverElapsedSeconds: 7,
    }, 1000),
    7,
  );
});

test("calculateServerSyncedElapsedSeconds accepts a monotonic sync time of zero", () => {
  assert.equal(
    calculateServerSyncedElapsedSeconds({
      elapsedSeconds: 0,
      elapsedSyncedAtMs: 0,
      serverElapsedSeconds: 0,
    }, 1200),
    1,
  );
});

test("formatActiveGenerationDuration formats short and long durations", () => {
  assert.equal(formatActiveGenerationDuration(65), "01:05");
  assert.equal(formatActiveGenerationDuration(3661), "1:01:01");
});

test("getActiveGenerationProgressViewModel clamps progress and formats labels", () => {
  assert.deepEqual(
    getActiveGenerationProgressViewModel({
      batchId: "batch-1",
      canCancel: true,
      completedCount: 3,
      elapsedSeconds: 30,
      estimatedSeconds: 90,
      label: "생성 중",
      progressPercent: 120,
      totalRequested: 10,
    }),
    {
      canCancel: true,
      completedText: "진행 3개 / 총 10개",
      durationText: "시간 00:30 / 예상 01:30",
      label: "생성 중",
      progressPercent: 100,
    },
  );
});
