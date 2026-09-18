const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { EventEmitter } = require("node:events");
const { renderHtmlToPdf } = require("./browser-renderer");

function fixture(t, onSpawn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "examlist-pdf-render-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const browser = new EventEmitter();
  browser.stderr = new EventEmitter();
  browser.kill = () => { browser.killed = true; };
  const options = {
    browserExecutable: "test-browser",
    browserProfileDir: path.join(root, "profile"),
    htmlFilePath: path.join(root, "document.html"),
    pdfFilePath: path.join(root, "document.pdf"),
    timeoutMs: 2000,
    pollIntervalMs: 10,
    spawnBrowser: () => { setImmediate(() => onSpawn(browser, options)); return browser; },
  };
  return { browser, options };
}

test("waits for the PDF after the Windows browser launcher exits successfully", async t => {
  let finished = false;
  const { options } = fixture(t, async (browser, options) => {
    browser.emit("close", 0);
    await new Promise(resolve => setTimeout(resolve, 40));
    assert.equal(finished, false);
    fs.writeFileSync(options.pdfFilePath, "%PDF-1.7\npartial output");
    await new Promise(resolve => setTimeout(resolve, 40));
    assert.equal(finished, false);
    fs.appendFileSync(options.pdfFilePath, "\n%%EOF\n");
  });
  await renderHtmlToPdf(options);
  finished = true;
  assert.match(fs.readFileSync(options.pdfFilePath, "utf8"), /%%EOF/);
});

test("never accepts a stale PDF and times out even if the launcher already exited", async t => {
  const { browser, options } = fixture(t, browser => browser.emit("close", 0));
  fs.writeFileSync(options.pdfFilePath, "%PDF-1.7\nold result\n%%EOF\n");
  await assert.rejects(renderHtmlToPdf({ ...options, timeoutMs: 80 }), /시간이 초과/);
  assert.equal(fs.existsSync(options.pdfFilePath), false);
  assert.equal(browser.killed, true);
});

test("a running browser that never closes cannot leave a job pending forever", async t => {
  const { options } = fixture(t, () => {});
  await assert.rejects(renderHtmlToPdf({ ...options, timeoutMs: 50 }), /시간이 초과/);
});

test("cancellation still works after a successful launcher exit", async t => {
  const { options } = fixture(t, browser => browser.emit("close", 0));
  await assert.rejects(renderHtmlToPdf({ ...options, shouldCancel: async () => true }),
    error => error.errorCode === "PDF_GENERATION_CANCELLED");
});

test("reports browser launch and nonzero exit errors", async t => {
  for (const failure of ["spawn", "exit"]) {
    const { options } = fixture(t, browser => {
      if (failure === "spawn") browser.emit("error", new Error("Cannot start browser"));
      else { browser.stderr.emit("data", Buffer.from("Printing failed")); browser.emit("close", 1); }
    });
    await assert.rejects(renderHtmlToPdf(options), failure === "spawn" ? /Cannot start/ : /Printing failed/);
  }
});
