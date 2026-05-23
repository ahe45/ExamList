import test from "node:test";
import assert from "node:assert/strict";

import {
  getPdfGenerationRevealedFilterSteps,
  getPdfGenerationSelectedFilterKeysAfterSelection,
  getPdfGenerationVisibleFilterSteps,
  resetPdfGenerationFiltersAfterSelection,
} from "./pdf-generation-flow.js";

test("PDF generation create flow always reveals through series", () => {
  assert.deepEqual(
    getPdfGenerationRevealedFilterSteps([], "roomCode").map((step) => step.key),
    ["campus", "track", "admission", "series"],
  );
  assert.deepEqual(
    getPdfGenerationVisibleFilterSteps("admission").map((step) => step.key),
    ["campus", "track", "admission", "series"],
  );
});

test("PDF generation create flow does not reveal unit until series is selected", () => {
  assert.deepEqual(
    getPdfGenerationRevealedFilterSteps(["campus", "track", "admission"], "roomCode").map((step) => step.key),
    ["campus", "track", "admission", "series"],
  );
  assert.deepEqual(
    getPdfGenerationRevealedFilterSteps(["campus", "track", "admission", "series"], "roomCode").map((step) => step.key),
    ["campus", "track", "admission", "series", "unit"],
  );
});

test("PDF generation independent required filters do not clear each other", () => {
  const nextFilters = resetPdfGenerationFiltersAfterSelection(
    {
      admission: "논술",
      campus: "서울",
      series: "인문",
      track: "수시",
    },
    "campus",
    "roomCode",
  );
  const nextSelectedKeys = getPdfGenerationSelectedFilterKeysAfterSelection({
    generationUnit: "roomCode",
    selectedFilterKeys: ["campus", "track", "admission", "series"],
    stepKey: "campus",
    value: "서울",
  });

  assert.equal(nextFilters.track, "수시");
  assert.equal(nextFilters.admission, "논술");
  assert.equal(nextFilters.series, "");
  assert.deepEqual(nextSelectedKeys, ["campus", "track", "admission"]);
});

test("selecting admission all selects missing upper filters as all", () => {
  assert.deepEqual(
    getPdfGenerationSelectedFilterKeysAfterSelection({
      generationUnit: "roomCode",
      selectedFilterKeys: [],
      stepKey: "admission",
      value: "",
    }),
    ["campus", "track", "admission"],
  );
});

test("selecting admission first selects missing upper filters as all", () => {
  assert.deepEqual(
    getPdfGenerationSelectedFilterKeysAfterSelection({
      generationUnit: "roomCode",
      selectedFilterKeys: [],
      stepKey: "admission",
      value: "논술",
    }),
    ["campus", "track", "admission"],
  );
});
