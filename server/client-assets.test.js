const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const vm = require("node:vm");
const { buildClientAssets } = require("./client-assets");

test("client build emits versioned assets and excludes lazy editor code from initial imports", async () => {
  const root = path.resolve(__dirname, "..");
  const result = await buildClientAssets(root);
  for (const url of Object.values(result.urls)) {
    assert.match(url, /^\/assets\/.+-[a-zA-Z0-9]+\.(js|css|png)$/);
    await fs.access(path.join(result.outdir, path.basename(url)));
  }
  assert.doesNotMatch(result.pages.app, /src="\/client\/core.js"|href="\/styles\//);
  assert.ok(result.pages.app.includes(result.urls.app));
  const context = {};
  vm.runInNewContext(await fs.readFile(path.join(result.outdir, path.basename(result.urls.config)), "utf8"), context);
  assert.equal(typeof context.ExamListAppConfig.getRouteMatch, "function");
  const outputs = result.metafile.outputs;
  const visited = new Set();
  const inputs = new Set();
  function visit(file) {
    if (visited.has(file)) return;
    visited.add(file);
    const output = outputs[file];
    assert.ok(output, file);
    Object.keys(output.inputs).forEach(input => inputs.add(input));
    output.imports.filter(item => item.kind !== "dynamic-import" && !item.external).forEach(item => visit(item.path));
  }
  visit(Object.keys(outputs).find(file => outputs[file].entryPoint === "client/core.js"));
  assert.ok(!inputs.has("client/features/template-editor/actions.js"));
  assert.ok(!inputs.has("client/features/template-editor/renderers.js"));
  assert.ok(!inputs.has("client/features/candidates/actions.js"));
  assert.ok(!inputs.has("client/features/accounts/actions.js"));
  assert.equal(result.runtimeScriptCount, require("../client/template-editor-runtime/client/template-editor-runtime/manifest").requiredScripts.length);
});
