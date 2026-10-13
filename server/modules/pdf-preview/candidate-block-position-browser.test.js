const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { resolveBrowserPath, getAvailablePort } = require("../../../scripts/smoke-utils");
const { createCdpClient, waitForDevtools, evaluate } = require("../../../scripts/smoke-browser-cdp");
const { renderPreviewDocument } = require("./renderer");
const { normalizeTemplateLayout } = require("../pdf-templates/layout");

test("positioned candidate tables stay inside their own grid slots", { skip: !resolveBrowserPath() }, async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "examlist-block-position-"));
  const port = await getAvailablePort();
  const browser = spawn(resolveBrowserPath(), ["--headless", "--disable-gpu", "--no-first-run",
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
  let client;
  try {
    client = await createCdpClient(await waitForDevtools(port));
    await client.send("Runtime.enable");
    const metadata = { name: "을지대학교 블록 위치 재현", paperPreset: "A4", orientation: "portrait", generationUnit: "room" };
    const layout = normalizeTemplateLayout({ pages: [{ type: "content", repeatable: true, settings: {
      editorMode: "document",
      documentHtml: '<div class="template-doc"><div data-candidate-block-grid="true"></div></div>',
      candidateBlockGrid: {
        enabled: true, variant: "photo", columns: 2, rows: 5, widthPt: 537, heightPt: 723,
        xPt: 0, yPt: 67.5, gapXPt: 2.5, gapYPt: 1, fillEmptyBlocks: true,
        blockTemplateHtml: '<table data-candidate-block-table="true" style="position:absolute;left:0;top:0;width:353px;height:189px;margin:0"><tr><td>{{candidate.name}}</td></tr></table>',
      },
    } }] }, metadata, "block-position-test");
    const { html } = renderPreviewDocument({ template: { ...metadata, layout },
      candidates: Array.from({ length: 10 }, (_, index) => ({ name: `수험생 ${index + 1}`, roomName: "101호" })),
    });
    await evaluate(client, `document.open(); document.write(${JSON.stringify(html)}); document.close();`);
    for (const media of ["screen", "print"]) {
      await client.send("Emulation.setEmulatedMedia", { media });
      const blocks = await evaluate(client, `(async () => {
        await document.fonts.ready;
        window.ExamListPreviewDataFit.fit();
        const rect = element => { const r = element.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; };
        return Array.from(document.querySelectorAll('.preview-candidate-block')).map(block => ({ block: rect(block), table: rect(block.querySelector('table')) }));
      })()`);
      assert.equal(blocks.length, 10);
      for (const { block, table } of blocks) {
        assert.ok(Math.abs(block.left - table.left) < 1, JSON.stringify({ media, block, table }));
        assert.ok(Math.abs(block.top - table.top) < 1, JSON.stringify({ media, block, table }));
      }
      for (let index = 0; index < blocks.length; index += 1) {
        for (const other of blocks.slice(index + 1)) {
          const table = blocks[index].table;
          assert.ok(table.right <= other.table.left || other.table.right <= table.left ||
            table.bottom <= other.table.top || other.table.bottom <= table.top, JSON.stringify({ media, table, other }));
        }
      }
    }
    assert.deepEqual(client.getPageErrors(), []);
  } finally {
    client?.close();
    browser.kill();
    await new Promise(resolve => browser.exitCode !== null ? resolve() : browser.once("exit", resolve));
    await fs.rm(profile, { recursive: true, force: true }).catch(() => {});
  }
});
