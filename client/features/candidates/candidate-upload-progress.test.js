import test from "node:test";
import assert from "node:assert/strict";

import {
  clampProgressPercent,
  createFileProgressDetail,
  formatByteCount,
} from "./candidate-upload-progress.js";

test("candidate upload progress helpers clamp percent and format byte counts", () => {
  assert.equal(clampProgressPercent(-10), 0);
  assert.equal(clampProgressPercent(48.6), 49);
  assert.equal(clampProgressPercent(150), 100);
  assert.equal(clampProgressPercent(Number.NaN), 0);

  assert.equal(formatByteCount(0), "0B");
  assert.equal(formatByteCount(1024), "1KB");
  assert.equal(formatByteCount(12 * 1024 * 1024), "12MB");
});

test("createFileProgressDetail displays file progress with derived loaded bytes", () => {
  assert.equal(
    createFileProgressDetail({ name: "candidates.xlsx", size: 2000 }, { percent: 25 }),
    "candidates.xlsx · 500B / 1.95KB",
  );
  assert.equal(
    createFileProgressDetail({ name: "photos.zip" }, { loaded: 512 }),
    "photos.zip · 512B",
  );
});
