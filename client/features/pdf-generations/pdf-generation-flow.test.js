import test from "node:test";
import assert from "node:assert/strict";

import {
  autoSelectSingleFilterOptions,
  getPdfGenerationRevealedFilterSteps,
  getPdfGenerationSelectedFilterKeysAfterSelection,
  getPdfGenerationVisibleFilterSteps,
  resetPdfGenerationFiltersAfterSelection,
} from "./pdf-generation-flow.js";

test("single-option selection respects explicit all, chosen values and visible fields", () => {
  const modal = { filters: { track: "", admission: "수시" }, selectedFilterKeys: ["track", "admission"], options: {
    track: [{ value: "정시" }], admission: [{ value: "논술" }],
    series: [{ value: " 인문 " }, { value: "인문" }, { value: "" }],
    unit: [{ value: "학과1" }, { value: "학과2" }], major: [{ value: " " }], room: [{ value: "101" }],
  } };
  assert.equal(autoSelectSingleFilterOptions(modal, ["track", "admission", "series", "unit", "major"]), true);
  assert.deepEqual(modal.filters, { track: "", admission: "수시", series: "인문" });
  assert.deepEqual(modal.selectedFilterKeys, ["track", "admission", "series"]);
  assert.equal(autoSelectSingleFilterOptions(modal, ["track", "admission", "series", "unit", "major"]), false);
});

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
