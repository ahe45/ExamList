import test from "node:test";
import assert from "node:assert/strict";

import { getDataDeletionSelectedFilterKeysAfterSelection } from "./actions.js";

test("data deletion auto-selects upper units as all when selecting a lower unit", () => {
  assert.deepEqual(
    getDataDeletionSelectedFilterKeysAfterSelection({
      selectedFilterKeys: [],
      stepKey: "examDate",
      value: "2026-01-01",
    }),
    ["campus", "track", "admission", "series", "unit", "major", "examDate"],
  );
});

test("data deletion keeps independent required units when changing one required unit", () => {
  assert.deepEqual(
    getDataDeletionSelectedFilterKeysAfterSelection({
      selectedFilterKeys: ["campus", "track", "admission", "series", "unit"],
      stepKey: "campus",
      value: "서울",
    }),
    ["campus", "track", "admission"],
  );
});
