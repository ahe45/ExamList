const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const {
  resolveLegacyPdfStorageRoot,
  resolveSchoolPdfStorageRoot,
} = require("./storage-paths");

test("resolveSchoolPdfStorageRoot stores PDFs under school storage folders by default", () => {
  const previousStorageDir = process.env.EXAMLIST_STORAGE_DIR;
  const previousPdfStorageDir = process.env.PDF_STORAGE_DIR;
  const root = path.resolve("examlist-root");

  delete process.env.EXAMLIST_STORAGE_DIR;
  delete process.env.PDF_STORAGE_DIR;

  try {
    assert.equal(
      resolveSchoolPdfStorageRoot(path, root, "1238"),
      path.join(root, "storage", "1238", "pdf-generations"),
    );
  } finally {
    if (typeof previousStorageDir === "undefined") {
      delete process.env.EXAMLIST_STORAGE_DIR;
    } else {
      process.env.EXAMLIST_STORAGE_DIR = previousStorageDir;
    }

    if (typeof previousPdfStorageDir === "undefined") {
      delete process.env.PDF_STORAGE_DIR;
    } else {
      process.env.PDF_STORAGE_DIR = previousPdfStorageDir;
    }
  }
});

test("resolveSchoolPdfStorageRoot ignores PDF_STORAGE_DIR for new school-scoped files", () => {
  const previousStorageDir = process.env.EXAMLIST_STORAGE_DIR;
  const previousPdfStorageDir = process.env.PDF_STORAGE_DIR;
  const root = path.resolve("examlist-root");

  process.env.EXAMLIST_STORAGE_DIR = "custom-storage";
  process.env.PDF_STORAGE_DIR = "legacy-pdf-root";

  try {
    assert.equal(
      resolveSchoolPdfStorageRoot(path, root, "1238"),
      path.join(root, "custom-storage", "1238", "pdf-generations"),
    );
    assert.equal(
      resolveLegacyPdfStorageRoot(path, root),
      path.join(root, "legacy-pdf-root"),
    );
  } finally {
    if (typeof previousStorageDir === "undefined") {
      delete process.env.EXAMLIST_STORAGE_DIR;
    } else {
      process.env.EXAMLIST_STORAGE_DIR = previousStorageDir;
    }

    if (typeof previousPdfStorageDir === "undefined") {
      delete process.env.PDF_STORAGE_DIR;
    } else {
      process.env.PDF_STORAGE_DIR = previousPdfStorageDir;
    }
  }
});
