const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { ensureDependencies } = require("./ensure-dependencies");

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "examlist-dependencies-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "package.json"), '{"dependencies":{}}');
  fs.writeFileSync(path.join(root, "package-lock.json"), '{"lockfileVersion":3}');
  return root;
}

test("installs initially and after manifest changes, but skips unchanged restarts", t => {
  const root = fixture(t);
  let installs = 0;
  const options = {
    install() { installs++; fs.mkdirSync(path.join(root, "node_modules"), { recursive: true }); },
    verify() {}
  };
  assert.equal(ensureDependencies(root, options), true);
  assert.equal(ensureDependencies(root, options), false);
  assert.equal(installs, 1);
  fs.appendFileSync(path.join(root, "package-lock.json"), "\n");
  assert.equal(ensureDependencies(root, options), true);
  fs.writeFileSync(path.join(root, "package.json"), '{"dependencies":{"esbuild":"0.28.2"}}');
  assert.equal(ensureDependencies(root, options), true);
  assert.equal(installs, 3);
});

test("repairs missing packages or native binary despite an unchanged manifest", t => {
  const root = fixture(t);
  let ready = false;
  let installs = 0;
  const options = {
    install() { installs++; ready = true; fs.mkdirSync(path.join(root, "node_modules"), { recursive: true }); },
    verify() { if (!ready) throw new Error("Binary missing"); }
  };
  ensureDependencies(root, options);
  ready = false;
  assert.equal(ensureDependencies(root, options), true);
  assert.equal(installs, 2);
});

test("failed installation or verification never records success and can be retried", t => {
  const root = fixture(t);
  const stamp = path.join(root, "node_modules", ".examlist-dependencies");
  const options = {
    install() { fs.mkdirSync(path.join(root, "node_modules"), { recursive: true }); },
    verify() {}
  };
  ensureDependencies(root, options);
  fs.appendFileSync(path.join(root, "package-lock.json"), "\n");
  assert.throws(() => ensureDependencies(root, {
    ...options, install() { throw new Error("Network unavailable"); }
  }), /Network unavailable/);
  assert.equal(fs.existsSync(stamp), false);
  assert.throws(() => ensureDependencies(root, {
    ...options, verify() { throw new Error("Binary missing"); }
  }), /Binary missing/);
  assert.equal(fs.existsSync(stamp), false);
  assert.equal(ensureDependencies(root, options), true);
  assert.equal(ensureDependencies(root, options), false);
});

test("Windows launcher starts only after dependency setup succeeds", { skip: process.platform !== "win32" }, t => {
  const root = fixture(t);
  fs.copyFileSync(path.join(__dirname, "..", "start-server.bat"), path.join(root, "start-server.bat"));
  fs.writeFileSync(path.join(root, ".env"), "");
  fs.mkdirSync(path.join(root, "scripts"));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ scripts: { start: "node server.js" } }));
  fs.writeFileSync(path.join(root, "server.js"), 'require("node:fs").writeFileSync("started", "yes");');
  const helper = path.join(root, "scripts", "ensure-dependencies.js");
  const run = () => spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/c", "start-server.bat"], {
    cwd: root, input: "\r\n", encoding: "utf8", timeout: 30000, windowsHide: true
  });
  fs.writeFileSync(helper, 'console.error("Simulated install failure"); process.exitCode = 1;');
  const failed = run();
  assert.equal(failed.status, 1, failed.stdout + failed.stderr);
  assert.equal(fs.existsSync(path.join(root, "started")), false);
  assert.match(fs.readFileSync(path.join(root, "log", "dependencies.log"), "utf8"), /Simulated install failure/);
  fs.writeFileSync(helper, 'console.log("Dependencies ready");');
  const succeeded = run();
  assert.equal(succeeded.status, 0, succeeded.stdout + succeeded.stderr);
  assert.equal(fs.existsSync(path.join(root, "started")), true);
});
