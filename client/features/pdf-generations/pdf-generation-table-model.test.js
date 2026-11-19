import test from "node:test";
import assert from "node:assert/strict";

import {
  applyPdfGenerationSequenceNumbers,
  getFilteredPdfGenerationRows,
  getPdfGenerationFilterOptionValues,
  getPdfGenerationTableState,
  pdfGenerationGridColumns,
} from "./pdf-generation-table-model.js";

test("PDF generation grid columns place sequence first and createdAt after candidate count", () => {
  const columnKeys = pdfGenerationGridColumns.map((column) => column.key);

  assert.equal(columnKeys.includes("templateName"), false);
  assert.equal(columnKeys.includes("status"), false);
  assert.equal(columnKeys.includes("generationUnit"), false);
  assert.equal(columnKeys[0], "sequenceNumber");
  assert.deepEqual(columnKeys.slice(-3), ["pageCount", "candidateCount", "createdAt"]);
});

test("applyPdfGenerationSequenceNumbers numbers rows by actual completion order", () => {
  const rows = applyPdfGenerationSequenceNumbers([
    {
      completedAt: "2026-05-19T10:03:00.000Z",
      createdAt: "2026-05-19T10:00:00.000Z",
      id: "third",
    },
    {
      completedAt: "2026-05-19T10:01:00.000Z",
      createdAt: "2026-05-19T10:00:00.000Z",
      id: "first",
    },
    {
      completedAt: "2026-05-19T10:02:00.000Z",
      createdAt: "2026-05-19T10:00:00.000Z",
      id: "second",
    },
  ]);

  assert.deepEqual(
    rows.map((row) => [row.id, row.sequenceNumber]),
    [
      ["third", 3],
      ["first", 1],
      ["second", 2],
    ],
  );
});

test("PDF generation grid defaults to sequence ascending sort", () => {
  assert.deepEqual(getPdfGenerationTableState({}).sortRules, [
    { key: "sequenceNumber", direction: "asc" },
  ]);

  const rows = getFilteredPdfGenerationRows({
    items: [
      { id: "second", sequenceNumber: 2 },
      { id: "first", sequenceNumber: 1 },
    ],
  });

  assert.deepEqual(rows.map((row) => row.id), ["first", "second"]);
});

test("PDF generation filters match each room in a multi-room PDF", () => {
  const grid = {
    items: [
      { id: "mixed", resultScopeValues: { room: ["101호", "102호"] } },
      { id: "single", resultScope: { room: "103호" } },
    ],
    table: { filters: { room: ["102호"] } },
  };

  assert.deepEqual(getPdfGenerationFilterOptionValues(grid, "room"), ["101호", "102호", "103호"]);
  assert.deepEqual(getFilteredPdfGenerationRows(grid).map((item) => item.id), ["mixed"]);
});
