import test from "node:test";
import assert from "node:assert/strict";

import {
  formatCount,
  formatCountWithUnit,
  formatDecimalNumber,
  formatOptionalCountWithUnit,
} from "./number-format.js";

test("formatCount applies Korean thousands separators to count values", () => {
  assert.equal(formatCount(1234), "1,234");
  assert.equal(formatCount("1,234"), "1,234");
  assert.equal(formatCount("9876543"), "9,876,543");
  assert.equal(formatCount(null), "0");
});

test("formatCountWithUnit and optional counts preserve fallback behavior", () => {
  assert.equal(formatCountWithUnit(1234, "건"), "1,234건");
  assert.equal(formatOptionalCountWithUnit("", "명"), "-");
  assert.equal(formatOptionalCountWithUnit(2500, "명"), "2,500명");
});

test("formatDecimalNumber formats decimal values with separators", () => {
  assert.equal(formatDecimalNumber(1536.25, 1), "1,536.3");
});
