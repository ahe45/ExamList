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
    ["track", "admission", "series"],
  );
  assert.deepEqual(
    getPdfGenerationVisibleFilterSteps("admission").map((step) => step.key),
    ["track", "admission", "series"],
  );
});

test("PDF generation create flow reveals one dependent lower filter at a time", () => {
  assert.deepEqual(
    getPdfGenerationRevealedFilterSteps(["track", "admission"], "roomCode").map((step) => step.key),
    ["track", "admission", "series"],
  );
  assert.deepEqual(
    getPdfGenerationRevealedFilterSteps(["track", "admission", "series"], "roomCode").map((step) => step.key),
    ["track", "admission", "series", "unit"],
  );
  assert.deepEqual(
    getPdfGenerationRevealedFilterSteps(["track", "admission", "series", "unit"], "roomCode").map((step) => step.key),
    ["track", "admission", "series", "unit", "major"],
  );
  assert.deepEqual(
    getPdfGenerationRevealedFilterSteps(
      ["track", "admission", "series", "unit", "major", "examDate", "time", "endTime", "period", "building"],
      "roomCode",
    ).map((step) => step.key),
    ["track", "admission", "series", "unit", "major", "examDate", "time", "endTime", "period", "building", "room"],
  );
});

test("PDF generation independent required filters do not clear each other", () => {
  const nextFilters = resetPdfGenerationFiltersAfterSelection(
    {
      admission: "논술",
      series: "인문",
      track: "수시",
    },
    "track",
    "roomCode",
  );
  const nextSelectedKeys = getPdfGenerationSelectedFilterKeysAfterSelection({
    generationUnit: "roomCode",
    selectedFilterKeys: ["track", "admission", "series"],
    stepKey: "track",
    value: "수시",
  });

  assert.equal(nextFilters.track, "수시");
  assert.equal(nextFilters.admission, "논술");
  assert.equal(nextFilters.series, "");
  assert.deepEqual(nextSelectedKeys, ["track", "admission"]);
});

test("selecting admission all selects missing upper filters as all", () => {
  assert.deepEqual(
    getPdfGenerationSelectedFilterKeysAfterSelection({
      generationUnit: "roomCode",
      selectedFilterKeys: [],
      stepKey: "admission",
      value: "",
    }),
    ["track", "admission"],
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
    ["track", "admission"],
  );
});
