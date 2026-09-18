const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { PDFDocument } = require("pdf-lib");
const { mergePdfFilesInWorker } = require("./merge-service");

test("merge worker preserves page order and recovers after an invalid source", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "examlist-merge-worker-"));
  try {
    const files = [];
    for (const width of [210, 110, 310]) {
      const document = await PDFDocument.create();
      document.addPage([width, 400]);
      const file = path.join(directory, `${width}.pdf`);
      await fs.writeFile(file, await document.save());
      files.push(file);
    }
    const failedPath = path.join(directory, "failed.pdf");
    await assert.rejects(mergePdfFilesInWorker([path.join(directory, "missing.pdf")], failedPath));
    await assert.rejects(fs.access(failedPath));
    const output = path.join(directory, "merged.pdf");
    const result = await mergePdfFilesInWorker(files, output);
    const document = await PDFDocument.load(await fs.readFile(output));
    assert.equal(result.pageCount, 3);
    assert.deepEqual(document.getPages().map(page => page.getWidth()), [210, 110, 310]);
  } finally {
    assert.ok(directory.startsWith(path.join(os.tmpdir(), "examlist-merge-worker-")));
    await fs.rm(directory, { recursive: true, force: true });
  }
});
