const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { resolveBrowserPath, getAvailablePort } = require("../../../scripts/smoke-utils");
const { createCdpClient, waitForDevtools, evaluate } = require("../../../scripts/smoke-browser-cdp");
const { getPreviewDataFitScript } = require("./data-fit-script");
const { getPreviewContentStyles } = require("./styles-content");

test("candidate data shrinks before wrapping and permits wrapping only at 5pt", { skip: !resolveBrowserPath() }, async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "examlist-data-fit-"));
  const port = await getAvailablePort();
  const browser = spawn(resolveBrowserPath(), ["--headless", "--disable-gpu", "--no-first-run",
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
  let client;
  try {
    client = await createCdpClient(await waitForDevtools(port));
    await client.send("Runtime.enable");
    const cases = [
      ["short", "홍길동", 12, "height:60pt;"],
      ["long", "아주긴모집단위이름입니다", 12, "height:60pt;"],
      ["minimum", "가".repeat(100), 12, "height:18pt;"],
      ["large", "가".repeat(100), 40, "height:18pt;"],
      ["auto", "아주긴모집단위이름입니다", 12, ""],
    ];
    const html = `<style>${getPreviewContentStyles()}</style>` + cases.map(([id, text, size, height]) =>
      `<div class="preview-candidate-block"><table style="width:100pt;table-layout:fixed;border-collapse:collapse"><tr><td style="${height}padding:2pt;font-size:${size}pt"><span id="${id}" class="template-data-fit">${text}</span></td></tr></table></div>`).join("");
    await evaluate(client, `document.body.innerHTML = ${JSON.stringify(html)}`);
    const script = getPreviewDataFitScript().replace(/^[\s\S]*?<script>/, "").replace(/<\/script>[\s\S]*$/, "");
    await evaluate(client, script);
    const results = await evaluate(client, `(() => {
      window.ExamListPreviewDataFit.fit();
      const read = () => Array.from(document.querySelectorAll('.template-data-fit')).map(element => {
        const range = document.createRange(); range.selectNodeContents(element);
        return { id: element.id, font: parseFloat(getComputedStyle(element).fontSize),
          lines: new Set(Array.from(range.getClientRects()).map(rect => rect.top)).size,
          height: element.closest('td').style.height,
          renderedHeight: element.closest('td').getBoundingClientRect().height };
      });
      const first = read(); window.ExamListPreviewDataFit.fit();
      return { first, second: read() };
    })()`);
    assert.deepEqual(results.first, results.second, "repeated fitting must be stable");
    const [short, long, minimum, large, auto] = results.first;
    assert.equal(short.font, 16);
    for (const item of [long, auto]) {
      assert.ok(item.font < 16 && item.font >= 5 * 96 / 72, JSON.stringify(item));
      assert.equal(item.lines, 1);
    }
    for (const item of [minimum, large]) {
      assert.ok(Math.abs(item.font - 5 * 96 / 72) < 0.01, JSON.stringify(item));
      assert.ok(item.lines > 1);
      assert.equal(item.height, "18pt", "wrapping must not persist an expanded cell height");
    }
    assert.equal(long.renderedHeight, short.renderedHeight);
    assert.equal(auto.height, "");
  } finally {
    client?.close();
    browser.kill();
    await new Promise(resolve => browser.exitCode !== null ? resolve() : browser.once("exit", resolve));
    await fs.rm(profile, { recursive: true, force: true }).catch(() => {});
  }
});
